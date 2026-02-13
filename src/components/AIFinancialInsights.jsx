import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  DollarSign, 
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';

export default function AIFinancialInsights({ entityId }) {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    anomalies: true,
    forecast: true,
    savings: true
  });

  const generateInsights = async () => {
    setLoading(true);
    try {
      const [anomaliesRes, forecastRes, savingsRes] = await Promise.all([
        base44.functions.invoke('detectAnomalies', { entity_id: entityId }),
        base44.functions.invoke('forecastCashFlow', { entity_id: entityId, forecast_months: 3 }),
        base44.functions.invoke('identifyCostSavings', { entity_id: entityId })
      ]);

      setInsights({
        anomalies: anomaliesRes.data,
        forecast: forecastRes.data,
        savings: savingsRes.data
      });
      toast.success('AI insights generated');
    } catch (error) {
      toast.error('Failed to generate insights');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-purple-900">
            <Brain className="w-6 h-6 text-purple-600" />
            AI Financial Insights
          </CardTitle>
          <Button 
            onClick={generateInsights} 
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 mr-2" />
                Generate Insights
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!insights && !loading && (
          <p className="text-center text-gray-600 py-8">
            Click "Generate Insights" to get AI-powered financial recommendations
          </p>
        )}

        {insights && (
          <div className="space-y-6">
            {/* Anomaly Detection */}
            <div className="bg-white rounded-lg border border-red-200">
              <button
                onClick={() => toggleSection('anomalies')}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <h3 className="font-semibold text-gray-900">
                    Spending Anomalies ({insights.anomalies?.anomalies?.length || 0})
                  </h3>
                </div>
                {expandedSections.anomalies ? <ChevronUp /> : <ChevronDown />}
              </button>
              {expandedSections.anomalies && (
                <div className="p-4 pt-0 space-y-3">
                  {insights.anomalies?.anomalies?.map((anomaly, idx) => (
                    <div key={idx} className="p-4 bg-red-50 rounded-lg border border-red-100">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <Badge className={getSeverityColor(anomaly.severity)}>
                            {anomaly.severity}
                          </Badge>
                          <p className="font-medium text-gray-900 mt-2">{anomaly.category}</p>
                        </div>
                        <p className="text-red-600 font-bold">
                          ${anomaly.potential_impact?.toFixed(2)}
                        </p>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{anomaly.description}</p>
                      <p className="text-sm text-gray-600 italic">💡 {anomaly.recommendation}</p>
                    </div>
                  ))}
                  {(!insights.anomalies?.anomalies || insights.anomalies.anomalies.length === 0) && (
                    <p className="text-center text-gray-500 py-4">No anomalies detected</p>
                  )}
                </div>
              )}
            </div>

            {/* Cash Flow Forecast */}
            <div className="bg-white rounded-lg border border-green-200">
              <button
                onClick={() => toggleSection('forecast')}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-gray-900">
                    Cash Flow Forecast (Next {insights.forecast?.forecast?.length || 0} Months)
                  </h3>
                </div>
                {expandedSections.forecast ? <ChevronUp /> : <ChevronDown />}
              </button>
              {expandedSections.forecast && (
                <div className="p-4 pt-0 space-y-3">
                  {insights.forecast?.forecast?.map((month, idx) => (
                    <div key={idx} className="p-4 bg-green-50 rounded-lg border border-green-100">
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-semibold text-gray-900">{month.month}</p>
                        <Badge className={month.confidence === 'high' ? 'bg-green-600' : 'bg-yellow-600'}>
                          {month.confidence} confidence
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Income</p>
                          <p className="font-semibold text-green-600">
                            ${month.predicted_income?.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Expenses</p>
                          <p className="font-semibold text-red-600">
                            ${month.predicted_expenses?.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Net</p>
                          <p className={`font-semibold ${month.net_cash_flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${month.net_cash_flow?.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {insights.forecast?.assumptions?.length > 0 && (
                    <div className="p-3 bg-blue-50 rounded-lg text-sm">
                      <p className="font-medium mb-2">Key Assumptions:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {insights.forecast.assumptions.map((assumption, idx) => (
                          <li key={idx} className="text-gray-700">{assumption}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Cost Savings */}
            <div className="bg-white rounded-lg border border-blue-200">
              <button
                onClick={() => toggleSection('savings')}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">
                    Cost-Saving Opportunities (${insights.savings?.total_potential_savings?.toFixed(2)}/mo)
                  </h3>
                </div>
                {expandedSections.savings ? <ChevronUp /> : <ChevronDown />}
              </button>
              {expandedSections.savings && (
                <div className="p-4 pt-0 space-y-3">
                  {insights.savings?.opportunities?.map((opp, idx) => (
                    <div key={idx} className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-gray-900">{opp.category}</p>
                          <Badge className={getDifficultyColor(opp.difficulty)}>
                            {opp.difficulty}
                          </Badge>
                        </div>
                        <p className="text-green-600 font-bold">
                          ${opp.estimated_monthly_savings?.toFixed(2)}/mo
                        </p>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{opp.description}</p>
                      <div className="text-sm">
                        <p className="font-medium text-gray-700 mb-1">Action Steps:</p>
                        <ol className="list-decimal list-inside space-y-1">
                          {opp.action_steps?.map((step, stepIdx) => (
                            <li key={stepIdx} className="text-gray-600">{step}</li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}