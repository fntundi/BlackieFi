import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { holding_ids } = await req.json();

    const holdings = await Promise.all(
      holding_ids.map(id => base44.entities.InvestmentHolding.get(id))
    );

    const symbols = holdings.map(h => h.asset_name).join(', ');

    const prompt = `Fetch current real-time market prices for these assets: ${symbols}

For each asset, provide:
- Current price (in USD)
- 24-hour price change percentage
- Market status (open/closed)

Use your internet search capability to get the most current prices from reliable financial sources.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          prices: {
            type: "array",
            items: {
              type: "object",
              properties: {
                asset_name: { type: "string" },
                current_price: { type: "number" },
                change_24h_percent: { type: "number" },
                market_status: { type: "string" }
              }
            }
          }
        }
      }
    });

    const updates = [];
    for (const holding of holdings) {
      const priceData = response.prices.find(p => 
        p.asset_name.toLowerCase().includes(holding.asset_name.toLowerCase()) ||
        holding.asset_name.toLowerCase().includes(p.asset_name.toLowerCase())
      );

      if (priceData) {
        await base44.asServiceRole.entities.InvestmentHolding.update(holding.id, {
          current_price: priceData.current_price,
          last_updated: new Date().toISOString().split('T')[0]
        });
        updates.push({
          holding_id: holding.id,
          asset_name: holding.asset_name,
          old_price: holding.current_price,
          new_price: priceData.current_price,
          change_percent: priceData.change_24h_percent
        });
      }
    }

    return Response.json({
      updated_count: updates.length,
      updates: updates
    });

  } catch (error) {
    console.error('Error updating holding prices:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});