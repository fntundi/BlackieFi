import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entity_id } = await req.json();

    // Fetch financial profile
    const profiles = await base44.entities.FinancialProfile.filter({ entity_id });
    const profile = profiles[0];

    if (!profile) {
      return Response.json({ 
        error: 'No financial profile found. Please set up your profile first.' 
      }, { status: 400 });
    }

    // Fetch current portfolio
    const vehicles = await base44.entities.InvestmentVehicle.filter({ entity_id, is_active: true });
    const allHoldings = await base44.entities.InvestmentHolding.list();
    const holdings = allHoldings.filter(h => vehicles.map(v => v.id).includes(h.vehicle_id));

    let currentPortfolioValue = 0;
    const currentAllocation = {};
    
    holdings.forEach(h => {
      const value = (h.current_price || 0) * h.quantity;
      currentPortfolioValue += value;
      currentAllocation[h.asset_class] = (currentAllocation[h.asset_class] || 0) + value;
    });

    // Get current market conditions
    const marketAnalysis = await base44.integrations.Core.InvokeLLM({
      prompt: `Provide current market conditions analysis including:
      - Overall market sentiment (bull/bear/neutral)
      - Interest rate environment
      - Inflation outlook
      - Major sector trends
      - Risk factors to consider
      
      Keep it concise and actionable for investment strategy.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          market_sentiment: { type: "string", enum: ["bullish", "neutral", "bearish"] },
          interest_rate_trend: { type: "string", enum: ["rising", "stable", "falling"] },
          inflation_outlook: { type: "string", enum: ["high", "moderate", "low"] },
          sector_opportunities: {
            type: "array",
            items: { type: "string" }
          },
          risk_factors: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    // Generate personalized investment strategy
    const strategyPrompt = `You are an expert financial advisor creating a personalized investment strategy.

Client Profile:
- Risk Tolerance: ${profile.risk_tolerance}
- Investment Experience: ${profile.investment_experience}
- Age: ${profile.age || 'Not provided'}
- Time Horizon: ${profile.time_horizon} years
- Liquidity Needs: ${profile.liquidity_needs}
- Annual Income: $${profile.annual_income || 'Not provided'}

Financial Goals:
${profile.financial_goals?.map(g => `- ${g.goal}: $${g.target_amount} in ${g.timeline_years} years`).join('\n') || 'No specific goals set'}

Current Portfolio:
- Total Value: $${currentPortfolioValue.toFixed(2)}
- Current Allocation: ${Object.entries(currentAllocation).map(([asset, value]) => 
  `${asset}: ${((value/currentPortfolioValue)*100).toFixed(1)}%`).join(', ') || 'No holdings'}

Current Market Conditions:
- Market Sentiment: ${marketAnalysis.market_sentiment}
- Interest Rates: ${marketAnalysis.interest_rate_trend}
- Inflation: ${marketAnalysis.inflation_outlook}
- Sector Opportunities: ${marketAnalysis.sector_opportunities?.join(', ')}
- Risk Factors: ${marketAnalysis.risk_factors?.join(', ')}

Create a comprehensive investment strategy that includes:
1. Overall strategy name and philosophy
2. Recommended asset allocation percentages
3. Specific investment vehicles for each asset class
4. Rationale for each recommendation
5. Risk management approach
6. Action steps to implement

Consider the client's risk tolerance, goals, time horizon, and current market conditions.`;

    const strategy = await base44.integrations.Core.InvokeLLM({
      prompt: strategyPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          strategy_name: { type: "string" },
          strategy_philosophy: { type: "string" },
          recommended_allocation: {
            type: "array",
            items: {
              type: "object",
              properties: {
                asset_class: { type: "string" },
                target_percentage: { type: "number" },
                rationale: { type: "string" }
              }
            }
          },
          investment_vehicles: {
            type: "array",
            items: {
              type: "object",
              properties: {
                asset_class: { type: "string" },
                vehicle_type: { type: "string" },
                specific_examples: {
                  type: "array",
                  items: { type: "string" }
                },
                rationale: { type: "string" }
              }
            }
          },
          risk_management: {
            type: "object",
            properties: {
              approach: { type: "string" },
              diversification_strategy: { type: "string" },
              rebalancing_frequency: { type: "string" }
            }
          },
          action_steps: {
            type: "array",
            items: { type: "string" }
          },
          expected_return_range: { type: "string" },
          suitability_score: { type: "number", description: "1-10 how well this fits the profile" }
        },
        required: ["strategy_name", "strategy_philosophy", "recommended_allocation", "investment_vehicles", "risk_management", "action_steps"]
      }
    });

    return Response.json({
      success: true,
      strategy,
      market_conditions: marketAnalysis,
      current_portfolio: {
        value: currentPortfolioValue,
        allocation: currentAllocation
      },
      profile
    });

  } catch (error) {
    console.error('Strategy generation error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});