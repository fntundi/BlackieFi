import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useEntity } from '../contexts/EntityContext';
import { toast } from 'sonner';
import { Plus, PieChart, X, TrendingUp } from 'lucide-react';

export default function Budgets() {
  const { selectedEntityId } = useEntity();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    month: new Date().toISOString().slice(0, 7),
    total_planned: '',
  });

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ['budgets', selectedEntityId],
    queryFn: () => api.getBudgets({ entity_id: selectedEntityId }),
    enabled: !!selectedEntityId,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', selectedEntityId],
    queryFn: () => api.getTransactions({ entity_id: selectedEntityId, limit: 500 }),
    enabled: !!selectedEntityId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.createBudget(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['budgets']);
      toast.success('Budget created');
      setShowForm(false);
      setFormData({ month: new Date().toISOString().slice(0, 7), total_planned: '' });
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteBudget(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['budgets']);
      toast.success('Budget deleted');
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      entity_id: selectedEntityId,
      total_planned: parseFloat(formData.total_planned) || 0,
      category_budgets: [],
    });
  };

  const getMonthlySpending = (month) => {
    return transactions
      .filter(t => t.date?.startsWith(month) && t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  };

  const formatCurrency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  const formatMonth = (monthStr) => {
    const [year, month] = monthStr.split('-');
    return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const inputStyle = {
    width: '100%',
    padding: '0.875rem 1rem',
    borderRadius: '12px',
    background: '#0A0A0A',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#F5F5F5',
    fontSize: '0.9375rem',
    outline: 'none',
    boxSizing: 'border-box'
  };

  return (
    <div style={{ padding: '2rem', background: '#050505', minHeight: '100%' }} data-testid="budgets-page">
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div>
            <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#D4AF37', marginBottom: '0.5rem' }}>Planning</p>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '700', color: '#F5F5F5', margin: 0 }}>Budgets</h1>
            <p style={{ marginTop: '0.5rem', color: '#525252' }}>Track your monthly spending limits</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.875rem 1.5rem',
              borderRadius: '12px',
              fontWeight: '600',
              background: 'linear-gradient(135deg, #C4A030 0%, #D4AF37 50%, #C4A030 100%)',
              color: '#000',
              border: 'none',
              cursor: 'pointer'
            }}
            data-testid="add-budget-btn"
          >
            <Plus style={{ width: '20px', height: '20px' }} />
            Add Budget
          </button>
        </div>

        {/* Budgets Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }} data-testid="budgets-grid">
          {budgets.map((budget) => {
            const spent = getMonthlySpending(budget.month);
            const planned = parseFloat(budget.total_planned) || 0;
            const progress = planned > 0 ? (spent / planned) * 100 : 0;
            const remaining = planned - spent;
            const isOverBudget = spent > planned;

            return (
              <div key={budget.id} style={{
                padding: '1.5rem',
                borderRadius: '16px',
                background: '#0A0A0A',
                border: `1px solid ${isOverBudget ? 'rgba(220, 38, 38, 0.3)' : 'rgba(212, 175, 55, 0.1)'}`,
                position: 'relative',
                overflow: 'hidden'
              }} data-testid={`budget-${budget.id}`}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#1A1A1A' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(progress, 100)}%`,
                    background: isOverBudget
                      ? 'linear-gradient(90deg, #DC2626, #EF4444)'
                      : 'linear-gradient(90deg, #997B19, #D4AF37, #F9F1D8)',
                    transition: 'width 0.5s'
                  }}></div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem', marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '0.75rem', borderRadius: '12px', background: isOverBudget ? 'rgba(220, 38, 38, 0.1)' : 'rgba(212, 175, 55, 0.1)' }}>
                      <PieChart style={{ width: '24px', height: '24px', color: isOverBudget ? '#DC2626' : '#D4AF37' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: '1.125rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>{formatMonth(budget.month)}</p>
                      <p style={{ fontSize: '0.75rem', color: '#525252', marginTop: '0.125rem' }}>Monthly Budget</p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(budget.id)}
                    style={{ padding: '0.5rem', borderRadius: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#525252' }}
                  >
                    <X style={{ width: '16px', height: '16px' }} />
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                  <div>
                    <p style={{ fontSize: '0.7rem', color: '#525252', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Budget</p>
                    <p style={{ fontFamily: 'monospace', fontSize: '1.25rem', fontWeight: '700', color: '#D4AF37', margin: 0 }}>{formatCurrency(planned)}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.7rem', color: '#525252', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Spent</p>
                    <p style={{ fontFamily: 'monospace', fontSize: '1.25rem', fontWeight: '700', color: isOverBudget ? '#DC2626' : '#F5F5F5', margin: 0 }}>{formatCurrency(spent)}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', color: isOverBudget ? '#DC2626' : '#059669' }}>
                    <TrendingUp style={{ width: '14px', height: '14px' }} />
                    <span>{isOverBudget ? 'Over by' : 'Remaining:'} {formatCurrency(Math.abs(remaining))}</span>
                  </div>
                  <span style={{ fontSize: '0.875rem', fontFamily: 'monospace', color: isOverBudget ? '#DC2626' : '#D4AF37' }}>{progress.toFixed(0)}%</span>
                </div>
              </div>
            );
          })}
          {!isLoading && budgets.length === 0 && (
            <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '4rem', color: '#525252' }}>
              <PieChart style={{ width: '48px', height: '48px', margin: '0 auto 1rem', opacity: 0.5 }} />
              <p>No budgets yet. Create your first monthly budget.</p>
            </div>
          )}
        </div>

        {/* Modal */}
        {showForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
            <div style={{ width: '100%', maxWidth: '400px', padding: '1.5rem', borderRadius: '20px', background: 'linear-gradient(180deg, #0F0F0F 0%, #0A0A0A 100%)', border: '1px solid rgba(212, 175, 55, 0.2)' }} data-testid="add-budget-modal">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>Add Budget</h2>
                <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#525252' }}>
                  <X style={{ width: '20px', height: '20px' }} />
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Month</label>
                  <input
                    type="month"
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                    style={inputStyle}
                    required
                    data-testid="budget-month-input"
                  />
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Budget Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.total_planned}
                    onChange={(e) => setFormData({ ...formData, total_planned: e.target.value })}
                    style={inputStyle}
                    placeholder="5000.00"
                    required
                    data-testid="budget-amount-input"
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: '0.875rem', borderRadius: '12px', fontWeight: '600', background: 'transparent', border: '1px solid rgba(212, 175, 55, 0.2)', color: '#D4AF37', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ flex: 1, padding: '0.875rem', borderRadius: '12px', fontWeight: '600', background: 'linear-gradient(135deg, #C4A030 0%, #D4AF37 50%, #C4A030 100%)', color: '#000', border: 'none', cursor: 'pointer' }} data-testid="submit-budget-btn">{createMutation.isPending ? 'Saving...' : 'Save Budget'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 1024px) { [data-testid="budgets-grid"] { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 640px) { [data-testid="budgets-grid"] { grid-template-columns: 1fr !important; } }
        input:focus { border-color: rgba(212, 175, 55, 0.5) !important; }
      `}</style>
    </div>
  );
}
