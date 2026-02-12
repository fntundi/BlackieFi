import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Sparkles, Loader2, TrendingUp, TrendingDown, AlertTriangle, 
  Target, DollarSign, Shield, Activity, Zap, ChevronRight
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function AdvancedPortfolioAnalytics({ entityId }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('analyzePortfolioAdvanced', {
        entity_id: entityId
      });

      if (response.data.success) {
        setAnalysis(response.data);
        toast.success('Analysis complete');
      } else {
        toast.error(response.data.error || 'Analysis failed');
      }
    } catch (error) {
      toast.error('Failed to run analysis');
    } finally {
      setLoading(false);
    }
  };

  if (!analysis && !loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-600" />
            Advanced Portfolio Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">Get AI-powered deep dive into your portfolio performance and optimization opportunities</p>
          <Button onClick={runAnalysis} className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
            <Sparkles className="w-4 h-4 mr-2" />
            Run Advanced Analysis
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-3" />
          <p className="text-gray-500">Analyzing your portfolio...</p>
        </CardContent>
      </Card>
    );
  }

  const perf = analysis.analysis.performance_attribution;
  const risk = analysis.analysis.risk_assessment;
  const tax = analysis.analysis.tax_optimization;
  const scenarios = analysis.analysis.scenario_analysis;
  const recommendations = analysis.analysis.optimization_recommendations;
  const goals = analysis.analysis.goal_alignment;

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-600" />
              Advanced Portfolio Analytics
            </CardTitle>
            <Button size="sm" variant="outline" onClick={runAnalysis}>
              <Sparkles className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Portfolio Value</p>
              <p className="text-2xl font-bold text-gray-900">
                ${analysis.portfolio_snapshot.total_value.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Return</p>
              <p className={`text-2xl font-bold ${analysis.portfolio_snapshot.total_return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {analysis.portfolio_snapshot.total_return >= 0 ? '+' : ''}
                {analysis.portfolio_snapshot.total_return_percent.toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Risk Score</p>
              <p className="text-2xl font-bold text-orange-600">
                {risk.overall_risk_score}/100
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Diversification</p>
              <p className="text-2xl font-bold text-blue-600">
                {risk.diversification_score}/100
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="risk">Risk</TabsTrigger>
          <TabsTrigger value="tax">Tax Optimization</TabsTrigger>
          <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
          <TabsTrigger value="recommendations">Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Performance Attribution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {perf.top_performers && perf.top_performers.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Top Performers</h4>
                  <div className="space-y-3">
                    {perf.top_performers.map((p, idx) => (
                      <div key={idx} className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">{p.asset}</span>
                          <Badge className="bg-green-100 text-green-800">
                            +{p.return_percent.toFixed(2)}%
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700">{p.contribution_to_total}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {perf.underperformers && perf.underperformers.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Underperformers</h4>
                  <div className="space-y-3">
                    {perf.underperformers.map((p, idx) => (
                      <div key={idx} className="p-4 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">{p.asset}</span>
                          <Badge className="bg-red-100 text-red-800">
                            {p.return_percent.toFixed(2)}%
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700">{p.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {perf.sector_performance && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">Sector Analysis</h4>
                  <p className="text-sm text-blue-800">{perf.sector_performance}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-orange-600" />
                Risk Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="text-sm text-orange-900 font-medium mb-2">Overall Risk Score</p>
                  <div className="flex items-center gap-3">
                    <Progress value={risk.overall_risk_score} className="flex-1" />
                    <span className="text-2xl font-bold text-orange-600">{risk.overall_risk_score}</span>
                  </div>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-900 font-medium mb-2">Diversification Score</p>
                  <div className="flex items-center gap-3">
                    <Progress value={risk.diversification_score} className="flex-1" />
                    <span className="text-2xl font-bold text-blue-600">{risk.diversification_score}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Volatility Analysis</h4>
                <p className="text-sm text-gray-700">{risk.volatility_analysis}</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Concentration Risk</h4>
                <p className="text-sm text-gray-700">{risk.concentration_risk}</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Downside Protection</h4>
                <p className="text-sm text-gray-700">{risk.downside_protection}</p>
              </div>

              {risk.risk_factors && risk.risk_factors.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Key Risk Factors</h4>
                  <div className="space-y-2">
                    {risk.risk_factors.map((factor, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                        <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                        <span>{factor}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tax" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                Tax Optimization Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {tax.tax_loss_harvesting && tax.tax_loss_harvesting.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Tax-Loss Harvesting Opportunities</h4>
                  <div className="space-y-3">
                    {tax.tax_loss_harvesting.map((opp, idx) => (
                      <div key={idx} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h5 className="font-medium text-gray-900">{opp.asset}</h5>
                            <p className="text-sm text-red-600 mt-1">
                              Unrealized Loss: ${Math.abs(opp.unrealized_loss).toFixed(2)}
                            </p>
                          </div>
                          <Badge className={
                            opp.priority === 'high' ? 'bg-red-100 text-red-800' :
                            opp.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }>
                            {opp.priority} priority
                          </Badge>
                        </div>
                        <div className="p-3 bg-green-50 rounded border border-green-200 mb-3">
                          <p className="text-sm text-green-900">
                            <span className="font-medium">Estimated Tax Benefit:</span> ${opp.tax_benefit_estimate.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-sm text-gray-700">
                          <p className="font-medium mb-1">Replacement Strategy:</p>
                          <p>{opp.replacement_suggestion}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tax.tax_efficient_rebalancing && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">Tax-Efficient Rebalancing</h4>
                  <p className="text-sm text-blue-800">{tax.tax_efficient_rebalancing}</p>
                </div>
              )}

              {tax.account_placement_optimization && (
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h4 className="font-semibold text-purple-900 mb-2">Account Placement Strategy</h4>
                  <p className="text-sm text-purple-800">{tax.account_placement_optimization}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scenarios" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-600" />
                Scenario Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {scenarios.map((scenario, idx) => (
                <div key={idx} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">{scenario.scenario}</h4>
                    <Badge variant="outline" className="capitalize">
                      {scenario.probability} probability
                    </Badge>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="p-3 bg-red-50 rounded">
                      <p className="font-medium text-red-900 mb-1">Estimated Impact:</p>
                      <p className="text-red-800">{scenario.estimated_impact}</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded">
                      <p className="font-medium text-blue-900 mb-1">Portfolio Response:</p>
                      <p className="text-blue-800">{scenario.portfolio_response}</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded">
                      <p className="font-medium text-green-900 mb-1">Mitigation Strategy:</p>
                      <p className="text-green-800">{scenario.mitigation_strategy}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                Optimization Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recommendations.map((rec, idx) => (
                <div key={idx} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <ChevronRight className="w-5 h-5 text-blue-600" />
                      <h4 className="font-semibold text-gray-900">{rec.category}</h4>
                    </div>
                    <Badge className={
                      rec.priority === 'critical' ? 'bg-red-100 text-red-800' :
                      rec.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                      rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }>
                      {rec.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-700 mb-3">{rec.recommendation}</p>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="p-3 bg-green-50 rounded text-sm">
                      <p className="font-medium text-green-900 mb-1">Expected Benefit:</p>
                      <p className="text-green-800">{rec.expected_benefit}</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded text-sm">
                      <p className="font-medium text-blue-900 mb-1">Implementation:</p>
                      <p className="text-blue-800">{rec.implementation}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {goals && (
            <Card>
              <CardHeader>
                <CardTitle>Goal Alignment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {goals.on_track_goals && goals.on_track_goals.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-green-900 mb-2">On Track Goals</h4>
                    <ul className="space-y-1">
                      {goals.on_track_goals.map((goal, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-green-700">
                          <span className="w-2 h-2 bg-green-600 rounded-full" />
                          {goal}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {goals.at_risk_goals && goals.at_risk_goals.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-red-900 mb-2">At Risk Goals</h4>
                    <ul className="space-y-1">
                      {goals.at_risk_goals.map((goal, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-red-700">
                          <AlertTriangle className="w-4 h-4" />
                          {goal}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {goals.adjustments_needed && (
                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-900">{goals.adjustments_needed}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}