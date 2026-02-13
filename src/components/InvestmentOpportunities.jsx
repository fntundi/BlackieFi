import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

export default function InvestmentOpportunities({ entityId }) {
  const [loading, setLoading] = useState(false);
  const [opportunities, setOpportunities] = useState(null);

  const generateOpportunities = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('generateInvestmentOpportunities', {
        entity_id: entityId
      });
      setOpportunities(data);
      toast.success('Investment opportunities generated');
    } catch (error) {
      toast.error('Failed to generate opportunities');
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
    <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Investment Opportunities
          </CardTitle>
          <Button onClick={generateOpportunities} disabled={loading} size="sm" className="bg-purple-600 hover:bg-purple-700">
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
            ) : (
              <><TrendingUp className="w-4 h-4 mr-2" />Generate</>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!opportunities && !loading && (
          <p className="text-center text-gray-600 py-8">
            Generate AI-powered investment opportunities tailored to your profile
          </p>
        )}

        {opportunities && (
          <div className="space-y-6">
            {opportunities.market_trends?.length > 0 && (
              <div className="p-4 bg-white rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-3">Current Market Trends</h3>
                <ul className="space-y-2">
                  {opportunities.market_trends.map((trend, idx) => (
                    <li key={idx} className="text-sm text-blue-800">📈 {trend}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="font-semibold">Recommended Opportunities</h3>
              {opportunities.opportunities?.map((opp, idx) => (
                <div key={idx} className="p-4 bg-white rounded-lg border border-purple-200 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-purple-900 text-lg">{opp.asset_name}</p>
                      <p className="text-sm text-gray-600 capitalize">{opp.asset_class}</p>
                    </div>
                    <div className="text-right">
                      <Badge className={getRiskColor(opp.risk_level)}>
                        {opp.risk_level}
                      </Badge>
                      <p className="text-sm font-semibold text-purple-600 mt-1">
                        {opp.recommended_allocation_percent}% allocation
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{opp.rationale}</p>
                  <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                    <div className="p-2 bg-blue-50 rounded">
                      <p className="text-xs text-blue-600">Time Horizon</p>
                      <p className="font-medium text-blue-900">{opp.time_horizon}</p>
                    </div>
                    <div className="p-2 bg-green-50 rounded">
                      <p className="text-xs text-green-600">Entry Strategy</p>
                      <p className="font-medium text-green-900 text-xs">{opp.entry_strategy}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {opportunities.sector_opportunities?.length > 0 && (
              <div className="p-4 bg-white rounded-lg border border-green-200">
                <h3 className="font-semibold text-green-900 mb-3">Sector Opportunities</h3>
                <div className="flex flex-wrap gap-2">
                  {opportunities.sector_opportunities.map((sector, idx) => (
                    <Badge key={idx} variant="outline" className="bg-green-50">
                      {sector}
                    </Badge>
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