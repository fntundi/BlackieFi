import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entity_id, month } = await req.json();

    // Fetch last 3 months of transactions
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const startDate = threeMonthsAgo.toISOString().split('T')[0];

    const transactions = await base44.entities.Transaction.filter(
      { entity_id, type: 'expense' },
      '-date',
      500
    );

    const recentTransactions = transactions.filter(t => t.date >= startDate);

    // Fetch categories
    const categories = await base44.entities.Category.filter({
      entity_id: [entity_id, null]
    });

    // Group transactions by category
    const categorySpending = {};
    recentTransactions.forEach(t => {
      if (t.category_id) {
        if (!categorySpending[t.category_id]) {
          categorySpending[t.category_id] = [];
        }
        categorySpending[t.category_id].push(t.amount);
      }
    });

    // Calculate averages and prepare data for AI
    const spendingSummary = Object.entries(categorySpending).map(([catId, amounts]) => {
      const category = categories.find(c => c.id === catId);
      const total = amounts.reduce((sum, amt) => sum + amt, 0);
      const avg = total / 3; // 3 months average
      return {
        category_name: category?.name || 'Uncategorized',
        category_id: catId,
        average_monthly: avg,
        min: Math.min(...amounts),
        max: Math.max(...amounts),
        transactions_count: amounts.length
      };
    }).sort((a, b) => b.average_monthly - a.average_monthly);

    const totalMonthlySpending = spendingSummary.reduce((sum, cat) => sum + cat.average_monthly, 0);

    // Use AI to suggest budget amounts
    const prompt = `You are a financial advisor creating a monthly budget based on historical spending patterns.

Historical Spending Data (last 3 months average):
${spendingSummary.map(s => `- ${s.category_name}: $${s.average_monthly.toFixed(2)}/month (${s.transactions_count} transactions, range: $${s.min.toFixed(2)} - $${s.max.toFixed(2)})`).join('\n')}

Total Average Monthly Spending: $${totalMonthlySpending.toFixed(2)}

Create a realistic monthly budget for ${month}. Consider:
- Seasonal variations
- Essential vs discretionary spending
- Recommend slight reductions where possible (5-10% savings opportunity)
- Prioritize essential categories (housing, utilities, groceries, healthcare)
- Suggest reasonable limits for discretionary spending

For each category, provide:
- Recommended budget amount
- Brief reasoning (one sentence)
- Priority level (essential, important, discretionary)`;

    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          category_budgets: {
            type: "array",
            items: {
              type: "object",
              properties: {
                category_id: { type: "string" },
                planned_amount: { type: "number" },
                reasoning: { type: "string" },
                priority: { type: "string", enum: ["essential", "important", "discretionary"] }
              },
              required: ["category_id", "planned_amount", "reasoning", "priority"]
            }
          },
          total_recommended: { type: "number" },
          savings_opportunity: { type: "number" },
          recommendations: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: ["category_budgets", "total_recommended"]
      }
    });

    return Response.json({
      success: true,
      budget_suggestions: aiResponse,
      historical_data: spendingSummary
    });

  } catch (error) {
    console.error('Budget generation error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});