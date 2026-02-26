import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useEntity } from '../contexts/EntityContext';
import { toast } from 'sonner';
import { Plus, CreditCard, X, TrendingDown } from 'lucide-react';

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
      setFormData({ name: '', type: 'loan', original_amount: '', current_balance: '', interest_rate: '', minimum_payment: '' });
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
      entity_id: selectedEntityId,
      name: formData.name,
      type: formData.type,
      original_amount: parseFloat(formData.original_amount),
      current_balance: parseFloat(formData.current_balance),
      interest_rate: formData.interest_rate ? parseFloat(formData.interest_rate) : null,
      minimum_payment: formData.minimum_payment ? parseFloat(formData.minimum_payment) : null,
    });
  };

  const totalDebt = debts.reduce((sum, d) => sum + parseFloat(d.current_balance || 0), 0);
  const totalOriginal = debts.reduce((sum, d) => sum + parseFloat(d.original_amount || 0), 0);
  const paidOff = totalOriginal - totalDebt;

  return (
    <div className="page-container animate-fade-in" data-testid="debts-page">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Debts</h1>
            <p className="text-slate-400 mt-1">Track and pay off your debts</p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn btn-primary" data-testid="add-debt-btn">
            <Plus className="w-5 h-5" />
            Add Debt
          </button>
        </div>

        <div className="grid-3 mb-8">
          <div className="stat-card" data-testid="total-debt">
            <p className="text-slate-400">Total Debt</p>
            <p className="stat-value text-red-500">${totalDebt.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="stat-card">
            <p className="text-slate-400">Original Total</p>
            <p className="stat-value text-amber-500">${totalOriginal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="stat-card">
            <p className="text-slate-400">Paid Off</p>
            <p className="stat-value text-emerald-500">${paidOff.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        <div className="space-y-4" data-testid="debts-list">
          {debts.map((debt) => {
            const progress = ((debt.original_amount - debt.current_balance) / debt.original_amount) * 100;
            return (
              <div key={debt.id} className="card" data-testid={`debt-${debt.id}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-500/10 rounded-lg">
                      <CreditCard className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{debt.name}</p>
                      <p className="text-sm text-slate-500 capitalize">{debt.type.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <div className="flex-1 max-w-md">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-400">{progress.toFixed(0)}% paid</span>
                      <span className="text-white">
                        ${parseFloat(debt.current_balance).toLocaleString()} / ${parseFloat(debt.original_amount).toLocaleString()}
                      </span>
                    </div>
                    <div className="progress">
                      <div className="progress-bar" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {debt.interest_rate && (
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Interest</p>
                        <p className="font-mono text-amber-500">{debt.interest_rate}%</p>
                      </div>
                    )}
                    {debt.minimum_payment && (
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Min Payment</p>
                        <p className="font-mono text-white">${parseFloat(debt.minimum_payment).toLocaleString()}</p>
                      </div>
                    )}
                    <button
                      onClick={() => deleteMutation.mutate(debt.id)}
                      className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {!isLoading && debts.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              No debts tracked. That's great! Or add your first debt to start tracking.
            </div>
          )}
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="card w-full max-w-md" data-testid="add-debt-modal">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Add Debt</h2>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    placeholder="e.g., Car Loan"
                    required
                    data-testid="debt-name-input"
                  />
                </div>
                <div>
                  <label className="label">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="input"
                    data-testid="debt-type-select"
                  >
                    <option value="loan">Loan</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="mortgage">Mortgage</option>
                    <option value="student_loan">Student Loan</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Original Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.original_amount}
                      onChange={(e) => setFormData({ ...formData, original_amount: e.target.value })}
                      className="input"
                      required
                      data-testid="debt-original-input"
                    />
                  </div>
                  <div>
                    <label className="label">Current Balance</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.current_balance}
                      onChange={(e) => setFormData({ ...formData, current_balance: e.target.value })}
                      className="input"
                      required
                      data-testid="debt-balance-input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Interest Rate %</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.interest_rate}
                      onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
                      className="input"
                      data-testid="debt-rate-input"
                    />
                  </div>
                  <div>
                    <label className="label">Min Payment</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.minimum_payment}
                      onChange={(e) => setFormData({ ...formData, minimum_payment: e.target.value })}
                      className="input"
                      data-testid="debt-payment-input"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary flex-1">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary flex-1" data-testid="submit-debt-btn">
                    {createMutation.isPending ? 'Saving...' : 'Add Debt'}
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
