import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Target, TrendingUp, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#6B7280'];

export default function InvestmentStrategyAdvisor({ entityId }) {
  const [strategy, setStrategy] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateStrategy = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('generateInvestmentStrategy', {
        entity_id: entityId
      });

      if (response.data.success) {
        setStrategy(response.data);
        toast.success('Strategy generated');
      } else {
        toast.error(response.data.error || 'Failed to generate strategy');
      }
    } catch (error) {
      toast.error('Failed to generate strategy');
    } finally {
      setLoading(false);
    }
  };

  if (!strategy && !loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-600" />
            AI Investment Strategy Advisor
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">Get personalized investment strategies based on your goals and risk profile</p>
          <Link to={createPageUrl('FinancialSettings')}>
            <Button variant="outline" className="mb-3">
              <Target className="w-4 h-4 mr-2" />
              Set Up Financial Profile
            </Button>
          </Link>
          <br />
          <Button onClick={generateStrategy} className="bg-gradient-to-r from-amber-500 to-blue-800 text-white">
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Strategy
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-amber-600 mx-auto mb-3" />
          <p className="text-gray-500">Analyzing your profile and market conditions...</p>
        </CardContent>
      </Card>
    );
  }

  const allocationData = strategy.strategy.recommended_allocation.map(item => ({
    name: item.asset_class,
    value: item.target_percentage
  }));

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              {strategy.strategy.strategy_name}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-600 text-white">
                Suitability: {strategy.strategy.suitability_score}/10
              </Badge>
              <Button size="sm" variant="outline" onClick={generateStrategy}>
                <Sparkles className="w-4 h-4 mr-2" />
                Regenerate
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 leading-relaxed">{strategy.strategy.strategy_philosophy}</p>
          {strategy.strategy.expected_return_range && (
            <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
              <p className="text-sm text-gray-600">Expected Return Range</p>
              <p className="font-semibold text-blue-800">{strategy.strategy.expected_return_range}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Market Conditions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Sentiment</p>
              <Badge className={
                strategy.market_conditions.market_sentiment === 'bullish' ? 'bg-green-100 text-green-800' :
                strategy.market_conditions.market_sentiment === 'bearish' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }>
                {strategy.market_conditions.market_sentiment?.toUpperCase()}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Interest Rates</p>
              <Badge variant="outline">{strategy.market_conditions.interest_rate_trend}</Badge>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Inflation</p>
              <Badge variant="outline">{strategy.market_conditions.inflation_outlook}</Badge>
            </div>
          </div>
          {strategy.market_conditions.sector_opportunities?.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Sector Opportunities:</p>
              <div className="flex flex-wrap gap-2">
                {strategy.market_conditions.sector_opportunities.map((sector, idx) => (
                  <Badge key={idx} className="bg-green-100 text-green-800">{sector}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recommended Asset Allocation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={allocationData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {allocationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3">
              {strategy.strategy.recommended_allocation.map((alloc, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium capitalize">{alloc.asset_class}</span>
                    <span className="text-lg font-bold text-blue-600">{alloc.target_percentage}%</span>
                  </div>
                  <p className="text-sm text-gray-600">{alloc.rationale}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recommended Investment Vehicles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {strategy.strategy.investment_vehicles.map((vehicle, idx) => (
            <div key={idx} className="p-4 border rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900 capitalize">{vehicle.asset_class}</h4>
                  <p className="text-sm text-gray-600 mt-1">{vehicle.vehicle_type}</p>
                </div>
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-sm text-gray-700 mb-3">{vehicle.rationale}</p>
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">Specific Examples:</p>
                <div className="flex flex-wrap gap-2">
                  {vehicle.specific_examples?.map((example, i) => (
                    <Badge key={i} variant="outline">{example}</Badge>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-600" />
            Risk Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Approach</p>
            <p className="text-sm text-gray-600">{strategy.strategy.risk_management.approach}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Diversification Strategy</p>
            <p className="text-sm text-gray-600">{strategy.strategy.risk_management.diversification_strategy}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Rebalancing Frequency</p>
            <Badge variant="outline">{strategy.strategy.risk_management.rebalancing_frequency}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Action Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {strategy.strategy.action_steps.map((step, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                  {idx + 1}
                </div>
                <p className="text-sm text-gray-700 pt-0.5">{step}</p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}