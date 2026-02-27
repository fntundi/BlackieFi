import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useEntity } from '../contexts/EntityContext';
import { toast } from 'sonner';
import { Plus, CreditCard, X, TrendingDown, Calendar, Percent } from 'lucide-react';

export default function Debts() {
  const { selectedEntityId } = useEntity();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'loan',
    original_amount: '',
    current_balance: '',
    interest_rate: '',
    minimum_payment: '',
    payment_frequency: 'monthly',
    next_payment_date: '',
  });

  const { data: debts = [], isLoading } = useQuery({
    queryKey: ['debts', selectedEntityId],
    queryFn: () => api.getDebts({ entity_id: selectedEntityId }),
    enabled: !!selectedEntityId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.createDebt(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['debts']);
      toast.success('Debt added');
      setShowForm(false);
      setFormData({ name: '', type: 'loan', original_amount: '', current_balance: '', interest_rate: '', minimum_payment: '', payment_frequency: 'monthly', next_payment_date: '' });
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteDebt(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['debts']);
      toast.success('Debt removed');
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      entity_id: selectedEntityId,
      original_amount: parseFloat(formData.original_amount),
      current_balance: parseFloat(formData.current_balance),
      interest_rate: formData.interest_rate ? parseFloat(formData.interest_rate) : null,
      minimum_payment: formData.minimum_payment ? parseFloat(formData.minimum_payment) : null,
      next_payment_date: formData.next_payment_date || null,
    });
  };

  const totalDebt = debts.reduce((sum, d) => sum + parseFloat(d.current_balance || 0), 0);
  const formatCurrency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

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
    <div style={{ padding: '2rem', background: '#050505', minHeight: '100%' }} data-testid="debts-page">
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div>
            <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#D4AF37', marginBottom: '0.5rem' }}>Liabilities</p>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '700', color: '#F5F5F5', margin: 0 }}>Debts</h1>
            <p style={{ marginTop: '0.5rem', color: '#525252' }}>Track and manage your debts</p>
          </div>
          <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.875rem 1.5rem', borderRadius: '12px', fontWeight: '600', background: 'linear-gradient(135deg, #C4A030 0%, #D4AF37 50%, #C4A030 100%)', color: '#000', border: 'none', cursor: 'pointer' }} data-testid="add-debt-btn">
            <Plus style={{ width: '20px', height: '20px' }} />
            Add Debt
          </button>
        </div>

        {/* Total Debt Card */}
        <div style={{ padding: '1.5rem', borderRadius: '16px', background: 'linear-gradient(135deg, #0F0F0F 0%, #0A0A0A 100%)', border: '1px solid rgba(220, 38, 38, 0.2)', marginBottom: '2rem', position: 'relative', overflow: 'hidden' }} data-testid="total-debt">
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, #DC2626, transparent)' }}></div>
          <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#525252', marginBottom: '0.5rem' }}>Total Debt</p>
          <p style={{ fontFamily: 'monospace', fontSize: '2.5rem', fontWeight: '700', color: '#DC2626', margin: 0 }}>{formatCurrency(totalDebt)}</p>
        </div>

        {/* Debts Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }} data-testid="debts-grid">
          {debts.map((debt) => {
            const paidOff = ((parseFloat(debt.original_amount) - parseFloat(debt.current_balance)) / parseFloat(debt.original_amount)) * 100;
            return (
              <div key={debt.id} style={{ padding: '1.5rem', borderRadius: '16px', background: '#0A0A0A', border: '1px solid rgba(255, 255, 255, 0.06)', position: 'relative', overflow: 'hidden' }} data-testid={`debt-${debt.id}`}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#1A1A1A' }}>
                  <div style={{ height: '100%', width: `${Math.min(paidOff, 100)}%`, background: 'linear-gradient(90deg, #059669, #34D399)', transition: 'width 0.5s' }}></div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem', marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(220, 38, 38, 0.1)' }}>
                      <CreditCard style={{ width: '24px', height: '24px', color: '#DC2626' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: '1.125rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>{debt.name}</p>
                      <p style={{ fontSize: '0.75rem', color: '#525252', textTransform: 'capitalize', marginTop: '0.125rem' }}>{debt.type.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <button onClick={() => deleteMutation.mutate(debt.id)} style={{ padding: '0.5rem', borderRadius: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#525252' }}>
                    <X style={{ width: '16px', height: '16px' }} />
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <p style={{ fontSize: '0.7rem', color: '#525252', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Current Balance</p>
                    <p style={{ fontFamily: 'monospace', fontSize: '1.5rem', fontWeight: '700', color: '#DC2626', margin: 0 }}>{formatCurrency(parseFloat(debt.current_balance))}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.7rem', color: '#525252', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Original</p>
                    <p style={{ fontFamily: 'monospace', fontSize: '1.125rem', fontWeight: '600', color: '#737373', margin: 0 }}>{formatCurrency(parseFloat(debt.original_amount))}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  {debt.interest_rate && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', color: '#525252' }}>
                      <Percent style={{ width: '14px', height: '14px' }} />
                      <span>{debt.interest_rate}% APR</span>
                    </div>
                  )}
                  {debt.minimum_payment && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', color: '#525252' }}>
                      <TrendingDown style={{ width: '14px', height: '14px' }} />
                      <span>{formatCurrency(parseFloat(debt.minimum_payment))}/mo</span>
                    </div>
                  )}
                  {debt.next_payment_date && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', color: '#525252' }}>
                      <Calendar style={{ width: '14px', height: '14px' }} />
                      <span>{debt.next_payment_date}</span>
                    </div>
                  )}
                  <span style={{ marginLeft: 'auto', fontSize: '0.875rem', fontFamily: 'monospace', color: '#059669' }}>{paidOff.toFixed(0)}% paid</span>
                </div>
              </div>
            );
          })}
          {!isLoading && debts.length === 0 && (
            <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '4rem', color: '#525252' }}>
              <CreditCard style={{ width: '48px', height: '48px', margin: '0 auto 1rem', opacity: 0.5 }} />
              <p>No debts tracked. Add your debts to start managing them.</p>
            </div>
          )}
        </div>

        {/* Modal */}
        {showForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
            <div style={{ width: '100%', maxWidth: '450px', padding: '1.5rem', borderRadius: '20px', background: 'linear-gradient(180deg, #0F0F0F 0%, #0A0A0A 100%)', border: '1px solid rgba(212, 175, 55, 0.2)', maxHeight: '90vh', overflowY: 'auto' }} data-testid="add-debt-modal">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>Add Debt</h2>
                <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#525252' }}><X style={{ width: '20px', height: '20px' }} /></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Debt Name</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={inputStyle} placeholder="e.g., Car Loan" required data-testid="debt-name-input" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Type</label>
                    <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }} data-testid="debt-type-select">
                      <option value="loan" style={{ background: '#0A0A0A' }}>Loan</option>
                      <option value="credit_card" style={{ background: '#0A0A0A' }}>Credit Card</option>
                      <option value="line_of_credit" style={{ background: '#0A0A0A' }}>Line of Credit</option>
                      <option value="other" style={{ background: '#0A0A0A' }}>Other</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Interest Rate (%)</label>
                    <input type="number" step="0.01" value={formData.interest_rate} onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })} style={inputStyle} placeholder="5.99" data-testid="debt-rate-input" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Original Amount</label>
                    <input type="number" step="0.01" value={formData.original_amount} onChange={(e) => setFormData({ ...formData, original_amount: e.target.value })} style={inputStyle} placeholder="25000.00" required data-testid="debt-original-input" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Current Balance</label>
                    <input type="number" step="0.01" value={formData.current_balance} onChange={(e) => setFormData({ ...formData, current_balance: e.target.value })} style={inputStyle} placeholder="18000.00" required data-testid="debt-balance-input" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Min Payment</label>
                    <input type="number" step="0.01" value={formData.minimum_payment} onChange={(e) => setFormData({ ...formData, minimum_payment: e.target.value })} style={inputStyle} placeholder="450.00" data-testid="debt-payment-input" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Next Payment</label>
                    <input type="date" value={formData.next_payment_date} onChange={(e) => setFormData({ ...formData, next_payment_date: e.target.value })} style={inputStyle} data-testid="debt-next-date-input" />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: '0.875rem', borderRadius: '12px', fontWeight: '600', background: 'transparent', border: '1px solid rgba(212, 175, 55, 0.2)', color: '#D4AF37', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ flex: 1, padding: '0.875rem', borderRadius: '12px', fontWeight: '600', background: 'linear-gradient(135deg, #C4A030 0%, #D4AF37 50%, #C4A030 100%)', color: '#000', border: 'none', cursor: 'pointer' }} data-testid="submit-debt-btn">{createMutation.isPending ? 'Saving...' : 'Save Debt'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) { [data-testid="debts-grid"] { grid-template-columns: 1fr !important; } }
        input:focus, select:focus { border-color: rgba(212, 175, 55, 0.5) !important; }
      `}</style>
    </div>
  );
}
