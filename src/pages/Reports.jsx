import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart, Pie, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears, parseISO } from 'date-fns';

export default function Reports() {
  const [selectedEntity, setSelectedEntity] = useState('');
  const [reportPeriod, setReportPeriod] = useState('month'); // month, year, custom
  const [timeRange, setTimeRange] = useState('current'); // current, last3, last6, last12

  const { data: entities = [] } = useQuery({
    queryKey: ['entities'],
    queryFn: () => base44.entities.Entity.list(),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list(),
  });

  const { data: debts = [] } = useQuery({
    queryKey: ['debts'],
    queryFn: () => base44.entities.Debt.list(),
  });

  const { data: investmentVehicles = [] } = useQuery({
    queryKey: ['investment-vehicles'],
    queryFn: () => base44.entities.InvestmentVehicle.list(),
  });

  const { data: investmentHoldings = [] } = useQuery({
    queryKey: ['investment-holdings'],
    queryFn: () => base44.entities.InvestmentHolding.list(),
  });

  const financialData = useMemo(() => {
    let filteredTransactions = transactions;
    if (selectedEntity) {
      filteredTransactions = transactions.filter(t => t.entity_id === selectedEntity);
    }

    const now = new Date();
    let startDate, endDate;

    if (reportPeriod === 'month') {
      if (timeRange === 'current') {
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
      }
    } else if (reportPeriod === 'year') {
      if (timeRange === 'current') {
        startDate = startOfYear(now);
        endDate = endOfYear(now);
      }
    }

    // Filter by date range
    const periodTransactions = filteredTransactions.filter(t => {
      const txDate = parseISO(t.date);
      return (!startDate || txDate >= startDate) && (!endDate || txDate <= endDate);
    });

    // Calculate totals
    const income = periodTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expenses = periodTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const net = income - expenses;

    // Category breakdown
    const categoryMap = new Map();
    categories.forEach(cat => categoryMap.set(cat.id, cat.name));

    const categoryData = periodTransactions
      .filter(t => t.type === 'expense' && t.category_id)
      .reduce((acc, t) => {
        const catName = categoryMap.get(t.category_id) || 'Uncategorized';
        acc[catName] = (acc[catName] || 0) + Number(t.amount);
        return acc;
      }, {});

    const categoryChartData = Object.entries(categoryData)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // Monthly trends (last 12 months)
    const monthlyData = [];
    for (let i = 11; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      const monthTx = filteredTransactions.filter(t => {
        const txDate = parseISO(t.date);
        return txDate >= monthStart && txDate <= monthEnd;
      });

      const monthIncome = monthTx.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
      const monthExpenses = monthTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
      
      monthlyData.push({
        month: format(monthDate, 'MMM yyyy'),
        income: monthIncome,
        expenses: monthExpenses,
        net: monthIncome - monthExpenses
      });
    }

    // Net worth calculation
    const totalDebt = debts
      .filter(d => !selectedEntity || d.entity_id === selectedEntity)
      .filter(d => d.is_active)
      .reduce((sum, d) => sum + Number(d.current_balance), 0);

    const totalInvestments = investmentHoldings
      .filter(h => {
        const vehicle = investmentVehicles.find(v => v.id === h.vehicle_id);
        return !selectedEntity || vehicle?.entity_id === selectedEntity;
      })
      .reduce((sum, h) => {
        const currentValue = Number(h.quantity) * (Number(h.current_price) || 0);
        return sum + currentValue;
      }, 0);

    const netWorth = totalInvestments - totalDebt;

    return {
      income,
      expenses,
      net,
      categoryChartData,
      monthlyData,
      totalDebt,
      totalInvestments,
      netWorth,
      transactionCount: periodTransactions.length
    };
  }, [transactions, categories, debts, investmentVehicles, investmentHoldings, selectedEntity, reportPeriod, timeRange]);

  const COLORS = ['#1e40af', '#f59e0b', '#0f172a', '#3b82f6', '#fbbf24', '#475569', '#60a5fa', '#fcd34d'];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Financial Reports</h1>
            <p className="text-gray-600 mt-1">Insights into your financial habits</p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Entity</label>
            <Select value={selectedEntity} onValueChange={setSelectedEntity}>
              <SelectTrigger>
                <SelectValue placeholder="All Entities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>All Entities</SelectItem>
                {entities.map(entity => (
                  <SelectItem key={entity.id} value={entity.id}>{entity.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Period</label>
            <Select value={reportPeriod} onValueChange={setReportPeriod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Monthly</SelectItem>
                <SelectItem value="year">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Current {reportPeriod === 'month' ? 'Month' : 'Year'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Income</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-green-600">
                  ${financialData.income.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-red-600">
                  ${financialData.expenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <TrendingDown className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Net Income</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className={`text-2xl font-bold ${financialData.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${financialData.net.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <DollarSign className="w-8 h-8 text-blue-800" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-blue-800">
                  {financialData.transactionCount}
                </div>
                <Calendar className="w-8 h-8 text-blue-800" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Category Breakdown */}
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Expense Breakdown by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {financialData.categoryChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={financialData.categoryChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {financialData.categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  No expense data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Net Worth */}
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Net Worth Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                  <span className="text-gray-700 font-medium">Investments</span>
                  <span className="text-xl font-bold text-blue-800">
                    ${financialData.totalInvestments.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
                  <span className="text-gray-700 font-medium">Debts</span>
                  <span className="text-xl font-bold text-red-600">
                    ${financialData.totalDebt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-amber-500 to-blue-800 rounded-lg">
                  <span className="text-white font-medium">Net Worth</span>
                  <span className="text-2xl font-bold text-white">
                    ${financialData.netWorth.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Income vs Expenses Trend */}
        <Card className="bg-white mb-8">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">12-Month Income & Expense Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={financialData.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
                <Legend />
                <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} name="Income" />
                <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Expenses" />
                <Line type="monotone" dataKey="net" stroke="#1e40af" strokeWidth={2} name="Net" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Comparison Bar Chart */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Monthly Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={financialData.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
                <Legend />
                <Bar dataKey="income" fill="#10b981" name="Income" />
                <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}