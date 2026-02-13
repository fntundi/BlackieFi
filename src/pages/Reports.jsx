import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  FileText, 
  Download, 
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Save,
  Star,
  X
} from 'lucide-react';
import { toast } from 'sonner';

export default function Reports() {
  const [reportType, setReportType] = useState('profit_loss');
  const [selectedEntity, setSelectedEntity] = useState('');
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [advancedFilters, setAdvancedFilters] = useState({
    category_id: '',
    account_id: '',
    transaction_tags: [],
    linked_asset_id: '',
    linked_inventory_id: '',
    min_amount: '',
    max_amount: ''
  });

  const queryClient = useQueryClient();

  const { data: entities = [] } = useQuery({
    queryKey: ['entities'],
    queryFn: () => base44.entities.Entity.list(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list(),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => base44.entities.Account.filter({ is_active: true }),
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: () => base44.entities.Asset.filter({ is_active: true }),
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => base44.entities.Inventory.filter({ is_active: true }),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list(),
  });

  const { data: presets = [] } = useQuery({
    queryKey: ['report-presets'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.ReportFilterPreset.filter({ user_email: user.email });
    },
  });

  const allTags = useMemo(() => {
    const tagSet = new Set();
    transactions.forEach(t => {
      (t.ai_tags || []).forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [transactions]);

  const savePresetMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      return base44.entities.ReportFilterPreset.create({
        user_email: user.email,
        ...data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['report-presets']);
      setShowSavePreset(false);
      setPresetName('');
      toast.success('Filter preset saved');
    },
  });

  const deletePresetMutation = useMutation({
    mutationFn: (id) => base44.entities.ReportFilterPreset.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['report-presets']);
      toast.success('Preset deleted');
    },
  });

  const loadPreset = (preset) => {
    setSelectedEntity(preset.filters.entity_id || '');
    setStartDate(preset.filters.start_date || startDate);
    setEndDate(preset.filters.end_date || endDate);
    setReportType(preset.report_type);
    setAdvancedFilters({
      category_id: preset.filters.category_id || '',
      account_id: preset.filters.account_id || '',
      transaction_tags: preset.filters.transaction_tags || [],
      linked_asset_id: preset.filters.linked_asset_id || '',
      linked_inventory_id: preset.filters.linked_inventory_id || '',
      min_amount: preset.filters.min_amount || '',
      max_amount: preset.filters.max_amount || ''
    });
    toast.success('Preset loaded');
  };

  const saveCurrentAsPreset = () => {
    if (!presetName) {
      toast.error('Please enter a preset name');
      return;
    }
    savePresetMutation.mutate({
      name: presetName,
      report_type: reportType,
      filters: {
        entity_id: selectedEntity,
        start_date: startDate,
        end_date: endDate,
        ...advancedFilters
      }
    });
  };

  const generateReport = async () => {
    if (!selectedEntity) {
      toast.error('Please select an entity');
      return;
    }

    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('generateFinancialReport', {
        report_type: reportType,
        entity_id: selectedEntity,
        start_date: startDate,
        end_date: endDate,
        category_id: advancedFilters.category_id || null
      });
      setReportData(data);
      toast.success('Report generated');
    } catch (error) {
      toast.error('Failed to generate report');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tag) => {
    setAdvancedFilters(prev => ({
      ...prev,
      transaction_tags: prev.transaction_tags.includes(tag)
        ? prev.transaction_tags.filter(t => t !== tag)
        : [...prev.transaction_tags, tag]
    }));
  };

  const exportToPDF = async () => {
    if (!reportData) return;

    setExporting(true);
    try {
      const entityName = entities.find(e => e.id === selectedEntity)?.name || 'All';
      const { data } = await base44.functions.invoke('exportReportPDF', {
        report_type: reportType,
        report_data: reportData.report_data,
        period: reportData.period,
        entity_name: entityName
      });

      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      toast.success('Report exported to PDF');
    } catch (error) {
      toast.error('Failed to export PDF');
      console.error(error);
    } finally {
      setExporting(false);
    }
  };

  const exportToCSV = () => {
    if (!reportData) return;

    let csvContent = '';
    const rd = reportData.report_data;

    if (reportType === 'profit_loss') {
      csvContent = 'Category,Amount\n';
      csvContent += 'INCOME\n';
      Object.entries(rd.income || {}).forEach(([cat, amt]) => {
        csvContent += `${cat},${amt}\n`;
      });
      csvContent += `Total Income,${rd.total_income}\n\n`;
      csvContent += 'EXPENSES\n';
      Object.entries(rd.expenses || {}).forEach(([cat, amt]) => {
        csvContent += `${cat},${amt}\n`;
      });
      csvContent += `Total Expenses,${rd.total_expenses}\n\n`;
      csvContent += `Net Income,${rd.net_income}\n`;
    } else if (reportType === 'balance_sheet') {
      csvContent = 'Type,Item,Amount\n';
      csvContent += 'ASSETS\n';
      Object.entries(rd.assets || {}).forEach(([type, amt]) => {
        csvContent += `Asset,${type},${amt}\n`;
      });
      csvContent += `,,${rd.total_assets}\n\n`;
      csvContent += 'LIABILITIES\n';
      Object.entries(rd.liabilities || {}).forEach(([type, amt]) => {
        csvContent += `Liability,${type},${amt}\n`;
      });
      csvContent += `,,${rd.total_liabilities}\n\n`;
      csvContent += `Equity,,${rd.equity}\n`;
    } else if (reportType === 'cash_flow') {
      csvContent = 'Month,Cash In,Cash Out,Net Cash Flow\n';
      Object.entries(rd.monthly_cash_flow || {}).forEach(([month, data]) => {
        csvContent += `${month},${data.income},${data.expenses},${data.net}\n`;
      });
      csvContent += `\nTotal,${rd.total_cash_in},${rd.total_cash_out},${rd.net_cash_flow}\n`;
    } else if (reportType === 'budget_vs_actual') {
      csvContent = 'Category,Budgeted,Actual,Variance,Variance %\n';
      (rd.categories || []).forEach(cat => {
        csvContent += `${cat.category_name},${cat.budgeted},${cat.actual},${cat.variance},${cat.variance_percent.toFixed(2)}\n`;
      });
      csvContent += `\nTotal,${rd.total_budgeted},${rd.total_actual},${rd.total_variance}\n`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    
    toast.success('Report exported to CSV');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financial Reports</h1>
          <p className="text-gray-500 mt-1">Generate comprehensive financial statements and analysis</p>
        </div>

        {presets.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Saved Filter Presets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {presets.map(preset => (
                  <div key={preset.id} className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => loadPreset(preset)}
                      className="text-blue-800 hover:text-blue-900"
                    >
                      <Star className="w-4 h-4 mr-1" />
                      {preset.name}
                    </Button>
                    <button
                      onClick={() => deletePresetMutation.mutate(preset.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Report Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label>Report Type</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="profit_loss">Profit & Loss Statement</SelectItem>
                    <SelectItem value="balance_sheet">Balance Sheet</SelectItem>
                    <SelectItem value="cash_flow">Cash Flow Statement</SelectItem>
                    <SelectItem value="budget_vs_actual">Budget vs Actual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Advanced Filters</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label>Category</Label>
                  <Select value={advancedFilters.category_id} onValueChange={(v) => setAdvancedFilters({...advancedFilters, category_id: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>All Categories</SelectItem>
                      {categories.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Account</Label>
                  <Select value={advancedFilters.account_id} onValueChange={(v) => setAdvancedFilters({...advancedFilters, account_id: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="All accounts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>All Accounts</SelectItem>
                      {accounts.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Linked Asset</Label>
                  <Select value={advancedFilters.linked_asset_id} onValueChange={(v) => setAdvancedFilters({...advancedFilters, linked_asset_id: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="All assets" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>All Assets</SelectItem>
                      {assets.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Linked Inventory</Label>
                  <Select value={advancedFilters.linked_inventory_id} onValueChange={(v) => setAdvancedFilters({...advancedFilters, linked_inventory_id: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="All inventory" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>All Inventory</SelectItem>
                      {inventory.map(i => (
                        <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Min Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={advancedFilters.min_amount}
                    onChange={(e) => setAdvancedFilters({...advancedFilters, min_amount: e.target.value})}
                    placeholder="Min amount"
                  />
                </div>

                <div>
                  <Label>Max Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={advancedFilters.max_amount}
                    onChange={(e) => setAdvancedFilters({...advancedFilters, max_amount: e.target.value})}
                    placeholder="Max amount"
                  />
                </div>
              </div>

              {allTags.length > 0 && (
                <div className="mt-4">
                  <Label className="mb-2 block">Transaction Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {allTags.map(tag => (
                      <Badge
                        key={tag}
                        variant={advancedFilters.transaction_tags.includes(tag) ? "default" : "outline"}
                        className={`cursor-pointer ${
                          advancedFilters.transaction_tags.includes(tag)
                            ? 'bg-blue-800 text-white'
                            : 'hover:bg-gray-100'
                        }`}
                        onClick={() => toggleTag(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button onClick={generateReport} disabled={loading} className="bg-blue-800 hover:bg-blue-900">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Report
                  </>
                )}
              </Button>

              {reportData && (
                <>
                  <Button onClick={exportToCSV} variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button onClick={exportToPDF} disabled={exporting} variant="outline">
                    {exporting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Export PDF
                      </>
                    )}
                  </Button>
                </>
              )}

              <Dialog open={showSavePreset} onOpenChange={setShowSavePreset}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Save className="w-4 h-4 mr-2" />
                    Save as Preset
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Save Filter Preset</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Preset Name</Label>
                      <Input
                        value={presetName}
                        onChange={(e) => setPresetName(e.target.value)}
                        placeholder="e.g., Monthly Expenses Report"
                      />
                    </div>
                    <Button onClick={saveCurrentAsPreset} className="w-full">
                      Save Preset
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {reportData && (
          <>
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Report Generated</span>
                  <span className="text-sm font-normal text-gray-600">
                    {reportData.period.start_date} to {reportData.period.end_date}
                  </span>
                </CardTitle>
              </CardHeader>
            </Card>

            {reportData.report_type === 'profit_loss' && (
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-900">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      Income
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Object.entries(reportData.report_data.income || {}).map(([cat, amt]) => (
                      <div key={cat} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <span className="font-medium">{cat}</span>
                        <span className="font-semibold text-green-600">${amt.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center p-4 bg-green-600 text-white rounded-lg font-bold">
                      <span>Total Income</span>
                      <span>${reportData.report_data.total_income.toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-900">
                      <TrendingDown className="w-5 h-5 text-red-600" />
                      Expenses
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Object.entries(reportData.report_data.expenses || {}).map(([cat, amt]) => (
                      <div key={cat} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                        <span className="font-medium">{cat}</span>
                        <span className="font-semibold text-red-600">${amt.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center p-4 bg-red-600 text-white rounded-lg font-bold">
                      <span>Total Expenses</span>
                      <span>${reportData.report_data.total_expenses.toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2 border-2 border-blue-800">
                  <CardContent className="pt-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-6 bg-gradient-to-r from-amber-500 to-blue-800 rounded-lg">
                        <div className="text-white">
                          <p className="text-lg font-medium">Net Income</p>
                          <p className="text-sm opacity-90">Profit Margin: {reportData.report_data.profit_margin.toFixed(2)}%</p>
                        </div>
                        <div className="text-4xl font-bold text-white">
                          ${reportData.report_data.net_income.toFixed(2)}
                        </div>
                      </div>
                      {reportData.report_data.ebitda !== undefined && (
                        <div className="flex items-center justify-between p-6 bg-gradient-to-r from-green-500 to-green-700 rounded-lg">
                          <div className="text-white">
                            <p className="text-lg font-medium">EBITDA</p>
                            <p className="text-sm opacity-90">EBITDA Margin: {reportData.report_data.ebitda_margin.toFixed(2)}%</p>
                          </div>
                          <div className="text-4xl font-bold text-white">
                            ${reportData.report_data.ebitda.toFixed(2)}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {reportData.report_type === 'balance_sheet' && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-blue-900">Assets</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {Object.entries(reportData.report_data.assets || {}).map(([type, amt]) => (
                        <div key={type} className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                          <span className="font-medium capitalize">{type.replace(/_/g, ' ')}</span>
                          <span className="font-semibold text-blue-600">${amt.toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center p-4 bg-blue-600 text-white rounded-lg font-bold">
                        <span>Total Assets</span>
                        <span>${reportData.report_data.total_assets.toFixed(2)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-red-900">Liabilities</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {Object.entries(reportData.report_data.liabilities || {}).map(([type, amt]) => (
                        <div key={type} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                          <span className="font-medium capitalize">{type.replace(/_/g, ' ')}</span>
                          <span className="font-semibold text-red-600">${amt.toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center p-4 bg-red-600 text-white rounded-lg font-bold">
                        <span>Total Liabilities</span>
                        <span>${reportData.report_data.total_liabilities.toFixed(2)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-2 border-green-600">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between p-6 bg-gradient-to-r from-green-500 to-green-700 rounded-lg">
                      <div className="text-white">
                        <p className="text-lg font-medium">Owner's Equity</p>
                        <p className="text-sm opacity-90">Debt-to-Equity: {reportData.report_data.debt_to_equity_ratio.toFixed(2)}</p>
                      </div>
                      <div className="text-4xl font-bold text-white">
                        ${reportData.report_data.equity.toFixed(2)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {reportData.report_type === 'cash_flow' && (
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Cash Flow</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(reportData.report_data.monthly_cash_flow || {}).map(([month, data]) => (
                    <div key={month} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-900">{month}</span>
                        <span className={`font-bold ${data.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${data.net.toFixed(2)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Cash In:</span>
                          <span className="text-green-600">${data.income.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Cash Out:</span>
                          <span className="text-red-600">${data.expenses.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="p-6 bg-gradient-to-r from-amber-500 to-blue-800 rounded-lg text-white">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-sm opacity-90">Total In</p>
                        <p className="text-xl font-bold">${reportData.report_data.total_cash_in.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm opacity-90">Total Out</p>
                        <p className="text-xl font-bold">${reportData.report_data.total_cash_out.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm opacity-90">Net Flow</p>
                        <p className="text-xl font-bold">${reportData.report_data.net_cash_flow.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {reportData.report_type === 'budget_vs_actual' && (
              <Card>
                <CardHeader>
                  <CardTitle>Budget vs Actual Comparison</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(reportData.report_data.categories || []).map((cat, idx) => (
                    <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">{cat.category_name}</span>
                        <span className={`font-bold ${cat.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${cat.variance.toFixed(2)} ({cat.variance_percent.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Budgeted:</span>
                          <span>${cat.budgeted.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Actual:</span>
                          <span>${cat.actual.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="p-6 bg-gradient-to-r from-amber-500 to-blue-800 rounded-lg text-white">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-sm opacity-90">Total Budget</p>
                        <p className="text-xl font-bold">${reportData.report_data.total_budgeted.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm opacity-90">Total Actual</p>
                        <p className="text-xl font-bold">${reportData.report_data.total_actual.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm opacity-90">Variance</p>
                        <p className="text-xl font-bold">${reportData.report_data.total_variance.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {!reportData && (
          <Card>
            <CardContent className="py-16">
              <div className="text-center text-gray-500">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium">No report generated yet</p>
                <p className="text-sm">Configure your report parameters above and click "Generate Report"</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}