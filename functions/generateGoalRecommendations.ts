import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { goal_id } = await req.json();

    const goal = await base44.entities.FinancialGoal.get(goal_id);
    if (!goal) {
      return Response.json({ error: 'Goal not found' }, { status: 404 });
    }

    const transactions = await base44.entities.Transaction.filter({ 
      entity_id: goal.entity_id 
    });
    
    const budgets = await base44.entities.Budget.filter({ entity_id: goal.entity_id });
    const debts = await base44.entities.Debt.filter({ entity_id: goal.entity_id });

    const monthsRemaining = Math.ceil(
      (new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24 * 30)
    );
    const amountRemaining = goal.target_amount - goal.current_amount;
    const requiredMonthly = amountRemaining / monthsRemaining;

    const recentExpenses = transactions
      .filter(t => t.type === 'expense')
      .slice(0, 100);

    const prompt = `Generate personalized recommendations to help achieve this financial goal faster.

Goal Details:
- Name: ${goal.name}
- Type: ${goal.goal_type}
- Target: $${goal.target_amount}
- Current: $${goal.current_amount}
- Remaining: $${amountRemaining}
- Deadline: ${goal.deadline}
- Months Remaining: ${monthsRemaining}
- Required Monthly: $${requiredMonthly}
- Current Monthly Contribution: $${goal.monthly_contribution || 0}

Recent Spending Patterns:
${JSON.stringify(recentExpenses.slice(0, 30).map(t => ({
  description: t.description,
  amount: t.amount,
  category_id: t.category_id
})), null, 2)}

Total Debt: $${debts.reduce((sum, d) => sum + d.current_balance, 0)}

Provide 5-7 specific, actionable recommendations including:
1. Spending adjustments to free up money
2. Income optimization strategies
3. Debt management if applicable
4. Investment suggestions based on timeline
5. Milestone checkpoints
6. Alternative strategies if deadline seems unrealistic

Each recommendation should be concrete and measurable.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      response_json_schema: {
        type: "object",
        properties: {
          recommendations: {
            type: "array",
            items: { type: "string" }
          },
          feasibility_assessment: { type: "string" },
          suggested_monthly_contribution: { type: "number" }
        }
      }
    });

    await base44.entities.FinancialGoal.update(goal_id, {
      ai_recommendations: response.recommendations || []
    });

    return Response.json({
      recommendations: response.recommendations || [],
      feasibility: response.feasibility_assessment,
      suggested_monthly: response.suggested_monthly_contribution
    });

  } catch (error) {
    console.error('Error generating goal recommendations:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});