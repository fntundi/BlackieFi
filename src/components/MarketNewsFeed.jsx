import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, TrendingUp, TrendingDown, AlertTriangle, Bell, RefreshCw, Newspaper } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function MarketNewsFeed({ entityId }) {
  const [news, setNews] = useState(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('analyzeMarketNews', {
        entity_id: entityId
      });

      if (response.data.success) {
        setNews(response.data);
        toast.success('News updated');
      } else {
        toast.error('Failed to fetch news');
      }
    } catch (error) {
      toast.error('Failed to fetch news');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (entityId) {
      fetchNews();
    }
  }, [entityId]);

  useEffect(() => {
    if (autoRefresh && entityId) {
      const interval = setInterval(fetchNews, 300000); // 5 minutes
      return () => clearInterval(interval);
    }
  }, [autoRefresh, entityId]);

  const getImpactColor = (level) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'urgent': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'important': return <Bell className="w-4 h-4 text-orange-600" />;
      default: return <Bell className="w-4 h-4 text-blue-600" />;
    }
  };

  if (!news && !loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-blue-600" />
            Market News & Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Newspaper className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">Get AI-powered market news analysis tailored to your portfolio</p>
          <Button onClick={fetchNews} className="bg-blue-600 hover:bg-blue-700">
            <Sparkles className="w-4 h-4 mr-2" />
            Load News Feed
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading && !news) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-500">Analyzing market news from multiple sources...</p>
        </CardContent>
      </Card>
    );
  }

  const sentiment = news.news_analysis.market_sentiment;
  const newsItems = news.news_analysis.news_items;
  const alerts = news.news_analysis.alerts;

  return (
    <div className="space-y-6">
      {/* Alerts Section */}
      {alerts && alerts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <Bell className="w-5 h-5" />
              Market Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-white rounded-lg border">
                {getSeverityIcon(alert.severity)}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={
                      alert.severity === 'urgent' ? 'bg-red-100 text-red-800' :
                      alert.severity === 'important' ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-100 text-blue-800'
                    }>
                      {alert.severity}
                    </Badge>
                    {alert.action_required && (
                      <Badge variant="outline" className="text-xs">Action Required</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">{alert.message}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Market Sentiment */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-blue-600" />
              Market News & Analysis
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={autoRefresh ? 'bg-blue-100' : ''}
              >
                <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
              </Button>
              <Button size="sm" variant="outline" onClick={fetchNews} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-2">Current Market Sentiment</p>
              <div className="flex items-center gap-3">
                {sentiment.overall === 'bullish' && <TrendingUp className="w-6 h-6 text-green-600" />}
                {sentiment.overall === 'bearish' && <TrendingDown className="w-6 h-6 text-red-600" />}
                {sentiment.overall === 'neutral' && <span className="text-2xl text-gray-600">→</span>}
                <span className="text-2xl font-bold capitalize">{sentiment.overall}</span>
                <Badge variant="outline">{sentiment.confidence} confidence</Badge>
              </div>
            </div>
            <div className="text-right text-xs text-gray-500">
              Updated: {new Date(news.generated_at).toLocaleString()}
            </div>
          </div>
          {sentiment.key_drivers && sentiment.key_drivers.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Key Market Drivers:</p>
              <div className="flex flex-wrap gap-2">
                {sentiment.key_drivers.map((driver, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">{driver}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* News Items */}
      <div className="space-y-4">
        {newsItems.map((item, idx) => (
          <Card key={idx} className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{item.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                      <span>{item.source}</span>
                      {item.timestamp && (
                        <>
                          <span>•</span>
                          <span>{item.timestamp}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Badge className={getImpactColor(item.impact_level)}>
                    {item.impact_level} impact
                  </Badge>
                </div>

                <p className="text-sm text-gray-700 leading-relaxed">{item.summary}</p>

                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs font-medium text-blue-900 mb-1">Impact on Your Portfolio:</p>
                  <p className="text-sm text-blue-800">{item.impact_analysis}</p>
                </div>

                {item.affected_assets && item.affected_assets.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-2">Affected Assets:</p>
                    <div className="flex flex-wrap gap-2">
                      {item.affected_assets.map((asset, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{asset}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {item.recommended_action && (
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-xs font-medium text-green-900 mb-1">Recommended Action:</p>
                    <p className="text-sm text-green-800">{item.recommended_action}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}