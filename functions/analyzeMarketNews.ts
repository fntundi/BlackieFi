import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entity_id } = await req.json();

    // Fetch user's financial profile and portfolio
    const profiles = await base44.entities.FinancialProfile.filter({ entity_id });
    const profile = profiles[0];

    const vehicles = await base44.entities.InvestmentVehicle.filter({ entity_id, is_active: true });
    const allHoldings = await base44.entities.InvestmentHolding.list();
    const holdings = allHoldings.filter(h => vehicles.map(v => v.id).includes(h.vehicle_id));

    const assetClasses = [...new Set(holdings.map(h => h.asset_class))];
    const specificAssets = holdings.map(h => h.asset_name).slice(0, 10);

    // Fetch latest financial news with AI analysis
    const newsPrompt = `Search for and summarize the latest financial news and market analysis from these sources:
    - Stansberry Research
    - ITM Trading
    - Economic Ninja (YouTube channel)
    - Major financial institutions (Bloomberg, Reuters, Financial Times, CNBC)
    
    Focus on news relevant to:
    - Asset classes: ${assetClasses.join(', ') || 'stocks, bonds, crypto, real estate'}
    - Specific holdings: ${specificAssets.join(', ') || 'general market'}
    - Overall market conditions and economic trends
    - Federal Reserve policy and interest rates
    - Inflation and economic indicators
    
    User profile:
    - Risk tolerance: ${profile?.risk_tolerance || 'moderate'}
    - Investment experience: ${profile?.investment_experience || 'beginner'}
    - Financial goals: ${profile?.financial_goals?.map(g => g.goal).join(', ') || 'wealth building'}
    
    Provide 5-7 key news items with analysis of their impact on this portfolio and strategy.`;

    const newsAnalysis = await base44.integrations.Core.InvokeLLM({
      prompt: newsPrompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          news_items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                source: { type: "string" },
                summary: { type: "string" },
                impact_level: { 
                  type: "string", 
                  enum: ["critical", "high", "medium", "low"]
                },
                impact_analysis: { type: "string" },
                affected_assets: {
                  type: "array",
                  items: { type: "string" }
                },
                recommended_action: { type: "string" },
                timestamp: { type: "string" }
              }
            }
          },
          market_sentiment: {
            type: "object",
            properties: {
              overall: { type: "string", enum: ["bullish", "neutral", "bearish"] },
              confidence: { type: "string", enum: ["high", "medium", "low"] },
              key_drivers: {
                type: "array",
                items: { type: "string" }
              }
            }
          },
          alerts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                severity: { type: "string", enum: ["urgent", "important", "informational"] },
                message: { type: "string" },
                action_required: { type: "boolean" }
              }
            }
          }
        },
        required: ["news_items", "market_sentiment", "alerts"]
      }
    });

    return Response.json({
      success: true,
      news_analysis: newsAnalysis,
      portfolio_context: {
        asset_classes: assetClasses,
        holdings_count: holdings.length,
        risk_profile: profile?.risk_tolerance || 'moderate'
      },
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Market news analysis error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});