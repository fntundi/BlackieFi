import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function BudgetForecast({ entityId }) {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateForecast = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('forecastBudget', {
        entity_id: entityId,
        forecast_months: 3
      });

      if (response.data.success) {
        setForecast(response.data);
        toast.success('Forecast generated');
      } else {
        toast.error(response.data.error || 'Failed to generate forecast');
      }
    } catch (error) {
      toast.error('Failed to generate forecast');
    } finally {
      setLoading(false);
    }
  };

  if (!forecast && !loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Budget Forecast
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">Get AI-powered insights about your future budget and spending patterns</p>
          <Button onClick={generateForecast} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Forecast
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
          <p className="text-gray-500">Analyzing your financial data...</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = forecast.forecast.monthly_forecasts.map(m => ({
    month: m.month,
    income: m.forecasted_income,
    expenses: m.forecasted_expenses,
    balance: m.ending_balance
  }));

  const insights = forecast.forecast.insights;
  const healthScore = forecast.forecast.overall_health_score || 0;

  const getHealthColor = (score) => {
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrendIcon = (trend) => {
    if (trend === 'increasing') return <TrendingUp className="w-4 h-4 text-red-600" />;
    if (trend === 'decreasing') return <TrendingDown className="w-4 h-4 text-green-600" />;
    return <span className="text-gray-600">→</span>;
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Budget Forecast & Analysis
            </CardTitle>
            <Button size="sm" variant="outline" onClick={generateForecast}>
              <Sparkles className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Financial Health</p>
              <p className={`text-3xl font-bold ${getHealthColor(healthScore)}`}>
                {healthScore}
                <span className="text-lg">/100</span>
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Spending Trend</p>
              <div className="flex items-center gap-2">
                {getTrendIcon(insights.spending_trend)}
                <span className="font-medium capitalize">{insights.spending_trend}</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Income Stability</p>
              <Badge variant="outline" className="capitalize">{insights.income_stability}</Badge>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Risk Level</p>
              <Badge className={
                insights.risk_level === 'high' ? 'bg-red-100 text-red-800' :
                insights.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }>
                {insights.risk_level?.toUpperCase()}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3-Month Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
              <Legend />
              <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} name="Income" />
              <Line type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2} name="Expenses" />
              <Line type="monotone" dataKey="balance" stroke="#3B82F6" strokeWidth={2} name="Balance" />
            </LineChart>
          </ResponsiveContainer>
          
          <div className="grid md:grid-cols-3 gap-4 mt-6">
            {forecast.forecast.monthly_forecasts.map((month, idx) => (
              <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">{month.month}</h4>
                  <Badge variant="outline" className="text-xs">{month.confidence} confidence</Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Income:</span>
                    <span className="font-medium text-green-600">${month.forecasted_income.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Expenses:</span>
                    <span className="font-medium text-red-600">${month.forecasted_expenses.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-gray-600 font-medium">Balance:</span>
                    <span className={`font-bold ${month.ending_balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      ${month.ending_balance.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {(insights.potential_shortfalls?.length > 0 || insights.potential_surpluses?.length > 0) && (
        <div className="grid md:grid-cols-2 gap-6">
          {insights.potential_shortfalls?.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-800">
                  <AlertTriangle className="w-5 h-5" />
                  Potential Shortfalls
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {insights.potential_shortfalls.map((shortfall, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-red-700">
                      <span className="mt-1">•</span>
                      <span>{shortfall}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {insights.potential_surpluses?.length > 0 && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <CheckCircle2 className="w-5 h-5" />
                  Potential Surpluses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {insights.potential_surpluses.map((surplus, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-green-700">
                      <span className="mt-1">•</span>
                      <span>{surplus}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recommended Budget Adjustments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {forecast.forecast.recommendations.map((rec, idx) => (
            <div key={idx} className="p-4 border rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">{rec.category}</h4>
                    <Badge className={
                      rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                      rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }>
                      {rec.priority} priority
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{rec.reason}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm mt-3">
                <div>
                  <span className="text-gray-600">Current Avg: </span>
                  <span className="font-medium">${rec.current_avg?.toFixed(2)}</span>
                </div>
                <span className="text-gray-400">→</span>
                <div>
                  <span className="text-gray-600">Suggested: </span>
                  <span className="font-medium text-blue-600">${rec.suggested_budget?.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Action Items</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {forecast.forecast.action_items.map((action, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold">
                  {idx + 1}
                </div>
                <p className="text-sm text-gray-700 pt-0.5">{action}</p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}