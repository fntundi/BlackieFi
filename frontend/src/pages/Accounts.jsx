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

  return (
    <div className="page-container animate-fade-in" data-testid="accounts-page">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Accounts</h1>
            <p className="text-slate-400 mt-1">Manage your bank accounts and cash</p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn btn-primary" data-testid="add-account-btn">
            <Plus className="w-5 h-5" />
            Add Account
          </button>
        </div>

        <div className="stat-card mb-8" data-testid="total-balance">
          <p className="text-slate-400">Total Balance</p>
          <p className={`stat-value ${totalBalance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="accounts-grid">
          {accounts.map((account) => {
            const Icon = ACCOUNT_ICONS[account.type] || Wallet;
            return (
              <div key={account.id} className="card group" data-testid={`account-${account.id}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-emerald-500/10 rounded-lg">
                    <Icon className="w-6 h-6 text-emerald-500" />
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(account.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-lg font-semibold text-white">{account.name}</p>
                <p className="text-sm text-slate-500 capitalize mb-4">{account.type.replace('_', ' ')}</p>
                <p className={`font-mono text-2xl font-bold ${parseFloat(account.balance) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {account.currency} {parseFloat(account.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            );
          })}
          {!isLoading && accounts.length === 0 && (
            <div className="col-span-3 text-center py-12 text-slate-500">
              No accounts yet. Add your first account to get started.
            </div>
          )}
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="card w-full max-w-md" data-testid="add-account-modal">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Add Account</h2>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Account Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    placeholder="e.g., Main Checking"
                    required
                    data-testid="account-name-input"
                  />
                </div>
                <div>
                  <label className="label">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="input"
                    data-testid="account-type-select"
                  >
                    <option value="checking">Checking</option>
                    <option value="savings">Savings</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
                <div>
                  <label className="label">Current Balance</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.balance}
                    onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                    className="input"
                    placeholder="0.00"
                    data-testid="account-balance-input"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary flex-1">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary flex-1" data-testid="submit-account-btn">
                    {createMutation.isPending ? 'Saving...' : 'Save Account'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
