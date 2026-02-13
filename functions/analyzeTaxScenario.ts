import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      baseline_scenario_id, 
      adjustments 
    } = await req.json();

    const baselineScenario = await base44.entities.TaxScenario.get(baseline_scenario_id);
    
    if (!baselineScenario) {
      return Response.json({ error: 'Baseline scenario not found' }, { status: 404 });
    }

    const prompt = `Analyze the tax impact of these financial adjustments compared to the baseline scenario.

Baseline Scenario:
- Total Income: $${baselineScenario.total_income}
- Total Deductions: $${baselineScenario.total_deductions}
- Estimated Tax Liability: $${baselineScenario.estimated_tax_liability}
- Effective Tax Rate: ${baselineScenario.effective_tax_rate}%

Proposed Adjustments:
${JSON.stringify(adjustments, null, 2)}

Calculate:
1. New estimated tax liability after adjustments
2. New effective tax rate
3. Total tax savings compared to baseline
4. Impact on take-home income
5. Detailed breakdown of how each adjustment affects taxes
6. Risk assessment of the adjusted scenario
7. Actionable implementation steps

Provide realistic calculations based on current US tax law.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      response_json_schema: {
        type: "object",
        properties: {
          new_tax_liability: { type: "number" },
          new_effective_rate: { type: "number" },
          total_tax_savings: { type: "number" },
          take_home_impact: { type: "number" },
          adjustment_impacts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                adjustment: { type: "string" },
                tax_impact: { type: "number" },
                description: { type: "string" }
              }
            }
          },
          risk_assessment: { type: "string" },
          implementation_steps: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    return Response.json(response);

  } catch (error) {
    console.error('Error analyzing tax scenario:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});