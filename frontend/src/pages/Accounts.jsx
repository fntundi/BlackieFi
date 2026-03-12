import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useEntity } from '../contexts/EntityContext';
import { toast } from 'sonner';
import { Plus, Wallet, X, CreditCard, PiggyBank, Banknote, Building2 } from 'lucide-react';
import { tileStyles, headerStyles, inputStyles, buttonStyles, GoldAccentLine, formatCurrency } from '../styles/tileStyles';

const ACCOUNT_ICONS = {
  checking: Wallet,
  savings: PiggyBank,
  credit_card: CreditCard,
  cash: Banknote,
  money_market: Building2,
  brokerage: Building2,
  other: Wallet,
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

  return (
    <div style={{ padding: '2rem', background: '#050505', minHeight: '100%' }} data-testid="accounts-page">
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
          <div>
            <p style={headerStyles.label}>Finance</p>
            <h1 style={headerStyles.title}>Accounts</h1>
            <p style={headerStyles.subtitle}>Manage your bank accounts and cash</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            style={buttonStyles.primary}
            data-testid="add-account-btn"
          >
            <Plus style={{ width: '20px', height: '20px' }} />
            Add Account
          </button>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
          {/* Total Balance */}
          <div style={tileStyles.statGold} data-testid="total-balance">
            <GoldAccentLine />
            <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8A8A', marginBottom: '0.75rem' }}>
              Total Balance
            </p>
            <p style={{ fontFamily: 'monospace', fontSize: '2rem', fontWeight: '700', color: totalBalance >= 0 ? '#D4AF37' : '#DC2626', margin: 0 }}>
              {formatCurrency(totalBalance)}
            </p>
          </div>

          {/* Accounts Count */}
          <div style={tileStyles.stat}>
            <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8A8A', marginBottom: '0.75rem' }}>
              Active Accounts
            </p>
            <p style={{ fontFamily: 'monospace', fontSize: '2rem', fontWeight: '700', color: '#F5F5F5', margin: 0 }}>
              {accounts.length}
            </p>
          </div>

          {/* Average Balance */}
          <div style={tileStyles.stat}>
            <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8A8A', marginBottom: '0.75rem' }}>
              Average Balance
            </p>
            <p style={{ fontFamily: 'monospace', fontSize: '2rem', fontWeight: '700', color: '#F5F5F5', margin: 0 }}>
              {formatCurrency(accounts.length > 0 ? totalBalance / accounts.length : 0)}
            </p>
          </div>
        </div>

        {/* Accounts Grid */}
        <div style={tileStyles.content}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#F5F5F5', marginBottom: '1.5rem' }}>Your Accounts</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }} data-testid="accounts-grid">
            {accounts.map((account) => {
              const Icon = ACCOUNT_ICONS[account.type] || Wallet;
              const balance = parseFloat(account.balance);
              return (
                <div key={account.id} style={tileStyles.cardGold} data-testid={`account-${account.id}`}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{ 
                      padding: '0.75rem', 
                      borderRadius: '12px', 
                      background: 'rgba(212, 175, 55, 0.1)',
                      boxShadow: '0 0 20px rgba(212, 175, 55, 0.15)'
                    }}>
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
                  <p style={{ fontSize: '0.875rem', color: '#8A8A8A', textTransform: 'capitalize', marginTop: '0.25rem', marginBottom: '1rem' }}>
                    {account.type.replace('_', ' ')}
                  </p>
                  <p style={{ fontFamily: 'monospace', fontSize: '1.5rem', fontWeight: '700', color: balance >= 0 ? '#D4AF37' : '#DC2626', margin: 0 }}>
                    {formatCurrency(balance)}
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
        </div>

        {/* Modal */}
        {showForm && (
          <div style={tileStyles.modalOverlay}>
            <div style={tileStyles.modal}>
              <GoldAccentLine />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#F5F5F5', margin: 0 }}>Add Account</h2>
                <button
                  onClick={() => setShowForm(false)}
                  style={{ padding: '0.5rem', borderRadius: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#8A8A8A' }}
                >
                  <X style={{ width: '20px', height: '20px' }} />
                </button>
              </div>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Account Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Chase Checking"
                    style={inputStyles.base}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Account Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    style={inputStyles.base}
                  >
                    <option value="checking">Checking</option>
                    <option value="savings">Savings</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="cash">Cash</option>
                    <option value="money_market">Money Market</option>
                    <option value="brokerage">Brokerage</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Current Balance
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.balance}
                    onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                    placeholder="0.00"
                    style={inputStyles.base}
                  />
                </div>
                <button type="submit" style={{ ...buttonStyles.primary, justifyContent: 'center', marginTop: '0.5rem' }}>
                  Create Account
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
