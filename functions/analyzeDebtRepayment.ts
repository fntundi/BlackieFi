import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { debts, monthly_extra_payment = 0 } = await req.json();

    if (!debts || debts.length === 0) {
      return Response.json({ error: 'No debts provided' }, { status: 400 });
    }

    const prompt = `Analyze these debts and provide optimal repayment strategies:

Debts:
${debts.map((d, i) => `${i + 1}. ${d.name} (${d.type})
   - Balance: $${d.current_balance.toFixed(2)}
   - Interest Rate: ${d.interest_rate}%
   - Minimum Payment: $${d.minimum_payment.toFixed(2)}`).join('\n\n')}

Monthly Extra Payment Available: $${monthly_extra_payment}

Provide comprehensive analysis including:
1. Recommended strategy (snowball vs avalanche vs hybrid) with clear reasoning
2. Detailed payoff timeline for each debt under the recommended strategy
3. Comparison of total interest paid under different strategies
4. Monthly payment breakdown showing how to allocate the extra payment
5. Motivational milestones and progress tracking suggestions
6. Total time to debt freedom

Be specific with calculations and provide actionable recommendations.`;

    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          recommended_strategy: {
            type: "object",
            properties: {
              name: { type: "string" },
              reasoning: { type: "string" },
              total_interest_saved: { type: "number" },
              months_to_freedom: { type: "number" }
            }
          },
          payment_plan: {
            type: "array",
            items: {
              type: "object",
              properties: {
                debt_name: { type: "string" },
                priority_order: { type: "number" },
                monthly_payment: { type: "number" },
                payoff_date: { type: "string" },
                total_interest: { type: "number" }
              }
            }
          },
          strategy_comparison: {
            type: "object",
            properties: {
              snowball: {
                type: "object",
                properties: {
                  total_interest: { type: "number" },
                  months_to_freedom: { type: "number" }
                }
              },
              avalanche: {
                type: "object",
                properties: {
                  total_interest: { type: "number" },
                  months_to_freedom: { type: "number" }
                }
              }
            }
          },
          milestones: {
            type: "array",
            items: {
              type: "object",
              properties: {
                month: { type: "number" },
                event: { type: "string" },
                remaining_debt: { type: "number" }
              }
            }
          },
          key_insights: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    return Response.json(analysis);
  } catch (error) {
    console.error('Error analyzing debt repayment:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});