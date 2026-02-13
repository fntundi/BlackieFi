import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entity_id, forecast_months = 3 } = await req.json();

    const transactions = await base44.entities.Transaction.filter({ entity_id });
    const recurringTransactions = await base44.entities.RecurringTransaction.filter({ 
      entity_id, 
      is_active: true 
    });

    const monthlyData = {};
    transactions.forEach(t => {
      const month = t.date.substring(0, 7);
      if (!monthlyData[month]) {
        monthlyData[month] = { income: 0, expenses: 0 };
      }
      if (t.type === 'income') {
        monthlyData[month].income += t.amount;
      } else if (t.type === 'expense') {
        monthlyData[month].expenses += t.amount;
      }
    });

    const prompt = `Based on this financial history, forecast cash flow for the next ${forecast_months} months.

Historical Monthly Data:
${JSON.stringify(monthlyData, null, 2)}

Recurring Transactions:
${JSON.stringify(recurringTransactions.map(rt => ({
  type: rt.type,
  amount: rt.amount,
  frequency: rt.frequency,
  name: rt.name
})), null, 2)}

Provide a forecast for each of the next ${forecast_months} months including:
- Predicted income
- Predicted expenses
- Net cash flow
- Confidence level (low, medium, high)
- Key assumptions made
- Potential risks`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      response_json_schema: {
        type: "object",
        properties: {
          forecast: {
            type: "array",
            items: {
              type: "object",
              properties: {
                month: { type: "string" },
                predicted_income: { type: "number" },
                predicted_expenses: { type: "number" },
                net_cash_flow: { type: "number" },
                confidence: { type: "string" }
              }
            }
          },
          assumptions: {
            type: "array",
            items: { type: "string" }
          },
          risks: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    return Response.json(response);

  } catch (error) {
    console.error('Error forecasting cash flow:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});