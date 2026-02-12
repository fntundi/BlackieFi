import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entity_id } = await req.json();

    // Fetch portfolio data
    const vehicles = await base44.entities.InvestmentVehicle.filter({ entity_id, is_active: true });
    const allHoldings = await base44.entities.InvestmentHolding.list();
    const holdings = allHoldings.filter(h => vehicles.map(v => v.id).includes(h.vehicle_id));

    // Fetch financial profile
    const profiles = await base44.entities.FinancialProfile.filter({ entity_id });
    const profile = profiles[0];

    if (holdings.length === 0) {
      return Response.json({
        success: false,
        error: 'No holdings found for analysis'
      });
    }

    // Calculate portfolio metrics
    const totalValue = holdings.reduce((sum, h) => sum + (h.quantity * (h.current_price || h.cost_basis / h.quantity)), 0);
    const totalCost = holdings.reduce((sum, h) => sum + h.cost_basis, 0);
    const totalGainLoss = totalValue - totalCost;

    // Prepare holdings data with gains/losses
    const holdingsData = holdings.map(h => {
      const currentValue = h.quantity * (h.current_price || h.cost_basis / h.quantity);
      const gainLoss = currentValue - h.cost_basis;
      const gainLossPercent = (gainLoss / h.cost_basis) * 100;
      
      return {
        asset_name: h.asset_name,
        asset_class: h.asset_class,
        quantity: h.quantity,
        cost_basis: h.cost_basis,
        current_value: currentValue,
        gain_loss: gainLoss,
        gain_loss_percent: gainLossPercent,
        vehicle_type: vehicles.find(v => v.id === h.vehicle_id)?.type || 'unknown'
      };
    });

    // Asset allocation
    const assetAllocation = {};
    holdings.forEach(h => {
      const value = h.quantity * (h.current_price || h.cost_basis / h.quantity);
      assetAllocation[h.asset_class] = (assetAllocation[h.asset_class] || 0) + value;
    });

    const prompt = `You are an advanced portfolio analyst. Analyze this investment portfolio and provide comprehensive insights.

Portfolio Overview:
- Total Value: $${totalValue.toFixed(2)}
- Total Cost Basis: $${totalCost.toFixed(2)}
- Total Gain/Loss: $${totalGainLoss.toFixed(2)} (${((totalGainLoss/totalCost)*100).toFixed(2)}%)

Holdings (${holdings.length} total):
${holdingsData.map(h => 
  `- ${h.asset_name} (${h.asset_class}): $${h.current_value.toFixed(2)}, ${h.gain_loss >= 0 ? 'Gain' : 'Loss'}: $${Math.abs(h.gain_loss).toFixed(2)} (${h.gain_loss_percent.toFixed(2)}%)`
).join('\n')}

Asset Allocation:
${Object.entries(assetAllocation).map(([cls, val]) => 
  `- ${cls}: $${val.toFixed(2)} (${((val/totalValue)*100).toFixed(2)}%)`
).join('\n')}

User Profile:
- Risk Tolerance: ${profile?.risk_tolerance || 'moderate'}
- Investment Experience: ${profile?.investment_experience || 'intermediate'}
- Financial Goals: ${profile?.financial_goals?.map(g => `${g.goal} ($${g.target_amount} in ${g.timeline_years}y)`).join(', ') || 'Not specified'}
- Time Horizon: ${profile?.time_horizon || 10} years
- Age: ${profile?.age || 'Not specified'}

Provide comprehensive analysis:`;

    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          performance_attribution: {
            type: "object",
            properties: {
              top_performers: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    asset: { type: "string" },
                    return_percent: { type: "number" },
                    contribution_to_total: { type: "string" }
                  }
                }
              },
              underperformers: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    asset: { type: "string" },
                    return_percent: { type: "number" },
                    reason: { type: "string" }
                  }
                }
              },
              sector_performance: { type: "string" }
            }
          },
          risk_assessment: {
            type: "object",
            properties: {
              overall_risk_score: {
                type: "number",
                description: "1-100 risk score"
              },
              volatility_analysis: { type: "string" },
              concentration_risk: { type: "string" },
              diversification_score: {
                type: "number",
                description: "1-100"
              },
              downside_protection: { type: "string" },
              risk_factors: {
                type: "array",
                items: { type: "string" }
              }
            }
          },
          tax_optimization: {
            type: "object",
            properties: {
              tax_loss_harvesting: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    asset: { type: "string" },
                    unrealized_loss: { type: "number" },
                    tax_benefit_estimate: { type: "number" },
                    replacement_suggestion: { type: "string" },
                    priority: { type: "string", enum: ["high", "medium", "low"] }
                  }
                }
              },
              tax_efficient_rebalancing: { type: "string" },
              account_placement_optimization: { type: "string" }
            }
          },
          scenario_analysis: {
            type: "array",
            items: {
              type: "object",
              properties: {
                scenario: { type: "string" },
                probability: { type: "string", enum: ["high", "medium", "low"] },
                estimated_impact: { type: "string" },
                portfolio_response: { type: "string" },
                mitigation_strategy: { type: "string" }
              }
            }
          },
          optimization_recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                category: { type: "string" },
                recommendation: { type: "string" },
                expected_benefit: { type: "string" },
                implementation: { type: "string" },
                priority: { type: "string", enum: ["critical", "high", "medium", "low"] }
              }
            }
          },
          goal_alignment: {
            type: "object",
            properties: {
              on_track_goals: { type: "array", items: { type: "string" } },
              at_risk_goals: { type: "array", items: { type: "string" } },
              adjustments_needed: { type: "string" }
            }
          }
        },
        required: ["performance_attribution", "risk_assessment", "tax_optimization", "scenario_analysis", "optimization_recommendations"]
      }
    });

    return Response.json({
      success: true,
      analysis,
      portfolio_snapshot: {
        total_value: totalValue,
        total_cost: totalCost,
        total_return: totalGainLoss,
        total_return_percent: (totalGainLoss/totalCost)*100,
        holdings_count: holdings.length,
        asset_allocation: assetAllocation
      }
    });

  } catch (error) {
    console.error('Advanced portfolio analysis error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});