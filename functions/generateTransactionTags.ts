import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { transaction_id } = await req.json();

    const transaction = await base44.entities.Transaction.get(transaction_id);
    if (!transaction) {
      return Response.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const category = transaction.category_id ? 
      await base44.entities.Category.get(transaction.category_id) : null;

    const prompt = `Analyze this financial transaction and generate 3-5 relevant tags for advanced filtering and analysis.

Transaction Details:
- Description: ${transaction.description}
- Amount: $${transaction.amount}
- Type: ${transaction.type}
- Category: ${category?.name || 'Uncategorized'}
- Date: ${transaction.date}
${transaction.notes ? `- Notes: ${transaction.notes}` : ''}

Generate specific, actionable tags that would help with:
1. Expense tracking (e.g., "tax-deductible", "recurring", "one-time")
2. Financial planning (e.g., "essential", "discretionary", "investment")
3. Analysis (e.g., "seasonal", "business-critical", "cost-saving")
4. Vendor/merchant patterns (e.g., "subscription", "utility", "professional-service")

Return ONLY a JSON array of 3-5 tag strings, nothing else.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      response_json_schema: {
        type: "object",
        properties: {
          tags: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    const tags = response.tags || [];

    await base44.entities.Transaction.update(transaction_id, {
      ai_tags: tags
    });

    return Response.json({
      success: true,
      tags: tags
    });

  } catch (error) {
    console.error('Error generating tags:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});