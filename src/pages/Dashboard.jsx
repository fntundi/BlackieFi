import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUpCircle, ArrowDownCircle, CreditCard, TrendingUp, Calendar, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [selectedEntity, setSelectedEntity] = useState('all');

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: entities = [] } = useQuery({
    queryKey: ['entities'],
    queryFn: () => base44.entities.Entity.list(),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', selectedEntity],
    queryFn: async () => {
      if (selectedEntity === 'all') {
        return await base44.entities.Transaction.list('-date', 100);
      }
      return await base44.entities.Transaction.filter({ entity_id: selectedEntity }, '-date', 100);
    },
  });

  const { data: debts = [] } = useQuery({
    queryKey: ['debts', selectedEntity],
    queryFn: async () => {
      if (selectedEntity === 'all') {
        return await base44.entities.Debt.filter({ is_active: true });
      }
      return await base44.entities.Debt.filter({ entity_id: selectedEntity, is_active: true });
    },
  });

  const { data: recurringTransactions = [] } = useQuery({
    queryKey: ['recurring', selectedEntity],
    queryFn: async () => {
      if (selectedEntity === 'all') {
        return await base44.entities.RecurringTransaction.filter({ is_active: true }, 'next_date', 10);
      }
      return await base44.entities.RecurringTransaction.filter({ 
        entity_id: selectedEntity, 
        is_active: true 
      }, 'next_date', 10);
    },
  });

  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthTransactions = transactions.filter(t => t.date?.startsWith(currentMonth));
  
  const totalIncome = monthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  
  const totalExpenses = monthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  
  const totalDebt = debts.reduce((sum, d) => sum + (d.current_balance || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 mt-1">Welcome back, {user?.full_name}</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedEntity} onValueChange={setSelectedEntity}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {entities.map(entity => (
                  <SelectItem key={entity.id} value={entity.id}>
                    {entity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Income (This Month)</CardTitle>
              <ArrowUpCircle className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">${totalIncome.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Expenses (This Month)</CardTitle>
              <ArrowDownCircle className="w-4 h-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">${totalExpenses.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Net This Month</CardTitle>
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totalIncome - totalExpenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${(totalIncome - totalExpenses).toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Debt</CardTitle>
              <CreditCard className="w-4 h-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">${totalDebt.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link to={createPageUrl('Transactions')}>
              <Button variant="outline" className="w-full bg-slate-900 text-amber-400 border-slate-700 hover:bg-slate-800 hover:border-amber-500">
                <Plus className="w-4 h-4 mr-2" />
                Add Transaction
              </Button>
            </Link>
            <Link to={createPageUrl('RecurringTransactions')}>
              <Button variant="outline" className="w-full bg-blue-600 text-white border-blue-500 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Recurring
              </Button>
            </Link>
            <Link to={createPageUrl('Debts')}>
              <Button variant="outline" className="w-full bg-slate-900 text-amber-400 border-slate-700 hover:bg-slate-800 hover:border-amber-500">
                <Plus className="w-4 h-4 mr-2" />
                Add Debt
              </Button>
            </Link>
            <Link to={createPageUrl('Calendar')}>
              <Button variant="outline" className="w-full bg-blue-600 text-white border-blue-500 hover:bg-blue-700">
                <Calendar className="w-4 h-4 mr-2" />
                View Calendar
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Upcoming Payments */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recurringTransactions.slice(0, 5).map(rt => (
                <div key={rt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{rt.name}</p>
                    <p className="text-sm text-gray-500">{rt.next_date}</p>
                  </div>
                  <div className={`font-semibold ${rt.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {rt.type === 'income' ? '+' : '-'}${rt.amount?.toFixed(2)}
                  </div>
                </div>
              ))}
              {recurringTransactions.length === 0 && (
                <p className="text-center text-gray-500 py-4">No upcoming payments</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {transactions.slice(0, 10).map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 border-b last:border-b-0">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{t.description}</p>
                    <p className="text-sm text-gray-500">{t.date}</p>
                  </div>
                  <div className={`font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.type === 'income' ? '+' : '-'}${t.amount?.toFixed(2)}
                  </div>
                </div>
              ))}
              {transactions.length === 0 && (
                <p className="text-center text-gray-500 py-4">No transactions yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}