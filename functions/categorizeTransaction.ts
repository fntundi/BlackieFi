import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { transaction_id, entity_id } = await req.json();

    // Fetch the transaction
    const transaction = await base44.entities.Transaction.get(transaction_id);
    
    if (!transaction) {
      return Response.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Fetch all categories for this entity
    const categories = await base44.entities.Category.filter({ 
      entity_id: [entity_id, null]
    });

    // Fetch learning data from user corrections
    const learningData = await base44.asServiceRole.entities.CategorizationLearning.filter(
      { entity_id: entity_id },
      '-correction_count',
      50
    );

    // Fetch recent transactions from the same entity to learn patterns
    const recentTransactions = await base44.entities.Transaction.filter(
      { entity_id: entity_id },
      '-created_date',
      100
    );

    // Filter transactions that have categories assigned
    const categorizedTransactions = recentTransactions.filter(t => t.category_id);

    // Build learning examples prioritizing user corrections
    const correctionExamples = learningData
      .filter(l => l.was_correction)
      .slice(0, 10)
      .map(l => {
        const cat = categories.find(c => c.id === l.actual_category_id);
        return `Description: "${l.transaction_description}", Amount: $${l.transaction_amount}, User CORRECTED to: ${cat?.name || 'Unknown'} (corrected ${l.correction_count} times)`;
      });

    const transactionExamples = categorizedTransactions.slice(0, 15).map(t => {
      const cat = categories.find(c => c.id === t.category_id);
      return `Description: "${t.description}", Amount: $${t.amount}, Category: ${cat?.name || 'Unknown'}`;
    });

    const learningExamples = [...correctionExamples, ...transactionExamples].join('\n');

    // Build category options
    const categoryOptions = categories.map(c => ({
      id: c.id,
      name: c.name,
      type: c.type,
      keywords: c.auto_categorization_rules || []
    }));

    // Use AI to suggest a category with learning context
    const prompt = `You are an intelligent financial categorization assistant that learns from user behavior. Analyze the transaction and suggest the most appropriate category.

Transaction to categorize:
- Description: "${transaction.description}"
- Amount: $${transaction.amount}
- Type: ${transaction.type}

Available categories:
${categoryOptions.map(c => `- ${c.name} (${c.type}${c.keywords.length > 0 ? ', keywords: ' + c.keywords.join(', ') : ''})`).join('\n')}

${learningExamples.length > 0 ? `\nLearning from user's past categorizations (PRIORITIZE corrections with high counts):\n${learningExamples}` : ''}

IMPORTANT: Pay close attention to transactions marked as "User CORRECTED" - these show the user's preferred categorization for similar descriptions. If the current transaction is similar to a corrected pattern, strongly favor that category.

Analyze transaction description patterns, keywords, and user correction history to make the most accurate suggestion.

Return the category ID and explain your reasoning, especially if using a learned pattern.`;

    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          category_id: { type: "string" },
          category_name: { type: "string" },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
          reason: { type: "string" }
        },
        required: ["category_id", "category_name", "confidence", "reason"]
      }
    });

    // Validate that the suggested category exists
    const suggestedCategory = categories.find(c => c.id === aiResponse.category_id);
    
    if (!suggestedCategory) {
      return Response.json({ 
        error: 'AI suggested invalid category',
        suggestion: aiResponse 
      }, { status: 400 });
    }

    return Response.json({
      success: true,
      suggestion: {
        category_id: aiResponse.category_id,
        category_name: aiResponse.category_name,
        confidence: aiResponse.confidence,
        reason: aiResponse.reason
      }
    });

  } catch (error) {
    console.error('Categorization error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});