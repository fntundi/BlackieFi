import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useEntity } from '../contexts/EntityContext';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Receipt,
  Filter,
  TrendingUp,
  TrendingDown,
  RefreshCw
} from 'lucide-react';

export default function Transactions() {
  const { selectedEntityId } = useEntity();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    category_id: '',
    account_id: '',
  });

  const { data: transactions = [], isLoading, refetch } = useQuery({
    queryKey: ['transactions', selectedEntityId, filterType],
    queryFn: () => api.getTransactions({
      entity_id: selectedEntityId,
      ...(filterType && { type: filterType }),
      limit: 100
    }),
    enabled: !!selectedEntityId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', selectedEntityId],
    queryFn: () => api.getCategories({ entity_id: selectedEntityId }),
    enabled: !!selectedEntityId,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', selectedEntityId],
    queryFn: () => api.getAccounts({ entity_id: selectedEntityId }),
    enabled: !!selectedEntityId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.createTransaction(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['transactions']);
      toast.success('Transaction created');
      setShowForm(false);
      resetForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['transactions']);
      toast.success('Transaction deleted');
    },
    onError: (error) => toast.error(error.message),
  });

  const resetForm = () => {
    setFormData({
      type: 'expense',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      category_id: '',
      account_id: '',
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      entity_id: selectedEntityId,
      amount: parseFloat(formData.amount),
      category_id: formData.category_id || null,
      account_id: formData.account_id || null,
    });
  };

  const filteredTransactions = transactions.filter(t =>
    t.description?.toLowerCase().includes(search.toLowerCase())
  );

  const getCategoryName = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat?.name || 'Uncategorized';
  };

  const getAccountName = (accountId) => {
    const acc = accounts.find(a => a.id === accountId);
    return acc?.name || '-';
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  // Calculate summary stats
  const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  const totalExpenses = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  const netFlow = totalIncome - totalExpenses;

  // Enhanced tile styles
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

  const statMiniTile = {
    ...tileBase,
    padding: '1.25rem',
  };

  const inputStyle = {
    background: 'linear-gradient(145deg, #0A0A0A 0%, #080808 100%)',
    border: '1px solid rgba(212, 175, 55, 0.12)',
    borderRadius: '12px',
    color: '#F5F5F5',
    padding: '0.875rem 1rem',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'all 0.2s',
    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)'
  };

  const buttonStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.875rem 1.5rem',
    borderRadius: '12px',
    fontWeight: '600',
    fontSize: '0.95rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: 'none'
  };

  return (
    <div style={{ padding: '2rem', background: '#050505', minHeight: '100%' }} data-testid="transactions-page">
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
          <div>
            <p style={{ 
              fontSize: '0.7rem', 
              fontWeight: '600', 
              letterSpacing: '0.2em', 
              textTransform: 'uppercase', 
              color: '#D4AF37', 
              marginBottom: '0.75rem',
              textShadow: '0 0 20px rgba(212, 175, 55, 0.3)'
            }}>Finances</p>
            <h1 style={{ 
              fontSize: '2.75rem', 
              fontWeight: '700', 
              color: '#F5F5F5', 
              margin: 0,
              letterSpacing: '-0.02em'
            }}>Transactions</h1>
            <p style={{ marginTop: '0.5rem', color: '#525252', fontSize: '0.95rem' }}>Track your income and expenses</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            style={{
              ...buttonStyle,
              background: 'linear-gradient(135deg, #997B19 0%, #D4AF37 50%, #997B19 100%)',
              color: '#000000',
              boxShadow: '0 4px 20px rgba(212, 175, 55, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
            }}
            data-testid="add-transaction-btn"
          >
            <Plus style={{ width: '20px', height: '20px' }} />
            Add Transaction
          </button>
        </div>

        {/* Summary Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
          <div style={statMiniTile}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ 
                padding: '0.625rem', 
                borderRadius: '10px', 
                background: 'linear-gradient(145deg, rgba(5, 150, 105, 0.15) 0%, rgba(5, 150, 105, 0.05) 100%)',
                border: '1px solid rgba(5, 150, 105, 0.15)'
              }}>
                <TrendingUp style={{ width: '18px', height: '18px', color: '#059669' }} />
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5A5A5A' }}>Total Income</span>
            </div>
            <p style={{ fontFamily: 'monospace', fontSize: '1.5rem', fontWeight: '700', color: '#059669', margin: 0 }}>{formatCurrency(totalIncome)}</p>
          </div>

          <div style={statMiniTile}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ 
                padding: '0.625rem', 
                borderRadius: '10px', 
                background: 'linear-gradient(145deg, rgba(220, 38, 38, 0.15) 0%, rgba(220, 38, 38, 0.05) 100%)',
                border: '1px solid rgba(220, 38, 38, 0.15)'
              }}>
                <TrendingDown style={{ width: '18px', height: '18px', color: '#DC2626' }} />
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5A5A5A' }}>Total Expenses</span>
            </div>
            <p style={{ fontFamily: 'monospace', fontSize: '1.5rem', fontWeight: '700', color: '#DC2626', margin: 0 }}>{formatCurrency(totalExpenses)}</p>
          </div>

          <div style={{
            ...statMiniTile,
            background: 'linear-gradient(145deg, #0F0E0A 0%, #0A0908 100%)',
            border: '1px solid rgba(212, 175, 55, 0.12)',
          }}>
            <div style={{ 
              position: 'absolute', 
              top: 0, 
              left: '10%', 
              right: '10%', 
              height: '1px', 
              background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.4), transparent)' 
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ 
                padding: '0.625rem', 
                borderRadius: '10px', 
                background: 'linear-gradient(145deg, rgba(212, 175, 55, 0.15) 0%, rgba(212, 175, 55, 0.05) 100%)',
                border: '1px solid rgba(212, 175, 55, 0.15)'
              }}>
                {netFlow >= 0 ? <ArrowUpRight style={{ width: '18px', height: '18px', color: '#D4AF37' }} /> : <ArrowDownRight style={{ width: '18px', height: '18px', color: '#DC2626' }} />}
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5A5A5A' }}>Net Flow</span>
            </div>
            <p style={{ 
              fontFamily: 'monospace', 
              fontSize: '1.5rem', 
              fontWeight: '700', 
              color: netFlow >= 0 ? '#D4AF37' : '#DC2626', 
              margin: 0,
              textShadow: netFlow >= 0 ? '0 0 20px rgba(212, 175, 55, 0.3)' : 'none'
            }}>{netFlow >= 0 ? '+' : ''}{formatCurrency(netFlow)}</p>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: '#525252' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search transactions..."
              style={{
                ...inputStyle,
                width: '100%',
                paddingLeft: '2.75rem'
              }}
              data-testid="search-transactions"
            />
          </div>
          <div style={{ position: 'relative' }}>
            <Filter style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#525252', pointerEvents: 'none' }} />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{
                ...inputStyle,
                paddingLeft: '2.5rem',
                paddingRight: '2rem',
                cursor: 'pointer',
                minWidth: '160px',
                appearance: 'none'
              }}
              data-testid="filter-type"
            >
              <option value="" style={{ background: '#0A0A0A' }}>All Types</option>
              <option value="income" style={{ background: '#0A0A0A' }}>Income</option>
              <option value="expense" style={{ background: '#0A0A0A' }}>Expense</option>
              <option value="transfer" style={{ background: '#0A0A0A' }}>Transfer</option>
            </select>
          </div>
          <button
            onClick={() => refetch()}
            style={{
              ...inputStyle,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              cursor: 'pointer'
            }}
            title="Refresh"
          >
            <RefreshCw style={{ width: '18px', height: '18px', color: '#D4AF37' }} />
          </button>
        </div>

        {/* Transactions List */}
        <div style={contentTile} data-testid="transactions-list">
          {/* Top accent */}
          <div style={{ 
            position: 'absolute', 
            top: 0, 
            left: '5%', 
            right: '5%', 
            height: '1px', 
            background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.25), transparent)' 
          }} />
          
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '3px solid rgba(212, 175, 55, 0.1)',
                borderTopColor: '#D4AF37',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
            </div>
          ) : filteredTransactions.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {filteredTransactions.map((tx) => (
                <div
                  key={tx.id}
                  style={{
                    ...innerTile,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem 1.25rem',
                  }}
                  data-testid={`transaction-${tx.id}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ 
                      padding: '0.75rem', 
                      borderRadius: '12px', 
                      background: tx.type === 'income' 
                        ? 'linear-gradient(145deg, rgba(5, 150, 105, 0.15) 0%, rgba(5, 150, 105, 0.05) 100%)'
                        : tx.type === 'transfer'
                        ? 'linear-gradient(145deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)'
                        : 'linear-gradient(145deg, rgba(220, 38, 38, 0.15) 0%, rgba(220, 38, 38, 0.05) 100%)',
                      border: `1px solid ${tx.type === 'income' ? 'rgba(5, 150, 105, 0.15)' : tx.type === 'transfer' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(220, 38, 38, 0.15)'}`
                    }}>
                      {tx.type === 'income' ? (
                        <ArrowUpRight style={{ width: '20px', height: '20px', color: '#059669' }} />
                      ) : tx.type === 'transfer' ? (
                        <RefreshCw style={{ width: '20px', height: '20px', color: '#3B82F6' }} />
                      ) : (
                        <ArrowDownRight style={{ width: '20px', height: '20px', color: '#DC2626' }} />
                      )}
                    </div>
                    <div>
                      <p style={{ fontWeight: '500', color: '#F5F5F5', margin: 0, fontSize: '0.95rem' }}>{tx.description || 'Transaction'}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          color: '#4A4A4A',
                          padding: '0.125rem 0.5rem',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.03)'
                        }}>{getCategoryName(tx.category_id)}</span>
                        <span style={{ color: '#3A3A3A' }}>·</span>
                        <span style={{ fontSize: '0.75rem', color: '#4A4A4A' }}>{getAccountName(tx.account_id)}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ 
                        fontFamily: 'monospace', 
                        fontWeight: '600', 
                        fontSize: '1.1rem',
                        color: tx.type === 'income' ? '#059669' : tx.type === 'transfer' ? '#3B82F6' : '#DC2626',
                        margin: 0
                      }}>
                        {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}{formatCurrency(parseFloat(tx.amount))}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: '#4A4A4A', margin: 0, marginTop: '0.25rem' }}>{tx.date}</p>
                    </div>
                    <button
                      onClick={() => deleteMutation.mutate(tx.id)}
                      style={{
                        padding: '0.5rem',
                        borderRadius: '8px',
                        background: 'rgba(220, 38, 38, 0.1)',
                        border: '1px solid rgba(220, 38, 38, 0.15)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      data-testid={`delete-transaction-${tx.id}`}
                    >
                      <X style={{ width: '16px', height: '16px', color: '#DC2626' }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ 
              ...innerTile,
              textAlign: 'center', 
              padding: '4rem',
            }}>
              <Receipt style={{ width: '48px', height: '48px', margin: '0 auto 1rem', color: '#3A3A3A' }} />
              <p style={{ color: '#4A4A4A', margin: 0, fontSize: '1rem' }}>No transactions found</p>
              <p style={{ color: '#3A3A3A', margin: '0.5rem 0 0', fontSize: '0.875rem' }}>Add your first transaction to get started</p>
            </div>
          )}
        </div>

        {/* Add Transaction Modal */}
        {showForm && (
          <div style={{ 
            position: 'fixed', 
            inset: 0, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 50, 
            padding: '1rem',
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)'
          }}>
            <div style={{
              ...contentTile,
              width: '100%',
              maxWidth: '480px',
              maxHeight: '90vh',
              overflowY: 'auto'
            }} data-testid="add-transaction-modal">
              {/* Modal top accent */}
              <div style={{ 
                position: 'absolute', 
                top: 0, 
                left: '10%', 
                right: '10%', 
                height: '2px', 
                background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.5), transparent)' 
              }} />
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <div>
                  <p style={{ fontSize: '0.65rem', fontWeight: '600', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#D4AF37', marginBottom: '0.25rem' }}>New Entry</p>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>Add Transaction</h2>
                </div>
                <button 
                  onClick={() => setShowForm(false)} 
                  style={{
                    padding: '0.5rem',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    cursor: 'pointer'
                  }}
                >
                  <X style={{ width: '20px', height: '20px', color: '#6E6E6E' }} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5A5A5A', marginBottom: '0.5rem' }}>Type</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                    {['expense', 'income', 'transfer'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormData({ ...formData, type })}
                        style={{
                          padding: '0.75rem',
                          borderRadius: '10px',
                          background: formData.type === type 
                            ? type === 'income' 
                              ? 'linear-gradient(145deg, rgba(5, 150, 105, 0.2) 0%, rgba(5, 150, 105, 0.1) 100%)'
                              : type === 'transfer'
                              ? 'linear-gradient(145deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%)'
                              : 'linear-gradient(145deg, rgba(220, 38, 38, 0.2) 0%, rgba(220, 38, 38, 0.1) 100%)'
                            : 'rgba(255, 255, 255, 0.02)',
                          border: formData.type === type 
                            ? `1px solid ${type === 'income' ? 'rgba(5, 150, 105, 0.3)' : type === 'transfer' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(220, 38, 38, 0.3)'}`
                            : '1px solid rgba(255, 255, 255, 0.06)',
                          color: formData.type === type 
                            ? type === 'income' ? '#059669' : type === 'transfer' ? '#3B82F6' : '#DC2626'
                            : '#6E6E6E',
                          fontWeight: '600',
                          fontSize: '0.875rem',
                          textTransform: 'capitalize',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        data-testid={`type-${type}`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5A5A5A', marginBottom: '0.5rem' }}>Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    style={{ ...inputStyle, width: '100%' }}
                    placeholder="0.00"
                    required
                    data-testid="transaction-amount-input"
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5A5A5A', marginBottom: '0.5rem' }}>Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    style={{ ...inputStyle, width: '100%' }}
                    required
                    data-testid="transaction-date-input"
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5A5A5A', marginBottom: '0.5rem' }}>Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    style={{ ...inputStyle, width: '100%' }}
                    placeholder="Enter description"
                    data-testid="transaction-description-input"
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5A5A5A', marginBottom: '0.5rem' }}>Category</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    style={{ ...inputStyle, width: '100%', cursor: 'pointer' }}
                    data-testid="transaction-category-select"
                  >
                    <option value="" style={{ background: '#0A0A0A' }}>Select category</option>
                    {categories
                      .filter(c => c.type === formData.type || c.type === 'both')
                      .map(cat => (
                        <option key={cat.id} value={cat.id} style={{ background: '#0A0A0A' }}>{cat.name}</option>
                      ))
                    }
                  </select>
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5A5A5A', marginBottom: '0.5rem' }}>Account</label>
                  <select
                    value={formData.account_id}
                    onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                    style={{ ...inputStyle, width: '100%', cursor: 'pointer' }}
                    data-testid="transaction-account-select"
                  >
                    <option value="" style={{ background: '#0A0A0A' }}>Select account</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id} style={{ background: '#0A0A0A' }}>{acc.name}</option>
                    ))}
                  </select>
                </div>
                
                <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem' }}>
                  <button 
                    type="button" 
                    onClick={() => setShowForm(false)} 
                    style={{
                      ...buttonStyle,
                      flex: 1,
                      justifyContent: 'center',
                      background: 'transparent',
                      border: '1px solid rgba(212, 175, 55, 0.2)',
                      color: '#D4AF37'
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    style={{
                      ...buttonStyle,
                      flex: 1,
                      justifyContent: 'center',
                      background: 'linear-gradient(135deg, #997B19 0%, #D4AF37 50%, #997B19 100%)',
                      color: '#000000',
                      boxShadow: '0 4px 16px rgba(212, 175, 55, 0.25)'
                    }}
                    data-testid="submit-transaction-btn"
                  >
                    {createMutation.isPending ? 'Saving...' : 'Save Transaction'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        input:focus, select:focus {
          border-color: rgba(212, 175, 55, 0.3) !important;
          box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.1), inset 0 2px 4px rgba(0, 0, 0, 0.2) !important;
        }
        @media (max-width: 768px) {
          [data-testid="transactions-page"] > div > div:nth-child(2) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
