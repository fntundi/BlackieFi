import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entity_id, months_to_analyze = 6 } = await req.json();

    const transactions = await base44.entities.Transaction.filter({ entity_id });
    const categories = await base44.entities.Category.list();

    if (transactions.length < 20) {
      return Response.json({
        anomalies: [],
        message: 'Insufficient data for anomaly detection'
      });
    }

    const prompt = `Analyze these financial transactions for anomalies and unusual spending patterns.

Transaction Summary:
${JSON.stringify(transactions.slice(0, 100).map(t => ({
  date: t.date,
  amount: t.amount,
  description: t.description,
  type: t.type,
  category: categories.find(c => c.id === t.category_id)?.name
})), null, 2)}

Identify:
1. Unusual spikes in spending (amounts significantly higher than average)
2. Recurring charges that suddenly stopped or changed
3. New vendors or categories appearing
4. Duplicate transactions
5. Out-of-pattern spending timing

For each anomaly, provide:
- severity (low, medium, high)
- category affected
- description of the anomaly
- potential_impact (estimated financial impact)
- recommendation (what action to take)`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      response_json_schema: {
        type: "object",
        properties: {
          anomalies: {
            type: "array",
            items: {
              type: "object",
              properties: {
                severity: { type: "string" },
                category: { type: "string" },
                description: { type: "string" },
                potential_impact: { type: "number" },
                recommendation: { type: "string" }
              }
            }
          }
        }
      }
    });

    return Response.json({
      anomalies: response.anomalies || [],
      analyzed_transactions: transactions.length
    });

  } catch (error) {
    console.error('Error detecting anomalies:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});