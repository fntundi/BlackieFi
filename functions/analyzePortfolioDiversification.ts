import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entity_id } = await req.json();

    const vehicles = await base44.entities.InvestmentVehicle.filter({ 
      entity_id, 
      is_active: true 
    });
    
    const allHoldings = [];
    for (const vehicle of vehicles) {
      const holdings = await base44.entities.InvestmentHolding.filter({ 
        vehicle_id: vehicle.id 
      });
      allHoldings.push(...holdings);
    }

    const profile = await base44.entities.FinancialProfile.filter({ entity_id });
    const userProfile = profile[0] || { risk_tolerance: 'moderate' };

    const totalValue = allHoldings.reduce((sum, h) => 
      sum + (h.quantity * (h.current_price || h.cost_basis / h.quantity)), 0
    );

    const assetClassBreakdown = {};
    allHoldings.forEach(h => {
      const value = h.quantity * (h.current_price || h.cost_basis / h.quantity);
      assetClassBreakdown[h.asset_class] = (assetClassBreakdown[h.asset_class] || 0) + value;
    });

    const prompt = `Analyze this investment portfolio for diversification and risk.

Portfolio Summary:
- Total Value: $${totalValue.toFixed(2)}
- User Risk Tolerance: ${userProfile.risk_tolerance}
- Asset Class Breakdown: ${JSON.stringify(assetClassBreakdown, null, 2)}

Holdings Detail:
${JSON.stringify(allHoldings.map(h => ({
  asset: h.asset_name,
  class: h.asset_class,
  value: h.quantity * (h.current_price || h.cost_basis / h.quantity),
  percentage: ((h.quantity * (h.current_price || h.cost_basis / h.quantity)) / totalValue * 100).toFixed(2)
})), null, 2)}

Provide:
1. Diversification score (0-100, where 100 is perfectly diversified)
2. Risk assessment (low, medium, high) with explanation
3. Asset allocation analysis - is it appropriate for the risk tolerance?
4. Concentration risks - any single position too large?
5. Specific rebalancing recommendations
6. Suggested allocation percentages by asset class for this risk profile`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      response_json_schema: {
        type: "object",
        properties: {
          diversification_score: { type: "number" },
          risk_level: { type: "string" },
          risk_explanation: { type: "string" },
          allocation_assessment: { type: "string" },
          concentration_risks: {
            type: "array",
            items: { type: "string" }
          },
          rebalancing_recommendations: {
            type: "array",
            items: { type: "string" }
          },
          suggested_allocation: {
            type: "object",
            properties: {
              stocks: { type: "number" },
              bonds: { type: "number" },
              real_estate: { type: "number" },
              crypto: { type: "number" },
              commodities: { type: "number" },
              cash: { type: "number" }
            }
          }
        }
      }
    });

    return Response.json({
      ...response,
      current_allocation: assetClassBreakdown,
      total_portfolio_value: totalValue
    });

  } catch (error) {
    console.error('Error analyzing diversification:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});