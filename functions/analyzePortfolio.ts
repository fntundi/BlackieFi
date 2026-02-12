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

    // Fetch real-time market data for holdings
    const assetSymbols = holdings.map(h => h.asset_name).join(', ');
    const benchmarks = [...new Set(holdings.map(h => h.benchmark_symbol).filter(Boolean))].join(', ');
    
    let marketData = null;
    if (assetSymbols) {
      try {
        marketData = await base44.integrations.Core.InvokeLLM({
          prompt: `Get current market data for these assets: ${assetSymbols}. Also get data for benchmarks: ${benchmarks || 'SPY, AGG'}.
          
          For each asset, provide:
          - Current price
          - 1-day change percentage
          - 52-week high/low
          - Market cap (if applicable)
          - Volatility indicator (low/medium/high)
          
          For benchmarks, provide current price and YTD return.`,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              assets: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    symbol: { type: "string" },
                    current_price: { type: "number" },
                    day_change_pct: { type: "number" },
                    week_52_high: { type: "number" },
                    week_52_low: { type: "number" },
                    volatility: { type: "string", enum: ["low", "medium", "high"] }
                  }
                }
              },
              benchmarks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    symbol: { type: "string" },
                    current_price: { type: "number" },
                    ytd_return: { type: "number" }
                  }
                }
              },
              market_conditions: {
                type: "object",
                properties: {
                  overall_sentiment: { type: "string", enum: ["bullish", "neutral", "bearish"] },
                  volatility_level: { type: "string", enum: ["low", "medium", "high"] }
                }
              }
            }
          }
        });
      } catch (error) {
        console.log('Failed to fetch market data:', error.message);
      }
    }

    // Calculate portfolio metrics with real-time prices
    let totalValue = 0;
    let totalCostBasis = 0;
    const assetAllocation = {};
    const holdingDetails = [];

    holdings.forEach(holding => {
      // Use real-time price if available, otherwise use stored price
      let currentPrice = holding.current_price || 0;
      const marketAsset = marketData?.assets?.find(a => 
        a.symbol?.toLowerCase() === holding.asset_name?.toLowerCase()
      );
      if (marketAsset?.current_price) {
        currentPrice = marketAsset.current_price;
      }

      const currentValue = currentPrice * holding.quantity;
      const costBasis = holding.cost_basis || 0;
      
      totalValue += currentValue;
      totalCostBasis += costBasis;

      // Asset allocation
      const assetClass = holding.asset_class || 'other';
      assetAllocation[assetClass] = (assetAllocation[assetClass] || 0) + currentValue;

      // Calculate benchmark comparison
      let benchmarkReturn = null;
      if (holding.benchmark_symbol && marketData?.benchmarks) {
        const benchmark = marketData.benchmarks.find(b => 
          b.symbol?.toLowerCase() === holding.benchmark_symbol?.toLowerCase()
        );
        if (benchmark) {
          benchmarkReturn = benchmark.ytd_return;
        }
      }

      holdingDetails.push({
        name: holding.asset_name,
        asset_class: assetClass,
        value: currentValue,
        cost_basis: costBasis,
        gain_loss: currentValue - costBasis,
        gain_loss_pct: costBasis > 0 ? ((currentValue - costBasis) / costBasis) * 100 : 0,
        current_price: currentPrice,
        day_change_pct: marketAsset?.day_change_pct || 0,
        volatility: marketAsset?.volatility || 'medium',
        benchmark_return: benchmarkReturn,
        outperforming_benchmark: benchmarkReturn ? (((currentValue - costBasis) / costBasis) * 100) > benchmarkReturn : null
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
    const marketContext = marketData ? `
Current Market Conditions:
- Overall Sentiment: ${marketData.market_conditions?.overall_sentiment || 'neutral'}
- Market Volatility: ${marketData.market_conditions?.volatility_level || 'medium'}

Individual Asset Performance:
${holdingDetails.slice(0, 8).map(h => `- ${h.name}: ${h.day_change_pct?.toFixed(2)}% today, ${h.volatility} volatility${h.benchmark_return ? `, ${h.outperforming_benchmark ? 'outperforming' : 'underperforming'} benchmark (${h.benchmark_return.toFixed(1)}% YTD)` : ''}`).join('\n')}
` : '';

    const prompt = `You are an expert financial advisor analyzing an investment portfolio with real-time market data. Provide comprehensive, actionable insights.

Portfolio Summary:
- Total Value: $${totalValue.toFixed(2)}
- Total Cost Basis: $${totalCostBasis.toFixed(2)}
- Total Gain/Loss: $${totalGainLoss.toFixed(2)} (${totalReturn.toFixed(2)}%)

Asset Allocation:
${portfolioSummary.asset_allocation.map(a => `- ${a.asset_class}: $${a.value.toFixed(2)} (${a.percentage.toFixed(1)}%)`).join('\n')}

Top Holdings:
${holdingDetails.slice(0, 5).map(h => `- ${h.name}: $${h.value.toFixed(2)} (${h.gain_loss_pct.toFixed(1)}% return, ${h.volatility} volatility)`).join('\n')}
${marketContext}

Analyze the portfolio considering:
1. Current market conditions and volatility
2. Asset class concentration and diversification
3. Individual asset performance vs benchmarks
4. Risk exposure based on market volatility
5. Optimal allocation given current market environment

Provide:
1. Risk assessment (low, medium, high) with detailed explanation considering market volatility
2. Diversification score (1-10) and analysis
3. Specific rebalancing suggestions with target allocations
4. Market-aware insights and actionable recommendations`;

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
      analysis: aiAnalysis,
      market_data: marketData,
      holdings_detail: holdingDetails
    });

  } catch (error) {
    console.error('Portfolio analysis error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});