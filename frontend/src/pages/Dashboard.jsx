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
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  BarChart3
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

  const getCategoryName = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat?.name || 'Uncategorized';
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  return (
    <div className="p-8 animate-fade-in" style={{ background: '#050505', minHeight: '100vh' }} data-testid="dashboard">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#D4AF37' }}>Overview</p>
          <h1 className="text-4xl font-display font-bold" style={{ color: '#F5F5F5' }}>Dashboard</h1>
          <p className="mt-2" style={{ color: '#6E6E6E' }}>Your financial overview at a glance</p>
        </div>

        {/* Stats Grid - Bento style */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {/* Net Worth - Featured */}
          <div className="rounded-2xl p-6 relative overflow-hidden" style={{
            background: 'linear-gradient(135deg, #0F0F0F 0%, #0A0A0A 100%)',
            border: '1px solid rgba(212, 175, 55, 0.2)'
          }} data-testid="stat-net-worth">
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{
              background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)'
            }}></div>
            <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-10" style={{
              background: 'radial-gradient(circle, #D4AF37 0%, transparent 70%)'
            }}></div>
            
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="p-3 rounded-xl" style={{ background: 'rgba(212, 175, 55, 0.1)' }}>
                <DollarSign className="w-6 h-6" style={{ color: '#D4AF37' }} />
              </div>
              {netWorth >= 0 ? (
                <ArrowUpRight className="w-5 h-5" style={{ color: '#059669' }} />
              ) : (
                <ArrowDownRight className="w-5 h-5" style={{ color: '#DC2626' }} />
              )}
            </div>
            <p className="font-mono text-3xl font-bold relative z-10" style={{
              color: netWorth >= 0 ? '#D4AF37' : '#DC2626'
            }}>
              {formatCurrency(Math.abs(netWorth))}
            </p>
            <p className="text-xs font-semibold tracking-widest uppercase mt-2" style={{ color: '#6E6E6E' }}>Net Worth</p>
          </div>

          {/* Income */}
          <div className="rounded-2xl p-6" style={{
            background: '#0A0A0A',
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }} data-testid="stat-income">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl" style={{ background: 'rgba(5, 150, 105, 0.1)' }}>
                <TrendingUp className="w-6 h-6" style={{ color: '#059669' }} />
              </div>
              <span className="text-xs px-2 py-1 rounded-full" style={{ 
                background: 'rgba(5, 150, 105, 0.1)', 
                color: '#059669' 
              }}>This month</span>
            </div>
            <p className="font-mono text-2xl font-bold" style={{ color: '#059669' }}>
              {formatCurrency(monthlyIncome)}
            </p>
            <p className="text-xs font-semibold tracking-widest uppercase mt-2" style={{ color: '#6E6E6E' }}>Income</p>
          </div>

          {/* Expenses */}
          <div className="rounded-2xl p-6" style={{
            background: '#0A0A0A',
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }} data-testid="stat-expenses">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl" style={{ background: 'rgba(220, 38, 38, 0.1)' }}>
                <TrendingDown className="w-6 h-6" style={{ color: '#DC2626' }} />
              </div>
              <span className="text-xs px-2 py-1 rounded-full" style={{ 
                background: 'rgba(220, 38, 38, 0.1)', 
                color: '#DC2626' 
              }}>This month</span>
            </div>
            <p className="font-mono text-2xl font-bold" style={{ color: '#DC2626' }}>
              {formatCurrency(monthlyExpenses)}
            </p>
            <p className="text-xs font-semibold tracking-widest uppercase mt-2" style={{ color: '#6E6E6E' }}>Expenses</p>
          </div>

          {/* Debt */}
          <div className="rounded-2xl p-6" style={{
            background: '#0A0A0A',
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }} data-testid="stat-debt">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl" style={{ background: 'rgba(176, 176, 176, 0.1)' }}>
                <CreditCard className="w-6 h-6" style={{ color: '#B0B0B0' }} />
              </div>
            </div>
            <p className="font-mono text-2xl font-bold" style={{ color: '#B0B0B0' }}>
              {formatCurrency(totalDebt)}
            </p>
            <p className="text-xs font-semibold tracking-widest uppercase mt-2" style={{ color: '#6E6E6E' }}>Total Debt</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Transactions */}
          <div className="lg:col-span-2 rounded-2xl p-6" style={{
            background: '#0A0A0A',
            border: '1px solid rgba(212, 175, 55, 0.1)'
          }} data-testid="recent-transactions">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#D4AF37' }}>Activity</p>
                <h2 className="text-xl font-semibold" style={{ color: '#F5F5F5' }}>Recent Transactions</h2>
              </div>
              <a href="/transactions" className="text-sm font-medium transition-colors" style={{ color: '#D4AF37' }}>
                View all →
              </a>
            </div>
            <div className="space-y-3">
              {transactions.slice(0, 5).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-4 rounded-xl transition-all duration-300"
                  style={{
                    background: '#0F0F0F',
                    border: '1px solid rgba(255, 255, 255, 0.03)'
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl" style={{
                      background: tx.type === 'income' ? 'rgba(5, 150, 105, 0.1)' : 'rgba(220, 38, 38, 0.1)'
                    }}>
                      {tx.type === 'income' ? (
                        <TrendingUp className="w-5 h-5" style={{ color: '#059669' }} />
                      ) : (
                        <TrendingDown className="w-5 h-5" style={{ color: '#DC2626' }} />
                      )}
                    </div>
                    <div>
                      <p className="font-medium" style={{ color: '#F5F5F5' }}>{tx.description || 'Transaction'}</p>
                      <p className="text-sm" style={{ color: '#525252' }}>{getCategoryName(tx.category_id)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-semibold" style={{
                      color: tx.type === 'income' ? '#059669' : '#DC2626'
                    }}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(parseFloat(tx.amount))}
                    </p>
                    <p className="text-xs" style={{ color: '#525252' }}>{tx.date}</p>
                  </div>
                </div>
              ))}
              {transactions.length === 0 && (
                <div className="text-center py-12 rounded-xl" style={{ background: '#0F0F0F' }}>
                  <BarChart3 className="w-10 h-10 mx-auto mb-3" style={{ color: '#525252' }} />
                  <p style={{ color: '#525252' }}>No transactions yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Goals Progress */}
          <div className="rounded-2xl p-6" style={{
            background: '#0A0A0A',
            border: '1px solid rgba(212, 175, 55, 0.1)'
          }} data-testid="goals-progress">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#D4AF37' }}>Progress</p>
                <h2 className="text-xl font-semibold" style={{ color: '#F5F5F5' }}>Financial Goals</h2>
              </div>
              <Target className="w-5 h-5" style={{ color: '#D4AF37' }} />
            </div>
            <div className="space-y-5">
              {goals.slice(0, 4).map((goal) => {
                const progress = (goal.current_amount / goal.target_amount) * 100;
                return (
                  <div key={goal.id}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium" style={{ color: '#F5F5F5' }}>{goal.name}</span>
                      <span className="font-mono" style={{ color: '#D4AF37' }}>{progress.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1A1A1A' }}>
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${Math.min(progress, 100)}%`,
                          background: 'linear-gradient(90deg, #997B19, #D4AF37, #F9F1D8)'
                        }} 
                      />
                    </div>
                    <div className="flex justify-between text-xs mt-1.5" style={{ color: '#525252' }}>
                      <span>{formatCurrency(parseFloat(goal.current_amount))}</span>
                      <span>{formatCurrency(parseFloat(goal.target_amount))}</span>
                    </div>
                  </div>
                );
              })}
              {goals.length === 0 && (
                <div className="text-center py-8">
                  <Target className="w-10 h-10 mx-auto mb-3" style={{ color: '#525252' }} />
                  <p style={{ color: '#525252' }}>No active goals</p>
                </div>
              )}
            </div>
            <a
              href="/goals"
              className="block mt-6 text-center text-sm font-medium transition-colors"
              style={{ color: '#D4AF37' }}
            >
              Manage goals →
            </a>
          </div>
        </div>

        {/* Accounts Overview */}
        <div className="mt-6 rounded-2xl p-6" style={{
          background: '#0A0A0A',
          border: '1px solid rgba(212, 175, 55, 0.1)'
        }} data-testid="accounts-overview">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#D4AF37' }}>Accounts</p>
              <h2 className="text-xl font-semibold" style={{ color: '#F5F5F5' }}>Your Accounts</h2>
            </div>
            <a href="/accounts" className="text-sm font-medium transition-colors" style={{ color: '#D4AF37' }}>
              Manage accounts →
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="p-5 rounded-xl transition-all duration-300 group"
                style={{
                  background: '#0F0F0F',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg" style={{ background: 'rgba(212, 175, 55, 0.1)' }}>
                    <Wallet className="w-4 h-4" style={{ color: '#D4AF37' }} />
                  </div>
                  <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#525252' }}>{account.type}</span>
                </div>
                <p className="font-medium" style={{ color: '#F5F5F5' }}>{account.name}</p>
                <p className="font-mono text-xl font-bold mt-2" style={{
                  color: parseFloat(account.balance) >= 0 ? '#D4AF37' : '#DC2626'
                }}>
                  {formatCurrency(parseFloat(account.balance))}
                </p>
              </div>
            ))}
            {accounts.length === 0 && (
              <div className="col-span-4 text-center py-12 rounded-xl" style={{ background: '#0F0F0F' }}>
                <Wallet className="w-10 h-10 mx-auto mb-3" style={{ color: '#525252' }} />
                <p style={{ color: '#525252' }}>No accounts yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
