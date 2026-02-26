import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import { useEntity } from '../contexts/EntityContext';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Target,
  PieChart,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

export default function Dashboard() {
  const { selectedEntityId } = useEntity();

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', selectedEntityId],
    queryFn: () => api.getAccounts({ entity_id: selectedEntityId }),
    enabled: !!selectedEntityId,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', selectedEntityId],
    queryFn: () => api.getTransactions({ entity_id: selectedEntityId, limit: 10 }),
    enabled: !!selectedEntityId,
  });

  const { data: debts = [] } = useQuery({
    queryKey: ['debts', selectedEntityId],
    queryFn: () => api.getDebts({ entity_id: selectedEntityId }),
    enabled: !!selectedEntityId,
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['goals', selectedEntityId],
    queryFn: () => api.getGoals({ entity_id: selectedEntityId, status: 'active' }),
    enabled: !!selectedEntityId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', selectedEntityId],
    queryFn: () => api.getCategories({ entity_id: selectedEntityId }),
    enabled: !!selectedEntityId,
  });

  // Calculate totals
  const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance || 0), 0);
  const totalDebt = debts.reduce((sum, d) => sum + parseFloat(d.current_balance || 0), 0);
  const netWorth = totalBalance - totalDebt;

  // Income/expense this month
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthlyTransactions = transactions.filter(t => t.date?.startsWith(thisMonth));
  const monthlyIncome = monthlyTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  const monthlyExpenses = monthlyTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

  // Goals progress
  const goalsProgress = goals.reduce((sum, g) => sum + (g.current_amount / g.target_amount), 0) / (goals.length || 1) * 100;

  const getCategoryName = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat?.name || 'Uncategorized';
  };

  return (
    <div className="page-container animate-fade-in" data-testid="dashboard">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 mt-1">Your financial overview at a glance</p>
        </div>

        {/* Stats Grid */}
        <div className="grid-4 mb-8">
          <div className="stat-card" data-testid="stat-net-worth">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-500/10 rounded-lg">
                <DollarSign className="w-6 h-6 text-emerald-500" />
              </div>
              {netWorth >= 0 ? (
                <ArrowUpRight className="w-5 h-5 text-emerald-500" />
              ) : (
                <ArrowDownRight className="w-5 h-5 text-red-500" />
              )}
            </div>
            <p className={`stat-value ${netWorth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              ${Math.abs(netWorth).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="stat-label">Net Worth</p>
          </div>

          <div className="stat-card" data-testid="stat-income">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-cyan-500/10 rounded-lg">
                <TrendingUp className="w-6 h-6 text-cyan-500" />
              </div>
              <span className="text-xs text-slate-500">This month</span>
            </div>
            <p className="stat-value text-cyan-500">
              ${monthlyIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="stat-label">Income</p>
          </div>

          <div className="stat-card" data-testid="stat-expenses">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-500/10 rounded-lg">
                <TrendingDown className="w-6 h-6 text-red-500" />
              </div>
              <span className="text-xs text-slate-500">This month</span>
            </div>
            <p className="stat-value text-red-500">
              ${monthlyExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="stat-label">Expenses</p>
          </div>

          <div className="stat-card" data-testid="stat-debt">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-amber-500/10 rounded-lg">
                <CreditCard className="w-6 h-6 text-amber-500" />
              </div>
            </div>
            <p className="stat-value text-amber-500">
              ${totalDebt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="stat-label">Total Debt</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Transactions */}
          <div className="lg:col-span-2 card" data-testid="recent-transactions">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Recent Transactions</h2>
              <a href="/transactions" className="text-emerald-500 text-sm hover:text-emerald-400">
                View all →
              </a>
            </div>
            <div className="space-y-3">
              {transactions.slice(0, 5).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${tx.type === 'income' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                      {tx.type === 'income' ? (
                        <TrendingUp className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-white">{tx.description || 'Transaction'}</p>
                      <p className="text-sm text-slate-500">{getCategoryName(tx.category_id)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-mono font-semibold ${tx.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
                      {tx.type === 'income' ? '+' : '-'}${parseFloat(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-slate-500">{tx.date}</p>
                  </div>
                </div>
              ))}
              {transactions.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  No transactions yet
                </div>
              )}
            </div>
          </div>

          {/* Goals Progress */}
          <div className="card" data-testid="goals-progress">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Financial Goals</h2>
              <Target className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="space-y-4">
              {goals.slice(0, 4).map((goal) => {
                const progress = (goal.current_amount / goal.target_amount) * 100;
                return (
                  <div key={goal.id}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-white font-medium">{goal.name}</span>
                      <span className="text-slate-400">{progress.toFixed(0)}%</span>
                    </div>
                    <div className="progress">
                      <div className="progress-bar" style={{ width: `${Math.min(progress, 100)}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>${parseFloat(goal.current_amount).toLocaleString()}</span>
                      <span>${parseFloat(goal.target_amount).toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
              {goals.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  No active goals
                </div>
              )}
            </div>
            <a
              href="/goals"
              className="block mt-6 text-center text-emerald-500 text-sm hover:text-emerald-400"
            >
              Manage goals →
            </a>
          </div>
        </div>

        {/* Accounts Overview */}
        <div className="mt-6 card" data-testid="accounts-overview">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Accounts</h2>
            <a href="/accounts" className="text-emerald-500 text-sm hover:text-emerald-400">
              Manage accounts →
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-emerald-500/50 transition-colors"
              >
                <p className="text-sm text-slate-400 capitalize">{account.type}</p>
                <p className="font-medium text-white mt-1">{account.name}</p>
                <p className={`font-mono text-lg font-semibold mt-2 ${parseFloat(account.balance) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  ${parseFloat(account.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            ))}
            {accounts.length === 0 && (
              <div className="col-span-4 text-center py-8 text-slate-500">
                No accounts yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
