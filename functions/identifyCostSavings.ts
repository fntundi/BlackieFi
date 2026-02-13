import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entity_id } = await req.json();

    const transactions = await base44.entities.Transaction.filter({ 
      entity_id,
      type: 'expense'
    });
    const categories = await base44.entities.Category.list();
    const recurringTransactions = await base44.entities.RecurringTransaction.filter({ 
      entity_id, 
      is_active: true 
    });

    const categorySpending = {};
    transactions.forEach(t => {
      const cat = categories.find(c => c.id === t.category_id);
      const catName = cat?.name || 'Uncategorized';
      categorySpending[catName] = (categorySpending[catName] || 0) + t.amount;
    });

    const prompt = `Analyze these spending patterns and identify cost-saving opportunities.

Category Spending (Last 6 months):
${JSON.stringify(categorySpending, null, 2)}

Recurring Expenses:
${JSON.stringify(recurringTransactions.map(rt => ({
  name: rt.name,
  amount: rt.amount,
  frequency: rt.frequency
})), null, 2)}

Recent Transactions Sample:
${JSON.stringify(transactions.slice(0, 50).map(t => ({
  description: t.description,
  amount: t.amount,
  date: t.date,
  category: categories.find(c => c.id === t.category_id)?.name
})), null, 2)}

Identify specific opportunities to save money including:
- Subscriptions that could be cancelled or downgraded
- Categories with higher than typical spending
- Duplicate or redundant services
- Potential negotiation opportunities
- One-time purchases that could be deferred

For each opportunity, provide:
- Category
- Opportunity description
- Estimated monthly savings
- Difficulty to implement (easy, moderate, hard)
- Action steps`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      response_json_schema: {
        type: "object",
        properties: {
          opportunities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                category: { type: "string" },
                description: { type: "string" },
                estimated_monthly_savings: { type: "number" },
                difficulty: { type: "string" },
                action_steps: {
                  type: "array",
                  items: { type: "string" }
                }
              }
            }
          },
          total_potential_savings: { type: "number" }
        }
      }
    });

    return Response.json(response);

  } catch (error) {
    console.error('Error identifying cost savings:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});