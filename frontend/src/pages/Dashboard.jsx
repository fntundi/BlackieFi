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
  BarChart3,
  ChevronRight
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

  // Enhanced tile styles with raised 3D effect
  const tileBase = {
    background: 'linear-gradient(145deg, #0D0D0D 0%, #080808 100%)',
    borderRadius: '20px',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    boxShadow: `
      0 4px 24px -4px rgba(0, 0, 0, 0.6),
      0 8px 32px -8px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 0 rgba(255, 255, 255, 0.03),
      inset 0 -1px 0 0 rgba(0, 0, 0, 0.2)
    `,
    position: 'relative',
    overflow: 'hidden',
  };

  // Stat card with gold accent
  const statTileGold = {
    ...tileBase,
    padding: '1.5rem',
    background: 'linear-gradient(145deg, #0F0E0A 0%, #0A0908 100%)',
    border: '1px solid rgba(212, 175, 55, 0.12)',
    boxShadow: `
      0 4px 24px -4px rgba(0, 0, 0, 0.6),
      0 8px 32px -8px rgba(212, 175, 55, 0.08),
      inset 0 1px 0 0 rgba(212, 175, 55, 0.08),
      inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
    `,
  };

  // Regular stat card
  const statTile = {
    ...tileBase,
    padding: '1.5rem',
  };

  // Content card
  const contentTile = {
    ...tileBase,
    padding: '1.75rem',
    border: '1px solid rgba(212, 175, 55, 0.08)',
    boxShadow: `
      0 8px 32px -8px rgba(0, 0, 0, 0.5),
      0 16px 48px -16px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 0 rgba(255, 255, 255, 0.02),
      inset 0 -1px 0 0 rgba(0, 0, 0, 0.15)
    `,
  };

  // Inner card for nested items
  const innerTile = {
    background: 'linear-gradient(145deg, #0C0C0C 0%, #070707 100%)',
    borderRadius: '14px',
    border: '1px solid rgba(255, 255, 255, 0.03)',
    boxShadow: `
      inset 0 2px 4px 0 rgba(0, 0, 0, 0.3),
      inset 0 -1px 0 0 rgba(255, 255, 255, 0.02)
    `,
    transition: 'all 0.2s ease',
  };

  // Account mini-tile
  const accountTile = {
    ...innerTile,
    padding: '1.25rem',
  };

  return (
    <div style={{ padding: '2rem', background: '#050505', minHeight: '100%' }} data-testid="dashboard">
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <p style={{ 
            fontSize: '0.7rem', 
            fontWeight: '600', 
            letterSpacing: '0.2em', 
            textTransform: 'uppercase', 
            color: '#D4AF37', 
            marginBottom: '0.75rem',
            textShadow: '0 0 20px rgba(212, 175, 55, 0.3)'
          }}>Overview</p>
          <h1 style={{ 
            fontSize: '2.75rem', 
            fontWeight: '700', 
            color: '#F5F5F5', 
            margin: 0,
            letterSpacing: '-0.02em'
          }}>Dashboard</h1>
          <p style={{ marginTop: '0.5rem', color: '#525252', fontSize: '0.95rem' }}>Your financial overview at a glance</p>
        </div>

        {/* AI Insights - Only shows when AI is enabled */}
        <AIInsights entityId={selectedEntityId} />

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
          {/* Net Worth - Featured tile */}
          <div style={statTileGold} data-testid="stat-net-worth">
            {/* Top accent line */}
            <div style={{ 
              position: 'absolute', 
              top: 0, 
              left: '10%', 
              right: '10%', 
              height: '1px', 
              background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.5), transparent)' 
            }} />
            {/* Corner glow */}
            <div style={{
              position: 'absolute',
              top: '-50px',
              right: '-50px',
              width: '150px',
              height: '150px',
              background: 'radial-gradient(circle, rgba(212, 175, 55, 0.08) 0%, transparent 70%)',
              pointerEvents: 'none'
            }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ 
                padding: '0.875rem', 
                borderRadius: '14px', 
                background: 'linear-gradient(145deg, rgba(212, 175, 55, 0.15) 0%, rgba(212, 175, 55, 0.05) 100%)',
                border: '1px solid rgba(212, 175, 55, 0.15)',
                boxShadow: '0 4px 12px -2px rgba(212, 175, 55, 0.15)'
              }}>
                <DollarSign style={{ width: '24px', height: '24px', color: '#D4AF37' }} />
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.375rem 0.75rem',
                borderRadius: '20px',
                background: netWorth >= 0 ? 'rgba(5, 150, 105, 0.1)' : 'rgba(220, 38, 38, 0.1)',
                border: `1px solid ${netWorth >= 0 ? 'rgba(5, 150, 105, 0.2)' : 'rgba(220, 38, 38, 0.2)'}`
              }}>
                {netWorth >= 0 ? <ArrowUpRight style={{ width: '14px', height: '14px', color: '#059669' }} /> : <ArrowDownRight style={{ width: '14px', height: '14px', color: '#DC2626' }} />}
                <span style={{ fontSize: '0.7rem', fontWeight: '600', color: netWorth >= 0 ? '#059669' : '#DC2626' }}>
                  {netWorth >= 0 ? 'Positive' : 'Negative'}
                </span>
              </div>
            </div>
            <p style={{ 
              fontFamily: 'monospace', 
              fontSize: '2rem', 
              fontWeight: '700', 
              color: netWorth >= 0 ? '#D4AF37' : '#DC2626', 
              margin: 0,
              textShadow: netWorth >= 0 ? '0 0 30px rgba(212, 175, 55, 0.3)' : 'none'
            }}>{formatCurrency(Math.abs(netWorth))}</p>
            <p style={{ fontSize: '0.75rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5A5A5A', marginTop: '0.75rem' }}>Net Worth</p>
          </div>

          {/* Income */}
          <div style={statTile} data-testid="stat-income">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ 
                padding: '0.875rem', 
                borderRadius: '14px', 
                background: 'linear-gradient(145deg, rgba(5, 150, 105, 0.12) 0%, rgba(5, 150, 105, 0.04) 100%)',
                border: '1px solid rgba(5, 150, 105, 0.12)'
              }}>
                <TrendingUp style={{ width: '24px', height: '24px', color: '#059669' }} />
              </div>
              <span style={{ 
                fontSize: '0.65rem', 
                fontWeight: '600',
                padding: '0.3rem 0.625rem', 
                borderRadius: '20px', 
                background: 'rgba(5, 150, 105, 0.1)', 
                border: '1px solid rgba(5, 150, 105, 0.15)',
                color: '#059669',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>This month</span>
            </div>
            <p style={{ fontFamily: 'monospace', fontSize: '1.75rem', fontWeight: '700', color: '#059669', margin: 0 }}>{formatCurrency(monthlyIncome)}</p>
            <p style={{ fontSize: '0.75rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5A5A5A', marginTop: '0.75rem' }}>Income</p>
          </div>

          {/* Expenses */}
          <div style={statTile} data-testid="stat-expenses">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ 
                padding: '0.875rem', 
                borderRadius: '14px', 
                background: 'linear-gradient(145deg, rgba(220, 38, 38, 0.12) 0%, rgba(220, 38, 38, 0.04) 100%)',
                border: '1px solid rgba(220, 38, 38, 0.12)'
              }}>
                <TrendingDown style={{ width: '24px', height: '24px', color: '#DC2626' }} />
              </div>
              <span style={{ 
                fontSize: '0.65rem', 
                fontWeight: '600',
                padding: '0.3rem 0.625rem', 
                borderRadius: '20px', 
                background: 'rgba(220, 38, 38, 0.1)', 
                border: '1px solid rgba(220, 38, 38, 0.15)',
                color: '#DC2626',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>This month</span>
            </div>
            <p style={{ fontFamily: 'monospace', fontSize: '1.75rem', fontWeight: '700', color: '#DC2626', margin: 0 }}>{formatCurrency(monthlyExpenses)}</p>
            <p style={{ fontSize: '0.75rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5A5A5A', marginTop: '0.75rem' }}>Expenses</p>
          </div>

          {/* Debt */}
          <div style={statTile} data-testid="stat-debt">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ 
                padding: '0.875rem', 
                borderRadius: '14px', 
                background: 'linear-gradient(145deg, rgba(160, 160, 160, 0.12) 0%, rgba(160, 160, 160, 0.04) 100%)',
                border: '1px solid rgba(160, 160, 160, 0.1)'
              }}>
                <CreditCard style={{ width: '24px', height: '24px', color: '#A0A0A0' }} />
              </div>
            </div>
            <p style={{ fontFamily: 'monospace', fontSize: '1.75rem', fontWeight: '700', color: '#A0A0A0', margin: 0 }}>{formatCurrency(totalDebt)}</p>
            <p style={{ fontSize: '0.75rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5A5A5A', marginTop: '0.75rem' }}>Total Debt</p>
          </div>
        </div>

        {/* Content Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
          {/* Recent Transactions */}
          <div style={contentTile} data-testid="recent-transactions">
            {/* Subtle top border glow */}
            <div style={{ 
              position: 'absolute', 
              top: 0, 
              left: '5%', 
              right: '5%', 
              height: '1px', 
              background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.25), transparent)' 
            }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#D4AF37', marginBottom: '0.375rem' }}>Activity</p>
                <h2 style={{ fontSize: '1.375rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>Recent Transactions</h2>
              </div>
              <a href="/transactions" style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.875rem', 
                fontWeight: '500', 
                color: '#D4AF37', 
                textDecoration: 'none',
                padding: '0.5rem 0.875rem',
                borderRadius: '10px',
                background: 'rgba(212, 175, 55, 0.08)',
                border: '1px solid rgba(212, 175, 55, 0.15)',
                transition: 'all 0.2s'
              }}>
                View all
                <ChevronRight style={{ width: '16px', height: '16px' }} />
              </a>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {transactions.slice(0, 5).map((tx) => (
                <div key={tx.id} style={{ 
                  ...innerTile,
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '1rem 1.25rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ 
                      padding: '0.75rem', 
                      borderRadius: '12px', 
                      background: tx.type === 'income' 
                        ? 'linear-gradient(145deg, rgba(5, 150, 105, 0.15) 0%, rgba(5, 150, 105, 0.05) 100%)'
                        : 'linear-gradient(145deg, rgba(220, 38, 38, 0.15) 0%, rgba(220, 38, 38, 0.05) 100%)',
                      border: `1px solid ${tx.type === 'income' ? 'rgba(5, 150, 105, 0.15)' : 'rgba(220, 38, 38, 0.15)'}`
                    }}>
                      {tx.type === 'income' ? <TrendingUp style={{ width: '18px', height: '18px', color: '#059669' }} /> : <TrendingDown style={{ width: '18px', height: '18px', color: '#DC2626' }} />}
                    </div>
                    <div>
                      <p style={{ fontWeight: '500', color: '#F5F5F5', margin: 0, fontSize: '0.95rem' }}>{tx.description || 'Transaction'}</p>
                      <p style={{ fontSize: '0.8rem', color: '#4A4A4A', margin: 0, marginTop: '0.25rem' }}>{getCategoryName(tx.category_id)}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontFamily: 'monospace', fontWeight: '600', fontSize: '1rem', color: tx.type === 'income' ? '#059669' : '#DC2626', margin: 0 }}>{tx.type === 'income' ? '+' : '-'}{formatCurrency(parseFloat(tx.amount))}</p>
                    <p style={{ fontSize: '0.75rem', color: '#4A4A4A', margin: 0, marginTop: '0.25rem' }}>{tx.date}</p>
                  </div>
                </div>
              ))}
              {transactions.length === 0 && (
                <div style={{ 
                  ...innerTile,
                  textAlign: 'center', 
                  padding: '3rem',
                }}>
                  <BarChart3 style={{ width: '40px', height: '40px', margin: '0 auto 1rem', color: '#3A3A3A' }} />
                  <p style={{ color: '#4A4A4A', margin: 0 }}>No transactions yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Goals */}
          <div style={contentTile} data-testid="goals-progress">
            {/* Subtle top border glow */}
            <div style={{ 
              position: 'absolute', 
              top: 0, 
              left: '5%', 
              right: '5%', 
              height: '1px', 
              background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.25), transparent)' 
            }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#D4AF37', marginBottom: '0.375rem' }}>Progress</p>
                <h2 style={{ fontSize: '1.375rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>Financial Goals</h2>
              </div>
              <div style={{ 
                padding: '0.625rem', 
                borderRadius: '12px', 
                background: 'linear-gradient(145deg, rgba(212, 175, 55, 0.12) 0%, rgba(212, 175, 55, 0.04) 100%)',
                border: '1px solid rgba(212, 175, 55, 0.15)'
              }}>
                <Target style={{ width: '20px', height: '20px', color: '#D4AF37' }} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {goals.slice(0, 4).map((goal) => {
                const progress = (goal.current_amount / goal.target_amount) * 100;
                return (
                  <div key={goal.id} style={{ 
                    padding: '1rem',
                    borderRadius: '12px',
                    background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.02) 0%, transparent 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.03)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.625rem' }}>
                      <span style={{ fontWeight: '500', color: '#F5F5F5' }}>{goal.name}</span>
                      <span style={{ 
                        fontFamily: 'monospace', 
                        fontWeight: '600',
                        color: '#D4AF37',
                        textShadow: '0 0 20px rgba(212, 175, 55, 0.3)'
                      }}>{progress.toFixed(0)}%</span>
                    </div>
                    <div style={{ 
                      height: '8px', 
                      borderRadius: '999px', 
                      background: 'linear-gradient(145deg, #1A1A1A 0%, #0F0F0F 100%)',
                      boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.5)',
                      overflow: 'hidden',
                      position: 'relative'
                    }}>
                      <div style={{ 
                        height: '100%', 
                        width: `${Math.min(progress, 100)}%`, 
                        borderRadius: '999px', 
                        background: 'linear-gradient(90deg, #997B19, #D4AF37, #F9E7A1)', 
                        transition: 'width 0.5s ease',
                        boxShadow: '0 0 12px rgba(212, 175, 55, 0.4)'
                      }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#4A4A4A', marginTop: '0.5rem' }}>
                      <span>{formatCurrency(parseFloat(goal.current_amount))}</span>
                      <span>{formatCurrency(parseFloat(goal.target_amount))}</span>
                    </div>
                  </div>
                );
              })}
              {goals.length === 0 && (
                <div style={{ 
                  ...innerTile,
                  textAlign: 'center', 
                  padding: '2.5rem',
                }}>
                  <Target style={{ width: '40px', height: '40px', margin: '0 auto 1rem', color: '#3A3A3A' }} />
                  <p style={{ color: '#4A4A4A', margin: 0 }}>No active goals</p>
                </div>
              )}
            </div>
            <a href="/goals" style={{ 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.25rem',
              fontSize: '0.875rem', 
              fontWeight: '500', 
              color: '#D4AF37', 
              textDecoration: 'none', 
              marginTop: '1.5rem',
              padding: '0.75rem',
              borderRadius: '12px',
              background: 'rgba(212, 175, 55, 0.05)',
              border: '1px solid rgba(212, 175, 55, 0.1)',
              transition: 'all 0.2s'
            }}>
              Manage goals
              <ChevronRight style={{ width: '16px', height: '16px' }} />
            </a>
          </div>
        </div>

        {/* Accounts */}
        <div style={{ ...contentTile, marginTop: '1.5rem' }} data-testid="accounts-overview">
          {/* Subtle top border glow */}
          <div style={{ 
            position: 'absolute', 
            top: 0, 
            left: '5%', 
            right: '5%', 
            height: '1px', 
            background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.25), transparent)' 
          }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div>
              <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#D4AF37', marginBottom: '0.375rem' }}>Accounts</p>
              <h2 style={{ fontSize: '1.375rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>Your Accounts</h2>
            </div>
            <a href="/accounts" style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.875rem', 
              fontWeight: '500', 
              color: '#D4AF37', 
              textDecoration: 'none',
              padding: '0.5rem 0.875rem',
              borderRadius: '10px',
              background: 'rgba(212, 175, 55, 0.08)',
              border: '1px solid rgba(212, 175, 55, 0.15)',
              transition: 'all 0.2s'
            }}>
              Manage accounts
              <ChevronRight style={{ width: '16px', height: '16px' }} />
            </a>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            {accounts.map((account) => (
              <div key={account.id} style={accountTile}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ 
                    padding: '0.625rem', 
                    borderRadius: '10px', 
                    background: 'linear-gradient(145deg, rgba(212, 175, 55, 0.12) 0%, rgba(212, 175, 55, 0.04) 100%)',
                    border: '1px solid rgba(212, 175, 55, 0.12)'
                  }}>
                    <Wallet style={{ width: '16px', height: '16px', color: '#D4AF37' }} />
                  </div>
                  <span style={{ 
                    fontSize: '0.65rem', 
                    fontWeight: '600', 
                    letterSpacing: '0.1em', 
                    textTransform: 'uppercase', 
                    color: '#505050',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.03)'
                  }}>{account.type}</span>
                </div>
                <p style={{ fontWeight: '500', color: '#E5E5E5', margin: 0, fontSize: '0.95rem' }}>{account.name}</p>
                <p style={{ 
                  fontFamily: 'monospace', 
                  fontSize: '1.375rem', 
                  fontWeight: '700', 
                  color: parseFloat(account.balance) >= 0 ? '#D4AF37' : '#DC2626', 
                  margin: 0, 
                  marginTop: '0.625rem',
                  textShadow: parseFloat(account.balance) >= 0 ? '0 0 20px rgba(212, 175, 55, 0.2)' : 'none'
                }}>{formatCurrency(parseFloat(account.balance))}</p>
              </div>
            ))}
            {accounts.length === 0 && (
              <div style={{ 
                gridColumn: 'span 4', 
                ...innerTile,
                textAlign: 'center', 
                padding: '3rem',
              }}>
                <Wallet style={{ width: '40px', height: '40px', margin: '0 auto 1rem', color: '#3A3A3A' }} />
                <p style={{ color: '#4A4A4A', margin: 0 }}>No accounts yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1200px) {
          [data-testid="dashboard"] > div > div:nth-child(3) { grid-template-columns: repeat(2, 1fr) !important; }
          [data-testid="dashboard"] > div > div:nth-child(4) { grid-template-columns: 1fr !important; }
          [data-testid="accounts-overview"] > div:last-child { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 768px) {
          [data-testid="dashboard"] > div > div:nth-child(3) { grid-template-columns: 1fr !important; }
          [data-testid="accounts-overview"] > div:last-child { grid-template-columns: 1fr !important; }
        }
        a:hover {
          background: rgba(212, 175, 55, 0.12) !important;
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
}
