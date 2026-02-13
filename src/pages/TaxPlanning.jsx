import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calculator, 
  FileText, 
  TrendingDown, 
  Lightbulb,
  Loader2,
  Download,
  Plus,
  DollarSign,
  Percent
} from 'lucide-react';
import { toast } from 'sonner';

export default function TaxPlanning() {
  const [selectedEntity, setSelectedEntity] = useState('');
  const [taxYear, setTaxYear] = useState(new Date().getFullYear());
  const [filingStatus, setFilingStatus] = useState('single');
  const [loading, setLoading] = useState(false);
  const [estimateData, setEstimateData] = useState(null);
  const [showScenarioDialog, setShowScenarioDialog] = useState(false);
  const [scenarioAdjustments, setScenarioAdjustments] = useState({
    increased_retirement_contribution: '',
    charitable_donations: '',
    business_expense_optimization: ''
  });
  const [scenarioName, setScenarioName] = useState('');

  const queryClient = useQueryClient();

  const { data: entities = [] } = useQuery({
    queryKey: ['entities'],
    queryFn: () => base44.entities.Entity.list(),
  });

  const { data: scenarios = [] } = useQuery({
    queryKey: ['tax-scenarios', selectedEntity, taxYear],
    queryFn: () => selectedEntity 
      ? base44.entities.TaxScenario.filter({ entity_id: selectedEntity, tax_year: taxYear })
      : [],
    enabled: !!selectedEntity
  });

  const createScenarioMutation = useMutation({
    mutationFn: (data) => base44.entities.TaxScenario.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tax-scenarios']);
      toast.success('Scenario saved');
    },
  });

  const estimateTax = async () => {
    if (!selectedEntity) {
      toast.error('Please select an entity');
      return;
    }

    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('estimateTaxLiability', {
        entity_id: selectedEntity,
        tax_year: taxYear,
        filing_status: filingStatus
      });

      setEstimateData(data);

      const baselineExists = scenarios.some(s => s.is_baseline && s.tax_year === taxYear);
      if (!baselineExists) {
        await createScenarioMutation.mutateAsync({
          entity_id: selectedEntity,
          name: 'Current/Baseline',
          tax_year: taxYear,
          filing_status: filingStatus,
          total_income: data.total_income,
          total_deductions: data.total_deductions,
          estimated_tax_liability: data.estimated_tax_liability,
          effective_tax_rate: data.effective_tax_rate,
          potential_deductions: data.potential_deductions || [],
          potential_credits: data.potential_credits || [],
          recommendations: data.recommendations || [],
          is_baseline: true
        });
      }

      toast.success('Tax estimate calculated');
    } catch (error) {
      toast.error('Failed to estimate tax');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const createScenario = async () => {
    if (!scenarioName || !estimateData) return;

    const baselineScenario = scenarios.find(s => s.is_baseline);
    if (!baselineScenario) {
      toast.error('Please run tax estimate first');
      return;
    }

    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('analyzeTaxScenario', {
        baseline_scenario_id: baselineScenario.id,
        adjustments: {
          increased_retirement_contribution: parseFloat(scenarioAdjustments.increased_retirement_contribution) || 0,
          charitable_donations: parseFloat(scenarioAdjustments.charitable_donations) || 0,
          business_expense_optimization: parseFloat(scenarioAdjustments.business_expense_optimization) || 0
        }
      });

      await createScenarioMutation.mutateAsync({
        entity_id: selectedEntity,
        name: scenarioName,
        tax_year: taxYear,
        filing_status: filingStatus,
        total_income: estimateData.total_income,
        total_deductions: estimateData.total_deductions + 
          (parseFloat(scenarioAdjustments.increased_retirement_contribution) || 0) +
          (parseFloat(scenarioAdjustments.charitable_donations) || 0) +
          (parseFloat(scenarioAdjustments.business_expense_optimization) || 0),
        estimated_tax_liability: data.new_tax_liability,
        effective_tax_rate: data.new_effective_rate,
        potential_deductions: estimateData.potential_deductions || [],
        potential_credits: estimateData.potential_credits || [],
        recommendations: data.implementation_steps || [],
        scenario_adjustments: scenarioAdjustments,
        is_baseline: false
      });

      setShowScenarioDialog(false);
      setScenarioName('');
      setScenarioAdjustments({
        increased_retirement_contribution: '',
        charitable_donations: '',
        business_expense_optimization: ''
      });
      toast.success(`Scenario created - Tax savings: $${data.total_tax_savings.toFixed(2)}`);
    } catch (error) {
      toast.error('Failed to create scenario');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const downloadTaxReport = async () => {
    if (!selectedEntity) return;

    try {
      const { data } = await base44.functions.invoke('generateTaxReport', {
        entity_id: selectedEntity,
        tax_year: taxYear
      });

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tax-report-${taxYear}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('Tax report downloaded');
    } catch (error) {
      toast.error('Failed to generate report');
      console.error(error);
    }
  };

  const baselineScenario = scenarios.find(s => s.is_baseline);
  const alternativeScenarios = scenarios.filter(s => !s.is_baseline);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tax Planning</h1>
            <p className="text-gray-500 mt-1">AI-powered tax estimation and optimization</p>
          </div>
          <Button onClick={downloadTaxReport} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download Report
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tax Estimate Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Entity</Label>
                <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select entity" />
                  </SelectTrigger>
                  <SelectContent>
                    {entities.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tax Year</Label>
                <Select value={String(taxYear)} onValueChange={(v) => setTaxYear(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2026, 2025, 2024, 2023].map(year => (
                      <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Filing Status</Label>
                <Select value={filingStatus} onValueChange={setFilingStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="married_filing_jointly">Married Filing Jointly</SelectItem>
                    <SelectItem value="married_filing_separately">Married Filing Separately</SelectItem>
                    <SelectItem value="head_of_household">Head of Household</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={estimateTax} disabled={loading} className="w-full bg-blue-800 hover:bg-blue-900">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <Calculator className="w-4 h-4 mr-2" />
                  Estimate Tax Liability
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {estimateData && (
          <>
            <div className="grid md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Income</p>
                      <p className="text-2xl font-bold text-green-600">
                        ${estimateData.total_income?.toLocaleString()}
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Est. Tax Liability</p>
                      <p className="text-2xl font-bold text-red-600">
                        ${estimateData.estimated_tax_liability?.toLocaleString()}
                      </p>
                    </div>
                    <FileText className="w-8 h-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Effective Rate</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {estimateData.effective_tax_rate?.toFixed(2)}%
                      </p>
                    </div>
                    <Percent className="w-8 h-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Deductions</p>
                      <p className="text-2xl font-bold text-blue-600">
                        ${estimateData.total_deductions?.toLocaleString()}
                      </p>
                    </div>
                    <TrendingDown className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="deductions" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="deductions">Deductions</TabsTrigger>
                <TabsTrigger value="credits">Credits</TabsTrigger>
                <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
              </TabsList>

              <TabsContent value="deductions" className="space-y-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Potential Tax Deductions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {estimateData.potential_deductions?.map((deduction, idx) => (
                      <div key={idx} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold text-blue-900">{deduction.name}</p>
                            <Badge className="mt-1">{deduction.category}</Badge>
                          </div>
                          <p className="text-lg font-bold text-blue-600">
                            ${deduction.amount?.toLocaleString()}
                          </p>
                        </div>
                        <p className="text-sm text-blue-800">{deduction.description}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="credits" className="space-y-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Potential Tax Credits</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {estimateData.potential_credits?.map((credit, idx) => (
                      <div key={idx} className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-semibold text-green-900">{credit.name}</p>
                          <p className="text-lg font-bold text-green-600">
                            ${credit.amount?.toLocaleString()}
                          </p>
                        </div>
                        <p className="text-sm text-green-800">{credit.description}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="recommendations" className="space-y-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-yellow-600" />
                      Tax Optimization Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {estimateData.recommendations?.map((rec, idx) => (
                      <div key={idx} className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <p className="text-sm text-yellow-900">{idx + 1}. {rec}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Tax Scenarios</CardTitle>
                  <Dialog open={showScenarioDialog} onOpenChange={setShowScenarioDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Scenario
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Tax Scenario</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Scenario Name</Label>
                          <Input
                            value={scenarioName}
                            onChange={(e) => setScenarioName(e.target.value)}
                            placeholder="e.g., Optimized Plan"
                          />
                        </div>
                        <div>
                          <Label>Increased Retirement Contribution ($)</Label>
                          <Input
                            type="number"
                            value={scenarioAdjustments.increased_retirement_contribution}
                            onChange={(e) => setScenarioAdjustments({
                              ...scenarioAdjustments,
                              increased_retirement_contribution: e.target.value
                            })}
                          />
                        </div>
                        <div>
                          <Label>Charitable Donations ($)</Label>
                          <Input
                            type="number"
                            value={scenarioAdjustments.charitable_donations}
                            onChange={(e) => setScenarioAdjustments({
                              ...scenarioAdjustments,
                              charitable_donations: e.target.value
                            })}
                          />
                        </div>
                        <div>
                          <Label>Business Expense Optimization ($)</Label>
                          <Input
                            type="number"
                            value={scenarioAdjustments.business_expense_optimization}
                            onChange={(e) => setScenarioAdjustments({
                              ...scenarioAdjustments,
                              business_expense_optimization: e.target.value
                            })}
                          />
                        </div>
                        <Button onClick={createScenario} className="w-full">
                          Analyze Scenario
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {baselineScenario && (
                    <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-300">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{baselineScenario.name}</p>
                          <Badge>Baseline</Badge>
                        </div>
                        <p className="text-lg font-bold text-red-600">
                          ${baselineScenario.estimated_tax_liability?.toLocaleString()}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600">
                        Effective Rate: {baselineScenario.effective_tax_rate?.toFixed(2)}%
                      </p>
                    </div>
                  )}
                  {alternativeScenarios.map(scenario => {
                    const savings = baselineScenario 
                      ? baselineScenario.estimated_tax_liability - scenario.estimated_tax_liability
                      : 0;
                    return (
                      <div key={scenario.id} className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-green-900">{scenario.name}</p>
                          <div className="text-right">
                            <p className="text-lg font-bold text-green-600">
                              ${scenario.estimated_tax_liability?.toLocaleString()}
                            </p>
                            {savings > 0 && (
                              <p className="text-xs text-green-700">
                                Save ${savings.toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-green-800">
                          Effective Rate: {scenario.effective_tax_rate?.toFixed(2)}%
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="pt-6">
            <p className="text-sm text-amber-900">
              <strong>Disclaimer:</strong> This tool provides AI-powered tax estimates for planning purposes only. 
              It is not a substitute for professional tax advice. Please consult with a qualified CPA or tax 
              professional for official tax preparation and filing.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}