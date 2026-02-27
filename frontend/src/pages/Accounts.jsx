import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useEntity } from '../contexts/EntityContext';
import { toast } from 'sonner';
import { Plus, Wallet, X, CreditCard, PiggyBank, Banknote } from 'lucide-react';

const ACCOUNT_ICONS = {
  checking: Wallet,
  savings: PiggyBank,
  credit_card: CreditCard,
  cash: Banknote,
};

export default function Accounts() {
  const { selectedEntityId } = useEntity();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'checking',
    balance: '',
    currency: 'USD',
  });

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts', selectedEntityId],
    queryFn: () => api.getAccounts({ entity_id: selectedEntityId }),
    enabled: !!selectedEntityId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.createAccount(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['accounts']);
      toast.success('Account created');
      setShowForm(false);
      setFormData({ name: '', type: 'checking', balance: '', currency: 'USD' });
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['accounts']);
      toast.success('Account deleted');
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      entity_id: selectedEntityId,
      balance: parseFloat(formData.balance) || 0,
    });
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance || 0), 0);
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
    <div style={{ padding: '2rem', background: '#050505', minHeight: '100%' }} data-testid="accounts-page">
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div>
            <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#D4AF37', marginBottom: '0.5rem' }}>Finance</p>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '700', color: '#F5F5F5', margin: 0 }}>Accounts</h1>
            <p style={{ marginTop: '0.5rem', color: '#525252' }}>Manage your bank accounts and cash</p>
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
            data-testid="add-account-btn"
          >
            <Plus style={{ width: '20px', height: '20px' }} />
            Add Account
          </button>
        </div>

        {/* Total Balance Card */}
        <div style={{
          padding: '1.5rem',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #0F0F0F 0%, #0A0A0A 100%)',
          border: '1px solid rgba(212, 175, 55, 0.2)',
          marginBottom: '2rem',
          position: 'relative',
          overflow: 'hidden'
        }} data-testid="total-balance">
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)' }}></div>
          <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#525252', marginBottom: '0.5rem' }}>Total Balance</p>
          <p style={{ fontFamily: 'monospace', fontSize: '2.5rem', fontWeight: '700', color: totalBalance >= 0 ? '#D4AF37' : '#DC2626', margin: 0 }}>
            {formatCurrency(totalBalance)}
          </p>
        </div>

        {/* Accounts Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }} data-testid="accounts-grid">
          {accounts.map((account) => {
            const Icon = ACCOUNT_ICONS[account.type] || Wallet;
            return (
              <div key={account.id} style={{
                padding: '1.5rem',
                borderRadius: '16px',
                background: '#0A0A0A',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                transition: 'all 0.3s'
              }} data-testid={`account-${account.id}`}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(212, 175, 55, 0.1)' }}>
                    <Icon style={{ width: '24px', height: '24px', color: '#D4AF37' }} />
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(account.id)}
                    style={{
                      padding: '0.5rem',
                      borderRadius: '8px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#525252',
                      transition: 'all 0.2s'
                    }}
                  >
                    <X style={{ width: '16px', height: '16px' }} />
                  </button>
                </div>
                <p style={{ fontSize: '1.125rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>{account.name}</p>
                <p style={{ fontSize: '0.875rem', color: '#525252', textTransform: 'capitalize', marginTop: '0.25rem', marginBottom: '1rem' }}>{account.type.replace('_', ' ')}</p>
                <p style={{ fontFamily: 'monospace', fontSize: '1.5rem', fontWeight: '700', color: parseFloat(account.balance) >= 0 ? '#D4AF37' : '#DC2626', margin: 0 }}>
                  {formatCurrency(parseFloat(account.balance))}
                </p>
              </div>
            );
          })}
          {!isLoading && accounts.length === 0 && (
            <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '4rem', color: '#525252' }}>
              <Wallet style={{ width: '48px', height: '48px', margin: '0 auto 1rem', opacity: 0.5 }} />
              <p>No accounts yet. Add your first account to get started.</p>
            </div>
          )}
        </div>

        {/* Modal */}
        {showForm && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '1rem'
          }}>
            <div style={{
              width: '100%',
              maxWidth: '400px',
              padding: '1.5rem',
              borderRadius: '20px',
              background: 'linear-gradient(180deg, #0F0F0F 0%, #0A0A0A 100%)',
              border: '1px solid rgba(212, 175, 55, 0.2)'
            }} data-testid="add-account-modal">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>Add Account</h2>
                <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#525252' }}>
                  <X style={{ width: '20px', height: '20px' }} />
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Account Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={inputStyle}
                    placeholder="e.g., Main Checking"
                    required
                    data-testid="account-name-input"
                  />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                    data-testid="account-type-select"
                  >
                    <option value="checking" style={{ background: '#0A0A0A' }}>Checking</option>
                    <option value="savings" style={{ background: '#0A0A0A' }}>Savings</option>
                    <option value="credit_card" style={{ background: '#0A0A0A' }}>Credit Card</option>
                    <option value="cash" style={{ background: '#0A0A0A' }}>Cash</option>
                  </select>
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Current Balance</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.balance}
                    onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                    style={inputStyle}
                    placeholder="0.00"
                    data-testid="account-balance-input"
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="button" onClick={() => setShowForm(false)} style={{
                    flex: 1,
                    padding: '0.875rem',
                    borderRadius: '12px',
                    fontWeight: '600',
                    background: 'transparent',
                    border: '1px solid rgba(212, 175, 55, 0.2)',
                    color: '#D4AF37',
                    cursor: 'pointer'
                  }}>
                    Cancel
                  </button>
                  <button type="submit" style={{
                    flex: 1,
                    padding: '0.875rem',
                    borderRadius: '12px',
                    fontWeight: '600',
                    background: 'linear-gradient(135deg, #C4A030 0%, #D4AF37 50%, #C4A030 100%)',
                    color: '#000',
                    border: 'none',
                    cursor: 'pointer'
                  }} data-testid="submit-account-btn">
                    {createMutation.isPending ? 'Saving...' : 'Save Account'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 1024px) {
          [data-testid="accounts-grid"] { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 640px) {
          [data-testid="accounts-grid"] { grid-template-columns: 1fr !important; }
        }
        input:focus, select:focus { border-color: rgba(212, 175, 55, 0.5) !important; }
      `}</style>
    </div>
  );
}
