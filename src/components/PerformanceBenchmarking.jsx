import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Loader2, Award, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';

export default function PerformanceBenchmarking({ entityId }) {
  const [loading, setLoading] = useState(false);
  const [benchmark, setBenchmark] = useState('SPY');
  const [report, setReport] = useState(null);

  const generateReport = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('generatePerformanceReport', {
        entity_id: entityId,
        benchmark_symbol: benchmark
      });
      setReport(data);
      toast.success('Performance report generated');
    } catch (error) {
      toast.error('Failed to generate report');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-green-600" />
            Performance Benchmarking
          </CardTitle>
          <div className="flex items-center gap-2">
            <Input
              value={benchmark}
              onChange={(e) => setBenchmark(e.target.value)}
              placeholder="Benchmark (e.g., SPY)"
              className="w-32"
            />
            <Button onClick={generateReport} disabled={loading} size="sm">
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Loading...</>
              ) : (
                <>Generate</>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!report && !loading && (
          <p className="text-center text-gray-500 py-8">
            Generate performance report to compare against benchmark
          </p>
        )}

        {report && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600 mb-1">Portfolio Return</p>
                <p className="text-2xl font-bold text-blue-800">
                  {report.portfolio_performance?.return_percent?.toFixed(2)}%
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600 mb-1">Benchmark Return</p>
                <p className="text-2xl font-bold text-green-800">
                  {report.benchmark_return_percent?.toFixed(2)}%
                </p>
              </div>
              <div className={`p-4 rounded-lg ${report.outperformance >= 0 ? 'bg-purple-50' : 'bg-red-50'}`}>
                <p className={`text-sm mb-1 ${report.outperformance >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                  Outperformance
                </p>
                <p className={`text-2xl font-bold ${report.outperformance >= 0 ? 'text-purple-800' : 'text-red-800'}`}>
                  {report.outperformance >= 0 ? '+' : ''}{report.outperformance?.toFixed(2)}%
                </p>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg">
                <p className="text-sm text-amber-600 mb-1">Sharpe Ratio</p>
                <p className="text-2xl font-bold text-amber-800">
                  {report.sharpe_ratio_estimate?.toFixed(2)}
                </p>
              </div>
            </div>

            {report.top_performers?.length > 0 && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Top Performers
                </h3>
                <div className="space-y-2">
                  {report.top_performers.map((perf, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <p className="text-sm text-green-800">{perf.asset}</p>
                      <Badge className="bg-green-600">+{perf.return_percent?.toFixed(2)}%</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {report.underperformers?.length > 0 && (
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5" />
                  Underperformers
                </h3>
                <div className="space-y-3">
                  {report.underperformers.map((perf, idx) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-red-800">{perf.asset}</p>
                        <Badge variant="outline" className="border-red-300 text-red-700">
                          {perf.return_percent?.toFixed(2)}%
                        </Badge>
                      </div>
                      <p className="text-xs text-red-700">💡 {perf.recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {report.performance_drivers?.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Performance Drivers</h3>
                <div className="space-y-2">
                  {report.performance_drivers.map((driver, idx) => (
                    <div key={idx} className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-900">• {driver}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {report.outlook && (
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h3 className="font-semibold text-purple-900 mb-2">Outlook</h3>
                <p className="text-sm text-purple-800">{report.outlook}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}