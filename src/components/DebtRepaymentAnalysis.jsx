import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { 
  Sparkles, 
  TrendingDown, 
  Calendar, 
  DollarSign, 
  Target,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function DebtRepaymentAnalysis({ debts }) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [extraPayment, setExtraPayment] = useState(0);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('analyzeDebtRepayment', {
        debts: debts.map(d => ({
          name: d.name,
          type: d.type,
          current_balance: d.current_balance,
          interest_rate: d.interest_rate,
          minimum_payment: d.minimum_payment
        })),
        monthly_extra_payment: parseFloat(extraPayment) || 0
      });
      setAnalysis(data);
    } catch (error) {
      console.error('Error analyzing debts:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalDebt = debts.reduce((sum, d) => sum + d.current_balance, 0);
  const totalMinimum = debts.reduce((sum, d) => sum + d.minimum_payment, 0);

  return (
    <div className="space-y-6">
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Sparkles className="w-5 h-5 text-blue-600" />
            AI Debt Repayment Optimizer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border">
              <p className="text-sm text-gray-600">Total Debt</p>
              <p className="text-2xl font-bold text-red-600">${totalDebt.toFixed(2)}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <p className="text-sm text-gray-600">Monthly Minimum</p>
              <p className="text-2xl font-bold text-gray-900">${totalMinimum.toFixed(2)}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <Label className="text-sm text-gray-600">Extra Payment/Month</Label>
              <Input
                type="number"
                value={extraPayment}
                onChange={(e) => setExtraPayment(e.target.value)}
                placeholder="$0"
                className="mt-1"
              />
            </div>
          </div>

          <Button 
            onClick={handleAnalyze} 
            disabled={loading || debts.length === 0}
            className="w-full bg-blue-800 hover:bg-blue-900"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Optimal Repayment Strategy
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {analysis && (
        <>
          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-900">
                <Target className="w-5 h-5 text-green-600" />
                Recommended Strategy: {analysis.recommended_strategy?.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">{analysis.recommended_strategy?.reasoning}</p>
              
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-green-600" />
                    <p className="text-sm text-gray-600">Time to Freedom</p>
                  </div>
                  <p className="text-xl font-bold text-green-600">
                    {Math.floor(analysis.recommended_strategy?.months_to_freedom / 12)} years {analysis.recommended_strategy?.months_to_freedom % 12} months
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <p className="text-sm text-gray-600">Interest Saved</p>
                  </div>
                  <p className="text-xl font-bold text-green-600">
                    ${analysis.recommended_strategy?.total_interest_saved?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingDown className="w-4 h-4 text-green-600" />
                    <p className="text-sm text-gray-600">Debts to Clear</p>
                  </div>
                  <p className="text-xl font-bold text-green-600">{debts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Plan & Payoff Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {analysis.payment_plan?.map((plan, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-lg border">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-blue-600"># {plan.priority_order}</Badge>
                      <div>
                        <h3 className="font-semibold text-gray-900">{plan.debt_name}</h3>
                        <p className="text-sm text-gray-600">Monthly Payment: ${plan.monthly_payment?.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Payoff Date</p>
                      <p className="font-semibold text-green-600">{plan.payoff_date}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <p className="text-gray-600">Total Interest: ${plan.total_interest?.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Strategy Comparison</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-3">Snowball Method</h3>
                  <p className="text-sm text-gray-600 mb-2">Pay smallest balances first</p>
                  <div className="space-y-1">
                    <p className="text-sm">
                      <span className="text-gray-600">Time: </span>
                      <span className="font-semibold">{analysis.strategy_comparison?.snowball?.months_to_freedom} months</span>
                    </p>
                    <p className="text-sm">
                      <span className="text-gray-600">Interest: </span>
                      <span className="font-semibold">${analysis.strategy_comparison?.snowball?.total_interest?.toFixed(2)}</span>
                    </p>
                  </div>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h3 className="font-semibold text-purple-900 mb-3">Avalanche Method</h3>
                  <p className="text-sm text-gray-600 mb-2">Pay highest interest rates first</p>
                  <div className="space-y-1">
                    <p className="text-sm">
                      <span className="text-gray-600">Time: </span>
                      <span className="font-semibold">{analysis.strategy_comparison?.avalanche?.months_to_freedom} months</span>
                    </p>
                    <p className="text-sm">
                      <span className="text-gray-600">Interest: </span>
                      <span className="font-semibold">${analysis.strategy_comparison?.avalanche?.total_interest?.toFixed(2)}</span>
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {analysis.milestones && analysis.milestones.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Debt Freedom Milestones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysis.milestones.map((milestone, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-16 text-center">
                        <p className="text-sm font-semibold text-blue-600">Month {milestone.month}</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{milestone.event}</p>
                        <p className="text-sm text-gray-600">Remaining debt: ${milestone.remaining_debt?.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {analysis.key_insights && analysis.key_insights.length > 0 && (
            <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-900">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  Key Insights & Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.key_insights.map((insight, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-gray-700">{insight}</p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}