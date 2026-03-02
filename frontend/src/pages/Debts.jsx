import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useEntity } from '../contexts/EntityContext';
import { toast } from 'sonner';
import { Plus, CreditCard, X, TrendingDown, Calendar, Percent, AlertTriangle, DollarSign } from 'lucide-react';
import { tileStyles, headerStyles, inputStyles, buttonStyles, RedAccentLine, formatCurrency, formatDate } from '../styles/tileStyles';

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
  const totalOriginal = debts.reduce((sum, d) => sum + parseFloat(d.original_amount || 0), 0);
  const totalPaid = totalOriginal - totalDebt;
  const monthlyPayments = debts.reduce((sum, d) => sum + parseFloat(d.minimum_payment || 0), 0);

  const getDebtTypeLabel = (type) => {
    const labels = {
      loan: 'Loan',
      credit_card: 'Credit Card',
      line_of_credit: 'Line of Credit',
      mortgage: 'Mortgage',
      student_loan: 'Student Loan',
      auto_loan: 'Auto Loan',
      other: 'Other',
    };
    return labels[type] || type;
  };

  return (
    <div style={{ padding: '2rem', background: '#050505', minHeight: '100%' }} data-testid="debts-page">
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
          <div>
            <p style={headerStyles.label}>Liabilities</p>
            <h1 style={headerStyles.title}>Debts</h1>
            <p style={headerStyles.subtitle}>Track and manage your debts</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            style={buttonStyles.primary}
            data-testid="add-debt-btn"
          >
            <Plus style={{ width: '20px', height: '20px' }} />
            Add Debt
          </button>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
          {/* Total Debt */}
          <div style={tileStyles.statRed} data-testid="total-debt">
            <RedAccentLine />
            <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8A8A', marginBottom: '0.75rem' }}>
              Total Debt
            </p>
            <p style={{ fontFamily: 'monospace', fontSize: '1.75rem', fontWeight: '700', color: '#DC2626', margin: 0 }}>
              {formatCurrency(totalDebt)}
            </p>
          </div>

          {/* Amount Paid */}
          <div style={tileStyles.statGreen}>
            <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8A8A', marginBottom: '0.75rem' }}>
              Amount Paid
            </p>
            <p style={{ fontFamily: 'monospace', fontSize: '1.75rem', fontWeight: '700', color: '#059669', margin: 0 }}>
              {formatCurrency(totalPaid > 0 ? totalPaid : 0)}
            </p>
          </div>

          {/* Monthly Payments */}
          <div style={tileStyles.stat}>
            <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8A8A', marginBottom: '0.75rem' }}>
              Monthly Payments
            </p>
            <p style={{ fontFamily: 'monospace', fontSize: '1.75rem', fontWeight: '700', color: '#F5F5F5', margin: 0 }}>
              {formatCurrency(monthlyPayments)}
            </p>
          </div>

          {/* Active Debts */}
          <div style={tileStyles.stat}>
            <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8A8A', marginBottom: '0.75rem' }}>
              Active Debts
            </p>
            <p style={{ fontFamily: 'monospace', fontSize: '1.75rem', fontWeight: '700', color: '#F5F5F5', margin: 0 }}>
              {debts.length}
            </p>
          </div>
        </div>

        {/* Debts Grid */}
        <div style={tileStyles.content}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#F5F5F5', marginBottom: '1.5rem' }}>Your Debts</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }} data-testid="debts-grid">
            {debts.map((debt) => {
              const progress = debt.original_amount > 0 ? ((debt.original_amount - debt.current_balance) / debt.original_amount) * 100 : 0;
              
              return (
                <div key={debt.id} style={{
                  ...tileStyles.card,
                  border: '1px solid rgba(220, 38, 38, 0.1)',
                }} data-testid={`debt-${debt.id}`}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ 
                        padding: '0.75rem', 
                        borderRadius: '12px', 
                        background: 'rgba(220, 38, 38, 0.1)',
                        boxShadow: '0 0 20px rgba(220, 38, 38, 0.15)'
                      }}>
                        <CreditCard style={{ width: '24px', height: '24px', color: '#DC2626' }} />
                      </div>
                      <div>
                        <p style={{ fontSize: '1.125rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>{debt.name}</p>
                        <p style={{ fontSize: '0.8rem', color: '#8A8A8A', margin: '0.25rem 0 0 0' }}>{getDebtTypeLabel(debt.type)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteMutation.mutate(debt.id)}
                      style={{ padding: '0.5rem', borderRadius: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#525252' }}
                    >
                      <X style={{ width: '16px', height: '16px' }} />
                    </button>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', color: '#8A8A8A' }}>Paid Off</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#059669' }}>{progress.toFixed(1)}%</span>
                    </div>
                    <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)', overflow: 'hidden' }}>
                      <div style={{ 
                        height: '100%', 
                        width: `${Math.min(progress, 100)}%`, 
                        borderRadius: '4px',
                        background: 'linear-gradient(90deg, #059669, #10B981)',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>

                  {/* Values */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <p style={{ fontSize: '0.7rem', color: '#8A8A8A', margin: 0, textTransform: 'uppercase' }}>Current Balance</p>
                      <p style={{ fontFamily: 'monospace', fontSize: '1.25rem', fontWeight: '700', color: '#DC2626', margin: '0.25rem 0 0 0' }}>
                        {formatCurrency(debt.current_balance)}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.7rem', color: '#8A8A8A', margin: 0, textTransform: 'uppercase' }}>Original Amount</p>
                      <p style={{ fontFamily: 'monospace', fontSize: '1.25rem', fontWeight: '700', color: '#8A8A8A', margin: '0.25rem 0 0 0' }}>
                        {formatCurrency(debt.original_amount)}
                      </p>
                    </div>
                  </div>

                  {/* Details Row */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    {debt.interest_rate && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Percent style={{ width: '14px', height: '14px', color: '#8A8A8A' }} />
                        <span style={{ fontSize: '0.8rem', color: '#8A8A8A' }}>{debt.interest_rate}% APR</span>
                      </div>
                    )}
                    {debt.minimum_payment && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <DollarSign style={{ width: '14px', height: '14px', color: '#8A8A8A' }} />
                        <span style={{ fontSize: '0.8rem', color: '#8A8A8A' }}>{formatCurrency(debt.minimum_payment)}/mo</span>
                      </div>
                    )}
                    {debt.next_payment_date && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar style={{ width: '14px', height: '14px', color: '#8A8A8A' }} />
                        <span style={{ fontSize: '0.8rem', color: '#8A8A8A' }}>Due: {formatDate(debt.next_payment_date)}</span>
                      </div>
                    )}
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
        </div>

        {/* Modal */}
        {showForm && (
          <div style={tileStyles.modalOverlay}>
            <div style={tileStyles.modal}>
              <RedAccentLine />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#F5F5F5', margin: 0 }}>Add Debt</h2>
                <button
                  onClick={() => setShowForm(false)}
                  style={{ padding: '0.5rem', borderRadius: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#8A8A8A' }}
                >
                  <X style={{ width: '20px', height: '20px' }} />
                </button>
              </div>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Debt Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Chase Credit Card"
                    style={inputStyles.base}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Debt Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    style={inputStyles.base}
                  >
                    <option value="loan">Loan</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="line_of_credit">Line of Credit</option>
                    <option value="mortgage">Mortgage</option>
                    <option value="student_loan">Student Loan</option>
                    <option value="auto_loan">Auto Loan</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Original Amount
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={formData.original_amount}
                      onChange={(e) => setFormData({ ...formData, original_amount: e.target.value })}
                      placeholder="10000"
                      style={inputStyles.base}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Current Balance
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={formData.current_balance}
                      onChange={(e) => setFormData({ ...formData, current_balance: e.target.value })}
                      placeholder="8500"
                      style={inputStyles.base}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Interest Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.interest_rate}
                      onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
                      placeholder="18.99"
                      style={inputStyles.base}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Minimum Payment
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.minimum_payment}
                      onChange={(e) => setFormData({ ...formData, minimum_payment: e.target.value })}
                      placeholder="250"
                      style={inputStyles.base}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Next Payment Date
                  </label>
                  <input
                    type="date"
                    value={formData.next_payment_date}
                    onChange={(e) => setFormData({ ...formData, next_payment_date: e.target.value })}
                    style={inputStyles.base}
                  />
                </div>
                <button type="submit" style={{ ...buttonStyles.primary, justifyContent: 'center', marginTop: '0.5rem', background: 'linear-gradient(135deg, #B91C1C 0%, #DC2626 50%, #B91C1C 100%)' }}>
                  Add Debt
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
