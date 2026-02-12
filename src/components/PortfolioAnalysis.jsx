import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const COLORS = {
  stocks: '#3B82F6',
  bonds: '#10B981',
  real_estate: '#F59E0B',
  crypto: '#8B5CF6',
  commodities: '#EF4444',
  cash: '#6B7280'
};

export default function PortfolioAnalysis({ entityId, holdings, vehicles }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('analyzePortfolio', {
        entity_id: entityId
      });

      if (response.data.success) {
        setAnalysis(response.data);
        toast.success('Portfolio analysis complete');
      } else {
        toast.error('Analysis failed');
      }
    } catch (error) {
      toast.error('Failed to analyze portfolio');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level) => {
    if (level === 'low') return 'bg-green-100 text-green-800';
    if (level === 'medium') return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getRiskIcon = (level) => {
    if (level === 'low') return CheckCircle;
    if (level === 'medium') return AlertCircle;
    return AlertCircle;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600" />
              AI Portfolio Analysis
            </CardTitle>
            <Button 
              onClick={runAnalysis}
              disabled={loading || holdings.length === 0}
              className="bg-gradient-to-r from-amber-500 to-blue-800 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analyze Portfolio
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        {analysis && (
          <CardContent className="space-y-6">
            {/* Asset Allocation Chart */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Asset Allocation</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analysis.portfolio.asset_allocation}
                      dataKey="value"
                      nameKey="asset_class"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ asset_class, percentage }) => `${asset_class}: ${percentage.toFixed(1)}%`}
                    >
                      {analysis.portfolio.asset_allocation.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.asset_class] || '#999'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  {analysis.portfolio.asset_allocation.map((alloc) => (
                    <div key={alloc.asset_class} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded" 
                          style={{ backgroundColor: COLORS[alloc.asset_class] || '#999' }}
                        />
                        <span className="text-sm font-medium capitalize">{alloc.asset_class}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">${alloc.value.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">{alloc.percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Risk Assessment */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="bg-gradient-to-br from-slate-50 to-slate-100">
                <CardContent className="pt-6">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Risk Level</h4>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className={getRiskColor(analysis.analysis.risk_level)}>
                      {analysis.analysis.risk_level.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-700">{analysis.analysis.risk_explanation}</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
                <CardContent className="pt-6">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Diversification Score</h4>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-3xl font-bold text-blue-800">
                      {analysis.analysis.diversification_score}/10
                    </div>
                  </div>
                  <p className="text-sm text-gray-700">{analysis.analysis.diversification_analysis}</p>
                </CardContent>
              </Card>
            </div>

            {/* Rebalancing Suggestions */}
            {analysis.analysis.rebalancing_needed && analysis.analysis.rebalancing_suggestions?.length > 0 && (
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-amber-600" />
                    Rebalancing Suggestions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analysis.analysis.rebalancing_suggestions.map((suggestion, idx) => (
                      <div key={idx} className="p-3 bg-white rounded-lg border border-amber-200">
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 capitalize">
                              {suggestion.action}: {suggestion.asset_class}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">{suggestion.reason}</p>
                            <div className="flex gap-4 mt-2 text-xs text-gray-500">
                              <span>Current: {suggestion.current_pct?.toFixed(1)}%</span>
                              <span>Target: {suggestion.target_pct?.toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Market Data & Performance */}
            {analysis.market_data && (
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50">
                <CardHeader>
                  <CardTitle className="text-lg">Market Conditions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Market Sentiment</p>
                      <Badge className={
                        analysis.market_data.market_conditions?.overall_sentiment === 'bullish' ? 'bg-green-100 text-green-800' :
                        analysis.market_data.market_conditions?.overall_sentiment === 'bearish' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }>
                        {analysis.market_data.market_conditions?.overall_sentiment?.toUpperCase() || 'NEUTRAL'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Market Volatility</p>
                      <Badge className={
                        analysis.market_data.market_conditions?.volatility_level === 'high' ? 'bg-red-100 text-red-800' :
                        analysis.market_data.market_conditions?.volatility_level === 'low' ? 'bg-green-100 text-green-800' :
                        'bg-yellow-100 text-yellow-800'
                      }>
                        {analysis.market_data.market_conditions?.volatility_level?.toUpperCase() || 'MEDIUM'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Total Return</p>
                      <p className={`text-xl font-bold ${analysis.portfolio.total_return_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {analysis.portfolio.total_return_pct >= 0 ? '+' : ''}{analysis.portfolio.total_return_pct.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Holdings Performance Detail */}
            {analysis.holdings_detail && analysis.holdings_detail.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Holdings Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analysis.holdings_detail.slice(0, 10).map((holding, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-gray-900">{holding.name}</p>
                            <Badge variant="outline" className="text-xs capitalize">{holding.asset_class}</Badge>
                            {holding.volatility && (
                              <Badge className={
                                holding.volatility === 'high' ? 'bg-red-100 text-red-800 text-xs' :
                                holding.volatility === 'low' ? 'bg-green-100 text-green-800 text-xs' :
                                'bg-yellow-100 text-yellow-800 text-xs'
                              }>
                                {holding.volatility} vol
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-4 text-sm text-gray-600">
                            <span>Value: ${holding.value.toFixed(2)}</span>
                            {holding.current_price > 0 && (
                              <span>Price: ${holding.current_price.toFixed(2)}</span>
                            )}
                            {holding.day_change_pct !== 0 && (
                              <span className={holding.day_change_pct >= 0 ? 'text-green-600' : 'text-red-600'}>
                                Today: {holding.day_change_pct >= 0 ? '+' : ''}{holding.day_change_pct.toFixed(2)}%
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${holding.gain_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {holding.gain_loss >= 0 ? '+' : ''}{holding.gain_loss_pct.toFixed(1)}%
                          </p>
                          {holding.outperforming_benchmark !== null && (
                            <p className="text-xs text-gray-500">
                              {holding.outperforming_benchmark ? '✓' : '✗'} vs benchmark
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Key Insights */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Key Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.analysis.key_insights?.map((insight, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.analysis.recommendations?.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <TrendingUp className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        )}
        {!analysis && !loading && (
          <CardContent>
            <p className="text-center text-gray-500 py-8">
              Click "Analyze Portfolio" to get AI-powered insights, risk assessment, and rebalancing suggestions.
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}