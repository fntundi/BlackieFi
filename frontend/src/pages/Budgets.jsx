import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useEntity } from '../contexts/EntityContext';
import { toast } from 'sonner';
import { Plus, PieChart, X } from 'lucide-react';

export default function Budgets() {
  const { selectedEntityId } = useEntity();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [formData, setFormData] = useState({
    month: currentMonth,
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
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      entity_id: selectedEntityId,
      month: formData.month,
      total_planned: parseFloat(formData.total_planned) || 0,
      category_budgets: [],
    });
  };

  const getMonthlySpent = (month) => {
    return transactions
      .filter(t => t.type === 'expense' && t.date?.startsWith(month))
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  };

  return (
    <div className="page-container animate-fade-in" data-testid="budgets-page">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Budgets</h1>
            <p className="text-slate-400 mt-1">Plan and track your spending</p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn btn-primary" data-testid="add-budget-btn">
            <Plus className="w-5 h-5" />
            Create Budget
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="budgets-grid">
          {budgets.map((budget) => {
            const spent = getMonthlySpent(budget.month);
            const progress = budget.total_planned > 0 ? (spent / budget.total_planned) * 100 : 0;
            const isOverBudget = spent > budget.total_planned;

            return (
              <div key={budget.id} className="card" data-testid={`budget-${budget.id}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-cyan-500/10 rounded-lg">
                    <PieChart className="w-6 h-6 text-cyan-500" />
                  </div>
                  <span className="text-sm text-slate-500">{budget.month}</span>
                </div>
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">Spent</span>
                    <span className={isOverBudget ? 'text-red-500' : 'text-white'}>
                      ${spent.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="progress">
                    <div
                      className="progress-bar"
                      style={{
                        width: `${Math.min(progress, 100)}%`,
                        background: isOverBudget
                          ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                          : 'linear-gradient(90deg, #10b981, #06b6d4)'
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>{progress.toFixed(0)}% used</span>
                    <span>Budget: ${parseFloat(budget.total_planned).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-slate-700">
                  <span className="text-sm text-slate-400">Remaining</span>
                  <span className={`font-mono font-semibold ${isOverBudget ? 'text-red-500' : 'text-emerald-500'}`}>
                    ${(budget.total_planned - spent).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            );
          })}
          {!isLoading && budgets.length === 0 && (
            <div className="col-span-3 text-center py-12 text-slate-500">
              No budgets yet. Create your first budget to start tracking.
            </div>
          )}
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="card w-full max-w-md" data-testid="add-budget-modal">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Create Budget</h2>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Month</label>
                  <input
                    type="month"
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                    className="input"
                    required
                    data-testid="budget-month-input"
                  />
                </div>
                <div>
                  <label className="label">Total Budget</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.total_planned}
                    onChange={(e) => setFormData({ ...formData, total_planned: e.target.value })}
                    className="input"
                    placeholder="0.00"
                    required
                    data-testid="budget-amount-input"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary flex-1">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary flex-1" data-testid="submit-budget-btn">
                    {createMutation.isPending ? 'Saving...' : 'Create Budget'}
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
