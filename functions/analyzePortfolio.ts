import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entity_id } = await req.json();

    // Fetch all investment vehicles and holdings
    const vehicles = await base44.entities.InvestmentVehicle.filter({ entity_id, is_active: true });
    const allHoldings = await base44.entities.InvestmentHolding.list();
    
    const vehicleIds = vehicles.map(v => v.id);
    const holdings = allHoldings.filter(h => vehicleIds.includes(h.vehicle_id));

    // Calculate portfolio metrics
    let totalValue = 0;
    let totalCostBasis = 0;
    const assetAllocation = {};
    const holdingDetails = [];

    holdings.forEach(holding => {
      const currentValue = (holding.current_price || 0) * holding.quantity;
      const costBasis = holding.cost_basis || 0;
      
      totalValue += currentValue;
      totalCostBasis += costBasis;

      // Asset allocation
      const assetClass = holding.asset_class || 'other';
      assetAllocation[assetClass] = (assetAllocation[assetClass] || 0) + currentValue;

      holdingDetails.push({
        name: holding.asset_name,
        asset_class: assetClass,
        value: currentValue,
        cost_basis: costBasis,
        gain_loss: currentValue - costBasis,
        gain_loss_pct: costBasis > 0 ? ((currentValue - costBasis) / costBasis) * 100 : 0
      });
    });

    const totalGainLoss = totalValue - totalCostBasis;
    const totalReturn = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;

    // Prepare data for AI analysis
    const portfolioSummary = {
      total_value: totalValue,
      total_cost_basis: totalCostBasis,
      total_gain_loss: totalGainLoss,
      total_return_pct: totalReturn,
      asset_allocation: Object.entries(assetAllocation).map(([asset_class, value]) => ({
        asset_class,
        value,
        percentage: totalValue > 0 ? (value / totalValue) * 100 : 0
      })),
      holdings: holdingDetails
    };

    // Use AI to analyze portfolio and provide insights
    const prompt = `You are a financial advisor analyzing an investment portfolio. Provide professional insights and recommendations.

Portfolio Summary:
- Total Value: $${totalValue.toFixed(2)}
- Total Cost Basis: $${totalCostBasis.toFixed(2)}
- Total Gain/Loss: $${totalGainLoss.toFixed(2)} (${totalReturn.toFixed(2)}%)

Asset Allocation:
${portfolioSummary.asset_allocation.map(a => `- ${a.asset_class}: $${a.value.toFixed(2)} (${a.percentage.toFixed(1)}%)`).join('\n')}

Top Holdings:
${holdingDetails.slice(0, 5).map(h => `- ${h.name}: $${h.value.toFixed(2)} (${h.gain_loss_pct.toFixed(1)}% return)`).join('\n')}

Provide:
1. Risk assessment (low, medium, high) with explanation
2. Diversification analysis
3. Rebalancing suggestions if needed
4. Key insights and recommendations`;

    const aiAnalysis = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          risk_level: { type: "string", enum: ["low", "medium", "high"] },
          risk_explanation: { type: "string" },
          diversification_score: { type: "number", description: "1-10 scale" },
          diversification_analysis: { type: "string" },
          rebalancing_needed: { type: "boolean" },
          rebalancing_suggestions: { 
            type: "array",
            items: {
              type: "object",
              properties: {
                action: { type: "string" },
                asset_class: { type: "string" },
                current_pct: { type: "number" },
                target_pct: { type: "number" },
                reason: { type: "string" }
              }
            }
          },
          key_insights: {
            type: "array",
            items: { type: "string" }
          },
          recommendations: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: ["risk_level", "risk_explanation", "diversification_score", "diversification_analysis", "rebalancing_needed", "key_insights", "recommendations"]
      }
    });

    return Response.json({
      success: true,
      portfolio: portfolioSummary,
      analysis: aiAnalysis
    });

  } catch (error) {
    console.error('Portfolio analysis error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});