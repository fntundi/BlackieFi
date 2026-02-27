import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import { useEntity } from '../contexts/EntityContext';
import AIInsights from '../components/AIInsights';
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

  const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance || 0), 0);
  const totalDebt = debts.reduce((sum, d) => sum + parseFloat(d.current_balance || 0), 0);
  const netWorth = totalBalance - totalDebt;

  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthlyTransactions = transactions.filter(t => t.date?.startsWith(thisMonth));
  const monthlyIncome = monthlyTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  const monthlyExpenses = monthlyTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

  const getCategoryName = (categoryId) => categories.find(c => c.id === categoryId)?.name || 'Uncategorized';
  const formatCurrency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  const cardStyle = {
    background: '#0A0A0A',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '16px',
    padding: '1.5rem'
  };

  const statCardStyle = {
    ...cardStyle,
    position: 'relative',
    overflow: 'hidden'
  };

  return (
    <div style={{ padding: '2rem', background: '#050505', minHeight: '100%' }} data-testid="dashboard">
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#D4AF37', marginBottom: '0.5rem' }}>Overview</p>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '700', color: '#F5F5F5', margin: 0 }}>Dashboard</h1>
          <p style={{ marginTop: '0.5rem', color: '#525252' }}>Your financial overview at a glance</p>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          {/* Net Worth */}
          <div style={{
            ...statCardStyle,
            background: 'linear-gradient(135deg, #0F0F0F 0%, #0A0A0A 100%)',
            border: '1px solid rgba(212, 175, 55, 0.2)'
          }} data-testid="stat-net-worth">
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(212, 175, 55, 0.1)' }}>
                <DollarSign style={{ width: '24px', height: '24px', color: '#D4AF37' }} />
              </div>
              {netWorth >= 0 ? <ArrowUpRight style={{ width: '20px', height: '20px', color: '#059669' }} /> : <ArrowDownRight style={{ width: '20px', height: '20px', color: '#DC2626' }} />}
            </div>
            <p style={{ fontFamily: 'monospace', fontSize: '1.75rem', fontWeight: '700', color: netWorth >= 0 ? '#D4AF37' : '#DC2626', margin: 0 }}>{formatCurrency(Math.abs(netWorth))}</p>
            <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#525252', marginTop: '0.5rem' }}>Net Worth</p>
          </div>

          {/* Income */}
          <div style={statCardStyle} data-testid="stat-income">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(5, 150, 105, 0.1)' }}>
                <TrendingUp style={{ width: '24px', height: '24px', color: '#059669' }} />
              </div>
              <span style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', borderRadius: '999px', background: 'rgba(5, 150, 105, 0.1)', color: '#059669' }}>This month</span>
            </div>
            <p style={{ fontFamily: 'monospace', fontSize: '1.5rem', fontWeight: '700', color: '#059669', margin: 0 }}>{formatCurrency(monthlyIncome)}</p>
            <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#525252', marginTop: '0.5rem' }}>Income</p>
          </div>

          {/* Expenses */}
          <div style={statCardStyle} data-testid="stat-expenses">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(220, 38, 38, 0.1)' }}>
                <TrendingDown style={{ width: '24px', height: '24px', color: '#DC2626' }} />
              </div>
              <span style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', borderRadius: '999px', background: 'rgba(220, 38, 38, 0.1)', color: '#DC2626' }}>This month</span>
            </div>
            <p style={{ fontFamily: 'monospace', fontSize: '1.5rem', fontWeight: '700', color: '#DC2626', margin: 0 }}>{formatCurrency(monthlyExpenses)}</p>
            <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#525252', marginTop: '0.5rem' }}>Expenses</p>
          </div>

          {/* Debt */}
          <div style={statCardStyle} data-testid="stat-debt">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(176, 176, 176, 0.1)' }}>
                <CreditCard style={{ width: '24px', height: '24px', color: '#B0B0B0' }} />
              </div>
            </div>
            <p style={{ fontFamily: 'monospace', fontSize: '1.5rem', fontWeight: '700', color: '#B0B0B0', margin: 0 }}>{formatCurrency(totalDebt)}</p>
            <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#525252', marginTop: '0.5rem' }}>Total Debt</p>
          </div>
        </div>

        {/* Content Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
          {/* Recent Transactions */}
          <div style={{ ...cardStyle, border: '1px solid rgba(212, 175, 55, 0.1)' }} data-testid="recent-transactions">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#D4AF37', marginBottom: '0.25rem' }}>Activity</p>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>Recent Transactions</h2>
              </div>
              <a href="/transactions" style={{ fontSize: '0.875rem', fontWeight: '500', color: '#D4AF37', textDecoration: 'none' }}>View all →</a>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {transactions.slice(0, 5).map((tx) => (
                <div key={tx.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderRadius: '12px', background: '#0F0F0F', border: '1px solid rgba(255, 255, 255, 0.03)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '0.625rem', borderRadius: '10px', background: tx.type === 'income' ? 'rgba(5, 150, 105, 0.1)' : 'rgba(220, 38, 38, 0.1)' }}>
                      {tx.type === 'income' ? <TrendingUp style={{ width: '18px', height: '18px', color: '#059669' }} /> : <TrendingDown style={{ width: '18px', height: '18px', color: '#DC2626' }} />}
                    </div>
                    <div>
                      <p style={{ fontWeight: '500', color: '#F5F5F5', margin: 0 }}>{tx.description || 'Transaction'}</p>
                      <p style={{ fontSize: '0.875rem', color: '#404040', margin: 0, marginTop: '0.125rem' }}>{getCategoryName(tx.category_id)}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontFamily: 'monospace', fontWeight: '600', color: tx.type === 'income' ? '#059669' : '#DC2626', margin: 0 }}>{tx.type === 'income' ? '+' : '-'}{formatCurrency(parseFloat(tx.amount))}</p>
                    <p style={{ fontSize: '0.75rem', color: '#404040', margin: 0, marginTop: '0.125rem' }}>{tx.date}</p>
                  </div>
                </div>
              ))}
              {transactions.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', borderRadius: '12px', background: '#0F0F0F' }}>
                  <BarChart3 style={{ width: '40px', height: '40px', margin: '0 auto 1rem', color: '#404040' }} />
                  <p style={{ color: '#404040', margin: 0 }}>No transactions yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Goals */}
          <div style={{ ...cardStyle, border: '1px solid rgba(212, 175, 55, 0.1)' }} data-testid="goals-progress">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#D4AF37', marginBottom: '0.25rem' }}>Progress</p>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>Financial Goals</h2>
              </div>
              <Target style={{ width: '20px', height: '20px', color: '#D4AF37' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {goals.slice(0, 4).map((goal) => {
                const progress = (goal.current_amount / goal.target_amount) * 100;
                return (
                  <div key={goal.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: '500', color: '#F5F5F5' }}>{goal.name}</span>
                      <span style={{ fontFamily: 'monospace', color: '#D4AF37' }}>{progress.toFixed(0)}%</span>
                    </div>
                    <div style={{ height: '6px', borderRadius: '999px', background: '#1A1A1A', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(progress, 100)}%`, borderRadius: '999px', background: 'linear-gradient(90deg, #997B19, #D4AF37, #F9F1D8)', transition: 'width 0.5s' }}></div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#404040', marginTop: '0.375rem' }}>
                      <span>{formatCurrency(parseFloat(goal.current_amount))}</span>
                      <span>{formatCurrency(parseFloat(goal.target_amount))}</span>
                    </div>
                  </div>
                );
              })}
              {goals.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <Target style={{ width: '40px', height: '40px', margin: '0 auto 1rem', color: '#404040' }} />
                  <p style={{ color: '#404040', margin: 0 }}>No active goals</p>
                </div>
              )}
            </div>
            <a href="/goals" style={{ display: 'block', textAlign: 'center', fontSize: '0.875rem', fontWeight: '500', color: '#D4AF37', textDecoration: 'none', marginTop: '1.5rem' }}>Manage goals →</a>
          </div>
        </div>

        {/* Accounts */}
        <div style={{ ...cardStyle, border: '1px solid rgba(212, 175, 55, 0.1)', marginTop: '1.5rem' }} data-testid="accounts-overview">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div>
              <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#D4AF37', marginBottom: '0.25rem' }}>Accounts</p>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>Your Accounts</h2>
            </div>
            <a href="/accounts" style={{ fontSize: '0.875rem', fontWeight: '500', color: '#D4AF37', textDecoration: 'none' }}>Manage accounts →</a>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            {accounts.map((account) => (
              <div key={account.id} style={{ padding: '1.25rem', borderRadius: '12px', background: '#0F0F0F', border: '1px solid rgba(255, 255, 255, 0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(212, 175, 55, 0.1)' }}>
                    <Wallet style={{ width: '16px', height: '16px', color: '#D4AF37' }} />
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#404040' }}>{account.type}</span>
                </div>
                <p style={{ fontWeight: '500', color: '#F5F5F5', margin: 0 }}>{account.name}</p>
                <p style={{ fontFamily: 'monospace', fontSize: '1.25rem', fontWeight: '700', color: parseFloat(account.balance) >= 0 ? '#D4AF37' : '#DC2626', margin: 0, marginTop: '0.5rem' }}>{formatCurrency(parseFloat(account.balance))}</p>
              </div>
            ))}
            {accounts.length === 0 && (
              <div style={{ gridColumn: 'span 4', textAlign: 'center', padding: '3rem', borderRadius: '12px', background: '#0F0F0F' }}>
                <Wallet style={{ width: '40px', height: '40px', margin: '0 auto 1rem', color: '#404040' }} />
                <p style={{ color: '#404040', margin: 0 }}>No accounts yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1200px) {
          [data-testid="dashboard"] > div > div:nth-child(2) { grid-template-columns: repeat(2, 1fr) !important; }
          [data-testid="dashboard"] > div > div:nth-child(3) { grid-template-columns: 1fr !important; }
          [data-testid="accounts-overview"] > div:last-child { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 768px) {
          [data-testid="dashboard"] > div > div:nth-child(2) { grid-template-columns: 1fr !important; }
          [data-testid="accounts-overview"] > div:last-child { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
