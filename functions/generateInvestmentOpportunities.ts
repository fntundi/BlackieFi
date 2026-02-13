import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entity_id } = await req.json();

    const profile = await base44.entities.FinancialProfile.filter({ entity_id });
    const userProfile = profile[0] || { 
      risk_tolerance: 'moderate',
      investment_experience: 'intermediate',
      time_horizon: 10
    };

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

    const currentHoldings = allHoldings.map(h => h.asset_name).join(', ');

    const prompt = `As a financial advisor AI, analyze current market trends and suggest investment opportunities.

User Profile:
- Risk Tolerance: ${userProfile.risk_tolerance}
- Investment Experience: ${userProfile.investment_experience}
- Time Horizon: ${userProfile.time_horizon} years
- Current Holdings: ${currentHoldings || 'None'}

Using real-time market data and trends, provide:
1. Top 5 investment opportunities tailored to this profile
2. Current market trends affecting these recommendations
3. Sector rotation opportunities
4. Risk/reward assessment for each opportunity
5. Entry/exit strategy suggestions

Focus on diverse opportunities across asset classes appropriate for the risk tolerance.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          opportunities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                asset_name: { type: "string" },
                asset_class: { type: "string" },
                recommended_allocation_percent: { type: "number" },
                rationale: { type: "string" },
                risk_level: { type: "string" },
                time_horizon: { type: "string" },
                entry_strategy: { type: "string" }
              }
            }
          },
          market_trends: {
            type: "array",
            items: { type: "string" }
          },
          sector_opportunities: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    return Response.json(response);

  } catch (error) {
    console.error('Error generating investment opportunities:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});