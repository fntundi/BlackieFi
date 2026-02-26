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
  Filter,
  X
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

  const { data: transactions = [], isLoading } = useQuery({
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

  return (
    <div className="page-container animate-fade-in" data-testid="transactions-page">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Transactions</h1>
            <p className="text-slate-400 mt-1">Track your income and expenses</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary"
            data-testid="add-transaction-btn"
          >
            <Plus className="w-5 h-5" />
            Add Transaction
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search transactions..."
              className="input pl-10"
              data-testid="search-transactions"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="input w-40"
              data-testid="filter-type"
            >
              <option value="">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>
        </div>

        {/* Transactions List */}
        <div className="card" data-testid="transactions-list">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500 mx-auto"></div>
            </div>
          ) : filteredTransactions.length > 0 ? (
            <div className="divide-y divide-slate-700">
              {filteredTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-4 px-2 hover:bg-slate-800/50 rounded-lg transition-colors -mx-2"
                  data-testid={`transaction-${tx.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${tx.type === 'income' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                      {tx.type === 'income' ? (
                        <ArrowUpRight className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <ArrowDownRight className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-white">{tx.description || 'Transaction'}</p>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span>{getCategoryName(tx.category_id)}</span>
                        <span>·</span>
                        <span>{getAccountName(tx.account_id)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className={`font-mono font-semibold ${tx.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
                        {tx.type === 'income' ? '+' : '-'}${parseFloat(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-slate-500">{tx.date}</p>
                    </div>
                    <button
                      onClick={() => deleteMutation.mutate(tx.id)}
                      className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      data-testid={`delete-transaction-${tx.id}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              No transactions found
            </div>
          )}
        </div>

        {/* Add Transaction Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="card w-full max-w-md" data-testid="add-transaction-modal">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Add Transaction</h2>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="input"
                    data-testid="transaction-type-select"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                    <option value="transfer">Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="label">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="input"
                    placeholder="0.00"
                    required
                    data-testid="transaction-amount-input"
                  />
                </div>
                <div>
                  <label className="label">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="input"
                    required
                    data-testid="transaction-date-input"
                  />
                </div>
                <div>
                  <label className="label">Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input"
                    placeholder="Enter description"
                    data-testid="transaction-description-input"
                  />
                </div>
                <div>
                  <label className="label">Category</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="input"
                    data-testid="transaction-category-select"
                  >
                    <option value="">Select category</option>
                    {categories
                      .filter(c => c.type === formData.type || c.type === 'both')
                      .map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))
                    }
                  </select>
                </div>
                <div>
                  <label className="label">Account</label>
                  <select
                    value={formData.account_id}
                    onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                    className="input"
                    data-testid="transaction-account-select"
                  >
                    <option value="">Select account</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary flex-1">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary flex-1" data-testid="submit-transaction-btn">
                    {createMutation.isPending ? 'Saving...' : 'Save Transaction'}
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
