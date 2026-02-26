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
  X,
  Receipt
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

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const inputStyle = {
    background: 'rgba(10, 10, 10, 0.8)',
    border: '1px solid rgba(212, 175, 55, 0.15)',
    color: '#F5F5F5'
  };

  return (
    <div className="p-8 animate-fade-in" style={{ background: '#050505', minHeight: '100vh' }} data-testid="transactions-page">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#D4AF37' }}>Finances</p>
            <h1 className="text-4xl font-display font-bold" style={{ color: '#F5F5F5' }}>Transactions</h1>
            <p className="mt-2" style={{ color: '#6E6E6E' }}>Track your income and expenses</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #997B19 0%, #D4AF37 50%, #997B19 100%)',
              color: '#000000',
              boxShadow: '0 4px 20px rgba(212, 175, 55, 0.3)'
            }}
            data-testid="add-transaction-btn"
          >
            <Plus className="w-5 h-5" />
            Add Transaction
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#6E6E6E' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search transactions..."
              className="w-full py-3 pl-12 pr-4 rounded-lg transition-all duration-300 focus:outline-none"
              style={inputStyle}
              data-testid="search-transactions"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="py-3 px-4 rounded-lg transition-all duration-300 focus:outline-none cursor-pointer"
            style={inputStyle}
            data-testid="filter-type"
          >
            <option value="" style={{ background: '#0A0A0A' }}>All Types</option>
            <option value="income" style={{ background: '#0A0A0A' }}>Income</option>
            <option value="expense" style={{ background: '#0A0A0A' }}>Expense</option>
            <option value="transfer" style={{ background: '#0A0A0A' }}>Transfer</option>
          </select>
        </div>

        {/* Transactions List */}
        <div className="rounded-2xl p-6" style={{
          background: '#0A0A0A',
          border: '1px solid rgba(212, 175, 55, 0.1)'
        }} data-testid="transactions-list">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{
                borderColor: 'rgba(212, 175, 55, 0.2)',
                borderTopColor: '#D4AF37'
              }}></div>
            </div>
          ) : filteredTransactions.length > 0 ? (
            <div className="space-y-3">
              {filteredTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-4 rounded-xl transition-all duration-300"
                  style={{
                    background: '#0F0F0F',
                    border: '1px solid rgba(255, 255, 255, 0.03)'
                  }}
                  data-testid={`transaction-${tx.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl" style={{
                      background: tx.type === 'income' ? 'rgba(5, 150, 105, 0.1)' : 'rgba(220, 38, 38, 0.1)'
                    }}>
                      {tx.type === 'income' ? (
                        <ArrowUpRight className="w-5 h-5" style={{ color: '#059669' }} />
                      ) : (
                        <ArrowDownRight className="w-5 h-5" style={{ color: '#DC2626' }} />
                      )}
                    </div>
                    <div>
                      <p className="font-medium" style={{ color: '#F5F5F5' }}>{tx.description || 'Transaction'}</p>
                      <div className="flex items-center gap-2 text-sm" style={{ color: '#525252' }}>
                        <span>{getCategoryName(tx.category_id)}</span>
                        <span>·</span>
                        <span>{getAccountName(tx.account_id)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="font-mono font-semibold" style={{
                        color: tx.type === 'income' ? '#059669' : '#DC2626'
                      }}>
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(parseFloat(tx.amount))}
                      </p>
                      <p className="text-xs" style={{ color: '#525252' }}>{tx.date}</p>
                    </div>
                    <button
                      onClick={() => deleteMutation.mutate(tx.id)}
                      className="p-2 rounded-lg transition-all duration-300"
                      style={{ color: '#525252' }}
                      data-testid={`delete-transaction-${tx.id}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Receipt className="w-12 h-12 mx-auto mb-4" style={{ color: '#525252' }} />
              <p style={{ color: '#525252' }}>No transactions found</p>
            </div>
          )}
        </div>

        {/* Add Transaction Modal */}
        {showForm && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0, 0, 0, 0.8)' }}>
            <div className="w-full max-w-md rounded-2xl p-6" style={{
              background: 'linear-gradient(180deg, #0F0F0F 0%, #0A0A0A 100%)',
              border: '1px solid rgba(212, 175, 55, 0.2)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }} data-testid="add-transaction-modal">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold" style={{ color: '#F5F5F5' }}>Add Transaction</h2>
                <button onClick={() => setShowForm(false)} style={{ color: '#6E6E6E' }}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full py-3 px-4 rounded-lg focus:outline-none cursor-pointer"
                    style={inputStyle}
                    data-testid="transaction-type-select"
                  >
                    <option value="expense" style={{ background: '#0A0A0A' }}>Expense</option>
                    <option value="income" style={{ background: '#0A0A0A' }}>Income</option>
                    <option value="transfer" style={{ background: '#0A0A0A' }}>Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="label">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full py-3 px-4 rounded-lg focus:outline-none"
                    style={inputStyle}
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
                    className="w-full py-3 px-4 rounded-lg focus:outline-none"
                    style={inputStyle}
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
                    className="w-full py-3 px-4 rounded-lg focus:outline-none"
                    style={inputStyle}
                    placeholder="Enter description"
                    data-testid="transaction-description-input"
                  />
                </div>
                <div>
                  <label className="label">Category</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full py-3 px-4 rounded-lg focus:outline-none cursor-pointer"
                    style={inputStyle}
                    data-testid="transaction-category-select"
                  >
                    <option value="" style={{ background: '#0A0A0A' }}>Select category</option>
                    {categories
                      .filter(c => c.type === formData.type || c.type === 'both')
                      .map(cat => (
                        <option key={cat.id} value={cat.id} style={{ background: '#0A0A0A' }}>{cat.name}</option>
                      ))
                    }
                  </select>
                </div>
                <div>
                  <label className="label">Account</label>
                  <select
                    value={formData.account_id}
                    onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                    className="w-full py-3 px-4 rounded-lg focus:outline-none cursor-pointer"
                    style={inputStyle}
                    data-testid="transaction-account-select"
                  >
                    <option value="" style={{ background: '#0A0A0A' }}>Select account</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id} style={{ background: '#0A0A0A' }}>{acc.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowForm(false)} 
                    className="flex-1 py-3 rounded-lg font-semibold transition-all duration-300"
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(212, 175, 55, 0.2)',
                      color: '#D4AF37'
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-3 rounded-lg font-semibold transition-all duration-300"
                    style={{
                      background: 'linear-gradient(135deg, #997B19 0%, #D4AF37 50%, #997B19 100%)',
                      color: '#000000'
                    }}
                    data-testid="submit-transaction-btn"
                  >
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
