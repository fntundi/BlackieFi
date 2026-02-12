import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entity_id, forecast_months = 3 } = await req.json();

    // Fetch historical transactions (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const allTransactions = await base44.entities.Transaction.filter(
      { entity_id },
      '-date',
      500
    );
    const historicalTransactions = allTransactions.filter(t => 
      new Date(t.date) >= sixMonthsAgo
    );

    // Fetch recurring transactions
    const recurringTransactions = await base44.entities.RecurringTransaction.filter({
      entity_id,
      is_active: true
    });

    // Fetch current budget
    const currentMonth = new Date().toISOString().slice(0, 7);
    const budgets = await base44.entities.Budget.filter({
      entity_id,
      month: currentMonth
    });
    const currentBudget = budgets[0];

    // Fetch categories
    const categories = await base44.entities.Category.filter({ entity_id });

    // Analyze spending patterns by month
    const monthlyData = {};
    historicalTransactions.forEach(t => {
      const month = t.date.slice(0, 7);
      if (!monthlyData[month]) {
        monthlyData[month] = { income: 0, expenses: 0, byCategory: {} };
      }
      
      if (t.type === 'income') {
        monthlyData[month].income += t.amount;
      } else if (t.type === 'expense') {
        monthlyData[month].expenses += t.amount;
        const catId = t.category_id || 'uncategorized';
        monthlyData[month].byCategory[catId] = (monthlyData[month].byCategory[catId] || 0) + t.amount;
      }
    });

    // Calculate recurring income/expenses
    const recurringIncome = recurringTransactions
      .filter(rt => rt.type === 'income')
      .reduce((sum, rt) => sum + (rt.amount || 0), 0);
    
    const recurringExpenses = recurringTransactions
      .filter(rt => rt.type === 'expense')
      .reduce((sum, rt) => sum + (rt.amount || 0), 0);

    // Prepare data for AI analysis
    const monthlyAverages = Object.values(monthlyData).reduce((acc, month) => {
      acc.avgIncome = (acc.avgIncome || 0) + month.income / Object.keys(monthlyData).length;
      acc.avgExpenses = (acc.avgExpenses || 0) + month.expenses / Object.keys(monthlyData).length;
      return acc;
    }, {});

    const categorySpending = {};
    Object.values(monthlyData).forEach(month => {
      Object.entries(month.byCategory).forEach(([catId, amount]) => {
        categorySpending[catId] = (categorySpending[catId] || 0) + amount;
      });
    });

    // Use AI to forecast and analyze
    const forecastPrompt = `You are a financial forecasting expert. Analyze the following data and provide detailed budget forecasts and recommendations.

Historical Data (Last 6 months):
${Object.entries(monthlyData).map(([month, data]) => 
  `${month}: Income: $${data.income.toFixed(2)}, Expenses: $${data.expenses.toFixed(2)}, Net: $${(data.income - data.expenses).toFixed(2)}`
).join('\n')}

Recurring Transactions:
- Monthly Recurring Income: $${recurringIncome.toFixed(2)}
- Monthly Recurring Expenses: $${recurringExpenses.toFixed(2)}

Average Monthly:
- Income: $${monthlyAverages.avgIncome.toFixed(2)}
- Expenses: $${monthlyAverages.avgExpenses.toFixed(2)}
- Net: $${(monthlyAverages.avgIncome - monthlyAverages.avgExpenses).toFixed(2)}

Current Budget:
${currentBudget ? `Total Planned: $${currentBudget.total_planned}` : 'No budget set'}

Tasks:
1. Forecast the next ${forecast_months} months' income, expenses, and ending balance
2. Identify potential shortfalls or surpluses
3. Analyze spending trends and patterns
4. Provide personalized budget adjustment recommendations
5. Suggest specific actions to improve financial health

Consider seasonality, trends, and recurring payments in your forecast.`;

    const forecast = await base44.integrations.Core.InvokeLLM({
      prompt: forecastPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          monthly_forecasts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                month: { type: "string" },
                forecasted_income: { type: "number" },
                forecasted_expenses: { type: "number" },
                ending_balance: { type: "number" },
                confidence: { type: "string", enum: ["high", "medium", "low"] }
              }
            }
          },
          insights: {
            type: "object",
            properties: {
              spending_trend: { type: "string", enum: ["increasing", "stable", "decreasing"] },
              income_stability: { type: "string", enum: ["stable", "variable", "uncertain"] },
              risk_level: { type: "string", enum: ["low", "medium", "high"] },
              potential_shortfalls: {
                type: "array",
                items: { type: "string" }
              },
              potential_surpluses: {
                type: "array",
                items: { type: "string" }
              }
            }
          },
          recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                category: { type: "string" },
                current_avg: { type: "number" },
                suggested_budget: { type: "number" },
                reason: { type: "string" },
                priority: { type: "string", enum: ["high", "medium", "low"] }
              }
            }
          },
          action_items: {
            type: "array",
            items: { type: "string" }
          },
          overall_health_score: { 
            type: "number",
            description: "1-100 score of financial health"
          }
        },
        required: ["monthly_forecasts", "insights", "recommendations", "action_items"]
      }
    });

    return Response.json({
      success: true,
      forecast,
      historical_summary: {
        months_analyzed: Object.keys(monthlyData).length,
        average_income: monthlyAverages.avgIncome,
        average_expenses: monthlyAverages.avgExpenses,
        recurring_income: recurringIncome,
        recurring_expenses: recurringExpenses
      }
    });

  } catch (error) {
    console.error('Budget forecast error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});