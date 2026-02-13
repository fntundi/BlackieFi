import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entity_id, benchmark_symbol = 'SPY' } = await req.json();

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

    const totalCurrentValue = allHoldings.reduce((sum, h) => 
      sum + (h.quantity * (h.current_price || h.cost_basis / h.quantity)), 0
    );
    
    const totalCostBasis = allHoldings.reduce((sum, h) => sum + h.cost_basis, 0);
    const totalGainLoss = totalCurrentValue - totalCostBasis;
    const totalReturnPercent = (totalGainLoss / totalCostBasis) * 100;

    const holdingsByClass = {};
    allHoldings.forEach(h => {
      if (!holdingsByClass[h.asset_class]) {
        holdingsByClass[h.asset_class] = {
          current_value: 0,
          cost_basis: 0,
          holdings: []
        };
      }
      const currentValue = h.quantity * (h.current_price || h.cost_basis / h.quantity);
      holdingsByClass[h.asset_class].current_value += currentValue;
      holdingsByClass[h.asset_class].cost_basis += h.cost_basis;
      holdingsByClass[h.asset_class].holdings.push({
        name: h.asset_name,
        value: currentValue,
        return_percent: ((currentValue - h.cost_basis) / h.cost_basis * 100).toFixed(2)
      });
    });

    const prompt = `Generate a comprehensive investment performance report with benchmark comparison.

Portfolio Performance:
- Total Current Value: $${totalCurrentValue.toFixed(2)}
- Total Cost Basis: $${totalCostBasis.toFixed(2)}
- Total Gain/Loss: $${totalGainLoss.toFixed(2)}
- Total Return: ${totalReturnPercent.toFixed(2)}%

Holdings by Asset Class:
${JSON.stringify(holdingsByClass, null, 2)}

Benchmark: ${benchmark_symbol}

Using real-time market data, provide:
1. Benchmark performance comparison (how does portfolio return compare to ${benchmark_symbol}?)
2. Performance by asset class
3. Top performing holdings
4. Underperforming holdings that need attention
5. Risk-adjusted return assessment (Sharpe ratio estimate)
6. Performance attribution (what drove returns?)
7. Forward-looking performance expectations`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          benchmark_return_percent: { type: "number" },
          outperformance: { type: "number" },
          performance_by_class: {
            type: "array",
            items: {
              type: "object",
              properties: {
                asset_class: { type: "string" },
                return_percent: { type: "number" },
                contribution_to_total: { type: "number" }
              }
            }
          },
          top_performers: {
            type: "array",
            items: {
              type: "object",
              properties: {
                asset: { type: "string" },
                return_percent: { type: "number" }
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
                recommendation: { type: "string" }
              }
            }
          },
          sharpe_ratio_estimate: { type: "number" },
          performance_drivers: {
            type: "array",
            items: { type: "string" }
          },
          outlook: { type: "string" }
        }
      }
    });

    return Response.json({
      portfolio_performance: {
        total_value: totalCurrentValue,
        cost_basis: totalCostBasis,
        gain_loss: totalGainLoss,
        return_percent: totalReturnPercent
      },
      ...response
    });

  } catch (error) {
    console.error('Error generating performance report:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});