import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useEntity } from '../contexts/EntityContext';
import { toast } from 'sonner';
import { Plus, Tags, X } from 'lucide-react';

export default function Categories() {
  const { selectedEntityId } = useEntity();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'expense',
  });

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories', selectedEntityId],
    queryFn: () => api.getCategories({ entity_id: selectedEntityId }),
    enabled: !!selectedEntityId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['categories']);
      toast.success('Category created');
      setShowForm(false);
      setFormData({ name: '', type: 'expense' });
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['categories']);
      toast.success('Category deleted');
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      entity_id: selectedEntityId,
    });
  };

  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  return (
    <div className="page-container animate-fade-in" data-testid="categories-page">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Categories</h1>
            <p className="text-slate-400 mt-1">Organize your transactions</p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn btn-primary" data-testid="add-category-btn">
            <Plus className="w-5 h-5" />
            Add Category
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="card" data-testid="expense-categories">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded-full"></span>
              Expense Categories
            </h2>
            <div className="space-y-2">
              {expenseCategories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg group">
                  <div className="flex items-center gap-3">
                    <Tags className="w-4 h-4 text-red-500" />
                    <span className="text-white">{cat.name}</span>
                    {cat.is_default && <span className="badge badge-info">Default</span>}
                  </div>
                  {!cat.is_default && (
                    <button
                      onClick={() => deleteMutation.mutate(cat.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-500 transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {expenseCategories.length === 0 && (
                <p className="text-slate-500 text-center py-4">No expense categories</p>
              )}
            </div>
          </div>

          <div className="card" data-testid="income-categories">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="w-3 h-3 bg-emerald-500 rounded-full"></span>
              Income Categories
            </h2>
            <div className="space-y-2">
              {incomeCategories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg group">
                  <div className="flex items-center gap-3">
                    <Tags className="w-4 h-4 text-emerald-500" />
                    <span className="text-white">{cat.name}</span>
                    {cat.is_default && <span className="badge badge-info">Default</span>}
                  </div>
                  {!cat.is_default && (
                    <button
                      onClick={() => deleteMutation.mutate(cat.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-500 transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {incomeCategories.length === 0 && (
                <p className="text-slate-500 text-center py-4">No income categories</p>
              )}
            </div>
          </div>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="card w-full max-w-md" data-testid="add-category-modal">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Add Category</h2>
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
                    placeholder="e.g., Groceries"
                    required
                    data-testid="category-name-input"
                  />
                </div>
                <div>
                  <label className="label">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="input"
                    data-testid="category-type-select"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary flex-1">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary flex-1" data-testid="submit-category-btn">
                    {createMutation.isPending ? 'Saving...' : 'Save Category'}
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
