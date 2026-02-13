import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { PieChart, BarChart3, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function InvestmentDiversificationAnalysis({ entityId }) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('analyzePortfolioDiversification', {
        entity_id: entityId
      });
      setAnalysis(data);
      toast.success('Diversification analysis complete');
    } catch (error) {
      toast.error('Failed to analyze portfolio');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (risk) => {
    switch (risk?.toLowerCase()) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-blue-600" />
            Diversification & Risk Analysis
          </CardTitle>
          <Button onClick={runAnalysis} disabled={loading} size="sm">
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</>
            ) : (
              <><BarChart3 className="w-4 h-4 mr-2" />Analyze</>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!analysis && !loading && (
          <p className="text-center text-gray-500 py-8">
            Click "Analyze" to assess portfolio diversification
          </p>
        )}

        {analysis && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600 mb-2">Diversification Score</p>
                <div className="flex items-center gap-3">
                  <p className="text-3xl font-bold text-blue-800">
                    {analysis.diversification_score}/100
                  </p>
                  <Progress value={analysis.diversification_score} className="flex-1" />
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Risk Level</p>
                <Badge className={`${getRiskColor(analysis.risk_level)} text-lg px-4 py-2`}>
                  {analysis.risk_level?.toUpperCase()}
                </Badge>
                <p className="text-xs text-gray-600 mt-2">{analysis.risk_explanation}</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Current Allocation</h3>
              <div className="space-y-2">
                {Object.entries(analysis.current_allocation || {}).map(([assetClass, value]) => {
                  const percentage = (value / analysis.total_portfolio_value * 100).toFixed(1);
                  return (
                    <div key={assetClass} className="flex items-center gap-3">
                      <p className="text-sm w-24 capitalize">{assetClass}</p>
                      <Progress value={parseFloat(percentage)} className="flex-1" />
                      <p className="text-sm font-semibold w-16 text-right">{percentage}%</p>
                      <p className="text-sm text-gray-600 w-24 text-right">
                        ${value.toLocaleString()}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {analysis.concentration_risks?.length > 0 && (
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Concentration Risks
                </h3>
                <ul className="space-y-1">
                  {analysis.concentration_risks.map((risk, idx) => (
                    <li key={idx} className="text-sm text-red-800">• {risk}</li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h3 className="font-semibold mb-3">Rebalancing Recommendations</h3>
              <div className="space-y-2">
                {analysis.rebalancing_recommendations?.map((rec, idx) => (
                  <div key={idx} className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-900">{idx + 1}. {rec}</p>
                  </div>
                ))}
              </div>
            </div>

            {analysis.suggested_allocation && (
              <div>
                <h3 className="font-semibold mb-3">Suggested Allocation (Risk-Adjusted)</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(analysis.suggested_allocation).map(([asset, percent]) => (
                    <div key={asset} className="p-3 bg-blue-50 rounded-lg text-center">
                      <p className="text-xs text-blue-600 capitalize mb-1">{asset}</p>
                      <p className="text-lg font-bold text-blue-800">{percent}%</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}