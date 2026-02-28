import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useEntity } from '../contexts/EntityContext';
import { toast } from 'sonner';
import {
  Plus,
  PieChart,
  X,
  ChevronDown,
  ChevronRight,
  DollarSign,
  TrendingUp,
  Target,
  CreditCard,
  Calendar,
  AlertTriangle,
  Check,
  Copy,
  Sparkles,
  GripVertical,
  ArrowRight,
  Home,
  Car,
  Utensils,
  ShoppingBag,
  Zap,
  Heart,
  Briefcase,
  MoreHorizontal,
  Trash2
} from 'lucide-react';

// Budget category groups based on common financial planning
const CATEGORY_GROUPS = {
  'Housing': { icon: Home, color: '#3B82F6' },
  'Transportation': { icon: Car, color: '#8B5CF6' },
  'Food': { icon: Utensils, color: '#F59E0B' },
  'Utilities': { icon: Zap, color: '#06B6D4' },
  'Healthcare': { icon: Heart, color: '#EF4444' },
  'Personal': { icon: ShoppingBag, color: '#EC4899' },
  'Entertainment': { icon: Sparkles, color: '#10B981' },
  'Debt Payments': { icon: CreditCard, color: '#DC2626' },
  'Savings & Goals': { icon: Target, color: '#D4AF37' },
  'Business': { icon: Briefcase, color: '#6366F1' },
  'Other': { icon: MoreHorizontal, color: '#737373' },
};

// Map categories to groups
const getCategoryGroup = (categoryName) => {
  const name = categoryName?.toLowerCase() || '';
  if (name.includes('rent') || name.includes('mortgage') || name.includes('housing') || name.includes('home')) return 'Housing';
  if (name.includes('car') || name.includes('gas') || name.includes('transport') || name.includes('uber') || name.includes('lyft')) return 'Transportation';
  if (name.includes('food') || name.includes('grocery') || name.includes('restaurant') || name.includes('dining')) return 'Food';
  if (name.includes('electric') || name.includes('water') || name.includes('internet') || name.includes('phone') || name.includes('utility')) return 'Utilities';
  if (name.includes('health') || name.includes('medical') || name.includes('doctor') || name.includes('pharmacy')) return 'Healthcare';
  if (name.includes('clothing') || name.includes('shopping') || name.includes('personal')) return 'Personal';
  if (name.includes('entertainment') || name.includes('subscription') || name.includes('streaming') || name.includes('hobby')) return 'Entertainment';
  if (name.includes('loan') || name.includes('debt') || name.includes('credit')) return 'Debt Payments';
  if (name.includes('saving') || name.includes('goal') || name.includes('investment') || name.includes('emergency')) return 'Savings & Goals';
  if (name.includes('business') || name.includes('office') || name.includes('professional')) return 'Business';
  return 'Other';
};

export default function Budgets() {
  const { selectedEntityId } = useEntity();
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState(new Set(Object.keys(CATEGORY_GROUPS)));
  const [draggedTransaction, setDraggedTransaction] = useState(null);
  const [dragOverCategory, setDragOverCategory] = useState(null);

  // Fetch data
  const { data: budgets = [], isLoading: loadingBudgets } = useQuery({
    queryKey: ['budgets', selectedEntityId],
    queryFn: () => api.getBudgets({ entity_id: selectedEntityId }),
    enabled: !!selectedEntityId,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', selectedEntityId],
    queryFn: () => api.getTransactions({ entity_id: selectedEntityId, limit: 500 }),
    enabled: !!selectedEntityId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', selectedEntityId],
    queryFn: () => api.getCategories({ entity_id: selectedEntityId }),
    enabled: !!selectedEntityId,
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['goals', selectedEntityId],
    queryFn: () => api.getGoals({ entity_id: selectedEntityId, status: 'active' }),
    enabled: !!selectedEntityId,
  });

  const { data: debts = [] } = useQuery({
    queryKey: ['debts', selectedEntityId],
    queryFn: () => api.getDebts({ entity_id: selectedEntityId }),
    enabled: !!selectedEntityId,
  });

  const { data: bills = [] } = useQuery({
    queryKey: ['bills', selectedEntityId],
    queryFn: () => api.getBills(selectedEntityId),
    enabled: !!selectedEntityId,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', selectedEntityId],
    queryFn: () => api.getAccounts({ entity_id: selectedEntityId }),
    enabled: !!selectedEntityId,
  });

  // Get current budget or create a default one
  const currentBudget = useMemo(() => {
    return budgets.find(b => b.month === selectedMonth) || null;
  }, [budgets, selectedMonth]);

  // Calculate monthly income and expenses
  const monthlyData = useMemo(() => {
    const monthTransactions = transactions.filter(t => t.date?.startsWith(selectedMonth));
    const income = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    const expenses = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    
    // Get uncategorized transactions
    const uncategorized = monthTransactions.filter(t => t.type === 'expense' && !t.category_id);
    
    // Spending by category
    const spendingByCategory = {};
    monthTransactions.filter(t => t.type === 'expense').forEach(t => {
      const catId = t.category_id || 'uncategorized';
      spendingByCategory[catId] = (spendingByCategory[catId] || 0) + parseFloat(t.amount || 0);
    });
    
    return { income, expenses, uncategorized, spendingByCategory, transactions: monthTransactions };
  }, [transactions, selectedMonth]);

  // Category budgets with spending data
  const categoryBudgetData = useMemo(() => {
    if (!currentBudget) return [];
    
    const catMap = {};
    categories.forEach(c => { catMap[c.id] = c; });
    
    return (currentBudget.category_budgets || []).map(cb => {
      const category = catMap[cb.category_id];
      const spent = monthlyData.spendingByCategory[cb.category_id] || 0;
      const planned = cb.planned_amount || 0;
      const remaining = planned - spent;
      const percentage = planned > 0 ? (spent / planned) * 100 : 0;
      const group = getCategoryGroup(category?.name);
      
      return {
        ...cb,
        category,
        spent,
        remaining,
        percentage,
        group,
        isOverBudget: spent > planned,
        transactions: monthlyData.transactions.filter(t => t.category_id === cb.category_id && t.type === 'expense')
      };
    });
  }, [currentBudget, categories, monthlyData]);

  // Group category budgets
  const groupedBudgets = useMemo(() => {
    const groups = {};
    Object.keys(CATEGORY_GROUPS).forEach(g => { groups[g] = []; });
    
    categoryBudgetData.forEach(cb => {
      const group = cb.group || 'Other';
      if (groups[group]) {
        groups[group].push(cb);
      } else {
        groups['Other'].push(cb);
      }
    });
    
    return groups;
  }, [categoryBudgetData]);

  // Total budgeted amount
  const totalBudgeted = useMemo(() => {
    return categoryBudgetData.reduce((sum, cb) => sum + (cb.planned_amount || 0), 0);
  }, [categoryBudgetData]);

  // Left to budget (zero-based budgeting)
  const leftToBudget = monthlyData.income - totalBudgeted;

  // Mutations
  const createBudgetMutation = useMutation({
    mutationFn: (data) => api.createBudget(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['budgets']);
      toast.success('Budget created');
      setShowCreateModal(false);
    },
    onError: (error) => toast.error(error.message || 'Failed to create budget'),
  });

  const updateBudgetMutation = useMutation({
    mutationFn: ({ id, data }) => api.updateBudget(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['budgets']);
      toast.success('Budget updated');
    },
    onError: (error) => toast.error(error.message || 'Failed to update budget'),
  });

  const updateTransactionMutation = useMutation({
    mutationFn: ({ id, data }) => api.updateTransaction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['transactions']);
      toast.success('Transaction categorized');
    },
    onError: (error) => toast.error(error.message || 'Failed to update transaction'),
  });

  // Create budget from template
  const createFromTemplate = useCallback((template) => {
    const categoryBudgets = [];
    const categoryMap = {};
    categories.forEach(c => { categoryMap[c.name.toLowerCase()] = c.id; });
    
    if (template === 'previous' && budgets.length > 0) {
      // Copy from previous month
      const sorted = [...budgets].sort((a, b) => b.month.localeCompare(a.month));
      const prev = sorted.find(b => b.month < selectedMonth);
      if (prev) {
        createBudgetMutation.mutate({
          entity_id: selectedEntityId,
          month: selectedMonth,
          category_budgets: prev.category_budgets || [],
          total_planned: prev.total_planned || 0,
        });
        return;
      }
    }
    
    // 50/30/20 rule template
    if (template === '50-30-20') {
      const income = monthlyData.income || 5000;
      const needs = income * 0.5;
      const wants = income * 0.3;
      const savings = income * 0.2;
      
      // Distribute across categories
      categories.filter(c => c.type === 'expense' || c.type === 'both').forEach(cat => {
        const group = getCategoryGroup(cat.name);
        let amount = 0;
        
        if (['Housing', 'Utilities', 'Transportation', 'Healthcare', 'Food'].includes(group)) {
          amount = needs / 5;
        } else if (['Entertainment', 'Personal'].includes(group)) {
          amount = wants / 2;
        } else if (group === 'Savings & Goals') {
          amount = savings;
        }
        
        if (amount > 0) {
          categoryBudgets.push({ category_id: cat.id, planned_amount: Math.round(amount) });
        }
      });
    }
    
    createBudgetMutation.mutate({
      entity_id: selectedEntityId,
      month: selectedMonth,
      category_budgets: categoryBudgets,
      total_planned: categoryBudgets.reduce((sum, cb) => sum + cb.planned_amount, 0),
    });
  }, [categories, budgets, selectedMonth, selectedEntityId, monthlyData.income, createBudgetMutation]);

  // Handle category budget update
  const handleCategoryBudgetUpdate = useCallback((categoryId, newAmount) => {
    if (!currentBudget) return;
    
    const updatedBudgets = [...(currentBudget.category_budgets || [])];
    const idx = updatedBudgets.findIndex(cb => cb.category_id === categoryId);
    
    if (idx >= 0) {
      updatedBudgets[idx] = { ...updatedBudgets[idx], planned_amount: newAmount };
    } else {
      updatedBudgets.push({ category_id: categoryId, planned_amount: newAmount });
    }
    
    updateBudgetMutation.mutate({
      id: currentBudget.id,
      data: {
        entity_id: selectedEntityId,
        month: selectedMonth,
        category_budgets: updatedBudgets,
        total_planned: updatedBudgets.reduce((sum, cb) => sum + cb.planned_amount, 0),
      },
    });
    setEditingCategory(null);
  }, [currentBudget, selectedEntityId, selectedMonth, updateBudgetMutation]);

  // Add category to budget
  const handleAddCategory = useCallback((categoryId, amount) => {
    if (!currentBudget) {
      createBudgetMutation.mutate({
        entity_id: selectedEntityId,
        month: selectedMonth,
        category_budgets: [{ category_id: categoryId, planned_amount: amount }],
        total_planned: amount,
      });
    } else {
      const updatedBudgets = [...(currentBudget.category_budgets || [])];
      const existing = updatedBudgets.find(cb => cb.category_id === categoryId);
      if (!existing) {
        updatedBudgets.push({ category_id: categoryId, planned_amount: amount });
        updateBudgetMutation.mutate({
          id: currentBudget.id,
          data: {
            entity_id: selectedEntityId,
            month: selectedMonth,
            category_budgets: updatedBudgets,
            total_planned: updatedBudgets.reduce((sum, cb) => sum + cb.planned_amount, 0),
          },
        });
      }
    }
    setShowCategoryModal(false);
  }, [currentBudget, selectedEntityId, selectedMonth, createBudgetMutation, updateBudgetMutation]);

  // Remove category from budget
  const handleRemoveCategory = useCallback((categoryId) => {
    if (!currentBudget) return;
    
    const updatedBudgets = currentBudget.category_budgets.filter(cb => cb.category_id !== categoryId);
    updateBudgetMutation.mutate({
      id: currentBudget.id,
      data: {
        entity_id: selectedEntityId,
        month: selectedMonth,
        category_budgets: updatedBudgets,
        total_planned: updatedBudgets.reduce((sum, cb) => sum + cb.planned_amount, 0),
      },
    });
  }, [currentBudget, selectedEntityId, selectedMonth, updateBudgetMutation]);

  // Drag and drop handlers
  const handleDragStart = (e, transaction) => {
    setDraggedTransaction(transaction);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', transaction.id);
  };

  const handleDragOver = (e, categoryId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCategory(categoryId);
  };

  const handleDragLeave = () => {
    setDragOverCategory(null);
  };

  const handleDrop = (e, categoryId) => {
    e.preventDefault();
    setDragOverCategory(null);
    
    if (draggedTransaction) {
      updateTransactionMutation.mutate({
        id: draggedTransaction.id,
        data: {
          ...draggedTransaction,
          category_id: categoryId,
        },
      });
      setDraggedTransaction(null);
    }
  };

  const formatCurrency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  const formatMonth = (monthStr) => {
    const [year, month] = monthStr.split('-');
    return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const toggleGroup = (group) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(group)) {
      newExpanded.delete(group);
    } else {
      newExpanded.add(group);
    }
    setExpandedGroups(newExpanded);
  };

  // Tile styles
  const tileBase = {
    background: 'linear-gradient(145deg, #0D0D0D 0%, #080808 100%)',
    borderRadius: '20px',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    boxShadow: '0 4px 24px -4px rgba(0, 0, 0, 0.6), 0 8px 32px -8px rgba(0, 0, 0, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.03)',
    position: 'relative',
    overflow: 'hidden',
  };

  const contentTile = {
    ...tileBase,
    padding: '1.5rem',
    border: '1px solid rgba(212, 175, 55, 0.08)',
  };

  const innerTile = {
    background: 'linear-gradient(145deg, #0C0C0C 0%, #070707 100%)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.03)',
    boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.3)',
  };

  // Month navigation
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = -3; i <= 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      options.push(d.toISOString().slice(0, 7));
    }
    return options;
  }, []);

  // Categories not yet in budget
  const availableCategories = useMemo(() => {
    const budgetedIds = new Set(categoryBudgetData.map(cb => cb.category_id));
    return categories.filter(c => (c.type === 'expense' || c.type === 'both') && !budgetedIds.has(c.id));
  }, [categories, categoryBudgetData]);

  const totalAvailableFunds = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance || 0), 0);

  return (
    <div style={{ padding: '2rem', background: '#050505', minHeight: '100%' }} data-testid="budgets-page">
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#D4AF37', marginBottom: '0.75rem', textShadow: '0 0 20px rgba(212, 175, 55, 0.3)' }}>Zero-Based Budget</p>
            <h1 style={{ fontSize: '2.75rem', fontWeight: '700', color: '#F5F5F5', margin: 0, letterSpacing: '-0.02em' }}>Budget Planner</h1>
            <p style={{ marginTop: '0.5rem', color: '#525252', fontSize: '0.95rem' }}>Give every dollar a job</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Month Selector */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                background: 'linear-gradient(145deg, #0A0A0A 0%, #080808 100%)',
                border: '1px solid rgba(212, 175, 55, 0.15)',
                color: '#F5F5F5',
                fontSize: '0.95rem',
                cursor: 'pointer',
                outline: 'none'
              }}
              data-testid="month-selector"
            >
              {monthOptions.map(m => (
                <option key={m} value={m} style={{ background: '#0A0A0A' }}>{formatMonth(m)}</option>
              ))}
            </select>
            
            {!currentBudget && (
              <button
                onClick={() => setShowCreateModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.875rem 1.5rem',
                  borderRadius: '12px',
                  fontWeight: '600',
                  background: 'linear-gradient(135deg, #997B19 0%, #D4AF37 50%, #997B19 100%)',
                  color: '#000',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(212, 175, 55, 0.3)'
                }}
                data-testid="create-budget-btn"
              >
                <Plus style={{ width: '20px', height: '20px' }} />
                Create Budget
              </button>
            )}
          </div>
        </div>

        {/* Income & Budget Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem', marginBottom: '2rem' }}>
          {/* Income */}
          <div style={{
            ...tileBase,
            padding: '1.5rem',
            background: 'linear-gradient(145deg, #0A150A 0%, #080808 100%)',
            border: '1px solid rgba(5, 150, 105, 0.15)',
          }}>
            <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(5, 150, 105, 0.4), transparent)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ padding: '0.625rem', borderRadius: '10px', background: 'rgba(5, 150, 105, 0.15)', border: '1px solid rgba(5, 150, 105, 0.2)' }}>
                <TrendingUp style={{ width: '20px', height: '20px', color: '#059669' }} />
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5A5A5A' }}>Monthly Income</span>
            </div>
            <p style={{ fontFamily: 'monospace', fontSize: '2rem', fontWeight: '700', color: '#059669', margin: 0 }}>{formatCurrency(monthlyData.income)}</p>
          </div>

          {/* Total Budgeted */}
          <div style={{
            ...tileBase,
            padding: '1.5rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ padding: '0.625rem', borderRadius: '10px', background: 'rgba(212, 175, 55, 0.15)', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                <PieChart style={{ width: '20px', height: '20px', color: '#D4AF37' }} />
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5A5A5A' }}>Total Budgeted</span>
            </div>
            <p style={{ fontFamily: 'monospace', fontSize: '2rem', fontWeight: '700', color: '#D4AF37', margin: 0 }}>{formatCurrency(totalBudgeted)}</p>
          </div>

          {/* Left to Budget */}
          <div style={{
            ...tileBase,
            padding: '1.5rem',
            background: leftToBudget === 0 
              ? 'linear-gradient(145deg, #0F0E0A 0%, #0A0908 100%)'
              : leftToBudget > 0
              ? 'linear-gradient(145deg, #0D0D0D 0%, #080808 100%)'
              : 'linear-gradient(145deg, #150A0A 0%, #0A0808 100%)',
            border: leftToBudget === 0 
              ? '1px solid rgba(212, 175, 55, 0.25)'
              : leftToBudget > 0
              ? '1px solid rgba(255, 255, 255, 0.04)'
              : '1px solid rgba(220, 38, 38, 0.25)',
          }}>
            {leftToBudget === 0 && (
              <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: '2px', background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.6), transparent)' }} />
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ 
                padding: '0.625rem', 
                borderRadius: '10px', 
                background: leftToBudget === 0 ? 'rgba(212, 175, 55, 0.2)' : leftToBudget > 0 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(220, 38, 38, 0.15)',
                border: `1px solid ${leftToBudget === 0 ? 'rgba(212, 175, 55, 0.3)' : leftToBudget > 0 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(220, 38, 38, 0.2)'}`
              }}>
                {leftToBudget === 0 ? (
                  <Check style={{ width: '20px', height: '20px', color: '#D4AF37' }} />
                ) : leftToBudget > 0 ? (
                  <DollarSign style={{ width: '20px', height: '20px', color: '#3B82F6' }} />
                ) : (
                  <AlertTriangle style={{ width: '20px', height: '20px', color: '#DC2626' }} />
                )}
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5A5A5A' }}>
                {leftToBudget === 0 ? 'Fully Allocated!' : leftToBudget > 0 ? 'Left to Budget' : 'Over Budget'}
              </span>
            </div>
            <p style={{ 
              fontFamily: 'monospace', 
              fontSize: '2rem', 
              fontWeight: '700', 
              color: leftToBudget === 0 ? '#D4AF37' : leftToBudget > 0 ? '#3B82F6' : '#DC2626',
              margin: 0,
              textShadow: leftToBudget === 0 ? '0 0 20px rgba(212, 175, 55, 0.4)' : 'none'
            }}>{formatCurrency(Math.abs(leftToBudget))}</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
          {/* Budget Categories */}
          <div style={contentTile}>
            <div style={{ position: 'absolute', top: 0, left: '5%', right: '5%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.25), transparent)' }} />
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#D4AF37', marginBottom: '0.375rem' }}>Spending Plan</p>
                <h2 style={{ fontSize: '1.375rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>Budget Categories</h2>
              </div>
              {currentBudget && (
                <button
                  onClick={() => setShowCategoryModal(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(212, 175, 55, 0.1)',
                    border: '1px solid rgba(212, 175, 55, 0.2)',
                    color: '#D4AF37',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                  data-testid="add-category-btn"
                >
                  <Plus style={{ width: '16px', height: '16px' }} />
                  Add Category
                </button>
              )}
            </div>

            {!currentBudget ? (
              <div style={{ ...innerTile, textAlign: 'center', padding: '3rem' }}>
                <PieChart style={{ width: '48px', height: '48px', margin: '0 auto 1rem', color: '#3A3A3A' }} />
                <p style={{ color: '#5A5A5A', margin: '0 0 1rem' }}>No budget for {formatMonth(selectedMonth)}</p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => createFromTemplate('50-30-20')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      padding: '0.625rem 1rem',
                      borderRadius: '10px',
                      background: 'rgba(212, 175, 55, 0.1)',
                      border: '1px solid rgba(212, 175, 55, 0.2)',
                      color: '#D4AF37',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    <Sparkles style={{ width: '16px', height: '16px' }} />
                    Use 50/30/20 Rule
                  </button>
                  {budgets.length > 0 && (
                    <button
                      onClick={() => createFromTemplate('previous')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        padding: '0.625rem 1rem',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#A3A3A3',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                    >
                      <Copy style={{ width: '16px', height: '16px' }} />
                      Copy Previous Month
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {Object.entries(groupedBudgets).map(([groupName, items]) => {
                  if (items.length === 0) return null;
                  const GroupIcon = CATEGORY_GROUPS[groupName]?.icon || MoreHorizontal;
                  const groupColor = CATEGORY_GROUPS[groupName]?.color || '#737373';
                  const isExpanded = expandedGroups.has(groupName);
                  const groupTotal = items.reduce((sum, i) => sum + i.planned_amount, 0);
                  const groupSpent = items.reduce((sum, i) => sum + i.spent, 0);
                  const groupPercentage = groupTotal > 0 ? (groupSpent / groupTotal) * 100 : 0;
                  
                  return (
                    <div key={groupName} style={innerTile}>
                      {/* Group Header */}
                      <button
                        onClick={() => toggleGroup(groupName)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '1rem 1.25rem',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          borderBottom: isExpanded ? '1px solid rgba(255, 255, 255, 0.03)' : 'none'
                        }}
                        data-testid={`group-${groupName}`}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          {isExpanded ? <ChevronDown style={{ width: '16px', height: '16px', color: '#5A5A5A' }} /> : <ChevronRight style={{ width: '16px', height: '16px', color: '#5A5A5A' }} />}
                          <div style={{ padding: '0.5rem', borderRadius: '8px', background: `${groupColor}15`, border: `1px solid ${groupColor}25` }}>
                            <GroupIcon style={{ width: '16px', height: '16px', color: groupColor }} />
                          </div>
                          <span style={{ fontWeight: '600', color: '#E5E5E5', fontSize: '0.95rem' }}>{groupName}</span>
                          <span style={{ fontSize: '0.75rem', color: '#5A5A5A', marginLeft: '0.25rem' }}>({items.length})</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ fontFamily: 'monospace', fontWeight: '600', color: groupSpent > groupTotal ? '#DC2626' : '#E5E5E5', margin: 0, fontSize: '0.95rem' }}>
                              {formatCurrency(groupSpent)} / {formatCurrency(groupTotal)}
                            </p>
                          </div>
                          <div style={{ width: '80px', height: '6px', borderRadius: '999px', background: '#1A1A1A', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              width: `${Math.min(groupPercentage, 100)}%`,
                              borderRadius: '999px',
                              background: groupPercentage > 100 ? '#DC2626' : groupPercentage > 80 ? '#F59E0B' : groupColor,
                              transition: 'width 0.3s'
                            }} />
                          </div>
                        </div>
                      </button>
                      
                      {/* Category Items */}
                      {isExpanded && (
                        <div style={{ padding: '0.5rem' }}>
                          {items.map((item) => (
                            <div
                              key={item.category_id}
                              onDragOver={(e) => handleDragOver(e, item.category_id)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, item.category_id)}
                              style={{
                                padding: '0.875rem 1rem',
                                borderRadius: '10px',
                                background: dragOverCategory === item.category_id ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                                border: dragOverCategory === item.category_id ? '1px dashed rgba(212, 175, 55, 0.4)' : '1px solid transparent',
                                transition: 'all 0.2s',
                                marginBottom: '0.25rem'
                              }}
                              data-testid={`category-budget-${item.category_id}`}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span style={{ color: '#E5E5E5', fontWeight: '500', fontSize: '0.9rem' }}>{item.category?.name || 'Unknown'}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                  {editingCategory === item.category_id ? (
                                    <input
                                      type="number"
                                      defaultValue={item.planned_amount}
                                      onBlur={(e) => handleCategoryBudgetUpdate(item.category_id, parseFloat(e.target.value) || 0)}
                                      onKeyDown={(e) => { if (e.key === 'Enter') handleCategoryBudgetUpdate(item.category_id, parseFloat(e.target.value) || 0); }}
                                      autoFocus
                                      style={{
                                        width: '100px',
                                        padding: '0.375rem 0.5rem',
                                        borderRadius: '6px',
                                        background: '#0A0A0A',
                                        border: '1px solid rgba(212, 175, 55, 0.3)',
                                        color: '#F5F5F5',
                                        fontFamily: 'monospace',
                                        fontSize: '0.875rem',
                                        textAlign: 'right',
                                        outline: 'none'
                                      }}
                                    />
                                  ) : (
                                    <span 
                                      onClick={() => setEditingCategory(item.category_id)}
                                      style={{ 
                                        fontFamily: 'monospace', 
                                        fontWeight: '600', 
                                        color: item.isOverBudget ? '#DC2626' : '#D4AF37',
                                        cursor: 'pointer',
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '4px',
                                        background: 'rgba(255, 255, 255, 0.02)'
                                      }}
                                    >
                                      {formatCurrency(item.spent)} / {formatCurrency(item.planned_amount)}
                                    </span>
                                  )}
                                  <button
                                    onClick={() => handleRemoveCategory(item.category_id)}
                                    style={{ padding: '0.25rem', background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.5 }}
                                  >
                                    <Trash2 style={{ width: '14px', height: '14px', color: '#DC2626' }} />
                                  </button>
                                </div>
                              </div>
                              <div style={{ height: '4px', borderRadius: '999px', background: '#1A1A1A', overflow: 'hidden' }}>
                                <div style={{
                                  height: '100%',
                                  width: `${Math.min(item.percentage, 100)}%`,
                                  borderRadius: '999px',
                                  background: item.percentage > 100 ? '#DC2626' : item.percentage > 80 ? '#F59E0B' : '#D4AF37',
                                  transition: 'width 0.3s'
                                }} />
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.375rem', fontSize: '0.75rem', color: '#5A5A5A' }}>
                                <span>{item.isOverBudget ? `Over by ${formatCurrency(Math.abs(item.remaining))}` : `${formatCurrency(item.remaining)} left`}</span>
                                <span>{item.percentage.toFixed(0)}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Uncategorized Transactions */}
            {monthlyData.uncategorized.length > 0 && (
              <div style={{ ...contentTile, border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(234, 179, 8, 0.4), transparent)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(234, 179, 8, 0.15)', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                    <AlertTriangle style={{ width: '18px', height: '18px', color: '#EAB308' }} />
                  </div>
                  <div>
                    <h3 style={{ color: '#F5F5F5', margin: 0, fontSize: '1rem', fontWeight: '600' }}>Needs Attention</h3>
                    <p style={{ color: '#5A5A5A', margin: 0, fontSize: '0.75rem' }}>Drag to categorize</p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                  {monthlyData.uncategorized.slice(0, 10).map((tx) => (
                    <div
                      key={tx.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, tx)}
                      style={{
                        ...innerTile,
                        padding: '0.75rem',
                        cursor: 'grab',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem'
                      }}
                      data-testid={`uncategorized-${tx.id}`}
                    >
                      <GripVertical style={{ width: '14px', height: '14px', color: '#5A5A5A', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: '#E5E5E5', margin: 0, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tx.description || 'Transaction'}</p>
                        <p style={{ color: '#5A5A5A', margin: 0, fontSize: '0.7rem' }}>{tx.date}</p>
                      </div>
                      <span style={{ fontFamily: 'monospace', fontWeight: '600', color: '#DC2626', fontSize: '0.85rem', flexShrink: 0 }}>-{formatCurrency(parseFloat(tx.amount))}</span>
                    </div>
                  ))}
                  {monthlyData.uncategorized.length > 10 && (
                    <p style={{ textAlign: 'center', color: '#5A5A5A', fontSize: '0.75rem', margin: '0.5rem 0 0' }}>
                      +{monthlyData.uncategorized.length - 10} more
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Linked Data - Goals */}
            {goals.length > 0 && (
              <div style={contentTile}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(212, 175, 55, 0.15)', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                    <Target style={{ width: '18px', height: '18px', color: '#D4AF37' }} />
                  </div>
                  <h3 style={{ color: '#F5F5F5', margin: 0, fontSize: '1rem', fontWeight: '600' }}>Savings Goals</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {goals.slice(0, 3).map((goal) => (
                    <div key={goal.id} style={{ ...innerTile, padding: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                        <span style={{ color: '#E5E5E5', fontSize: '0.85rem', fontWeight: '500' }}>{goal.name}</span>
                        <span style={{ fontFamily: 'monospace', color: '#D4AF37', fontSize: '0.8rem' }}>{formatCurrency(goal.monthly_contribution)}/mo</span>
                      </div>
                      <div style={{ height: '4px', borderRadius: '999px', background: '#1A1A1A', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(goal.current_amount / goal.target_amount) * 100}%`, borderRadius: '999px', background: '#D4AF37' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Linked Data - Debts */}
            {debts.length > 0 && (
              <div style={contentTile}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(220, 38, 38, 0.15)', border: '1px solid rgba(220, 38, 38, 0.2)' }}>
                    <CreditCard style={{ width: '18px', height: '18px', color: '#DC2626' }} />
                  </div>
                  <h3 style={{ color: '#F5F5F5', margin: 0, fontSize: '1rem', fontWeight: '600' }}>Debt Payments</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {debts.slice(0, 3).map((debt) => (
                    <div key={debt.id} style={{ ...innerTile, padding: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ color: '#E5E5E5', fontSize: '0.85rem', fontWeight: '500' }}>{debt.name}</span>
                        <span style={{ fontFamily: 'monospace', color: '#DC2626', fontSize: '0.8rem' }}>{formatCurrency(debt.minimum_payment || 0)}/mo</span>
                      </div>
                      <p style={{ color: '#5A5A5A', margin: 0, fontSize: '0.7rem' }}>Balance: {formatCurrency(debt.current_balance)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Linked Data - Bills */}
            {bills.length > 0 && (
              <div style={contentTile}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                    <Calendar style={{ width: '18px', height: '18px', color: '#3B82F6' }} />
                  </div>
                  <h3 style={{ color: '#F5F5F5', margin: 0, fontSize: '1rem', fontWeight: '600' }}>Upcoming Bills</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {bills.slice(0, 3).map((bill) => (
                    <div key={bill.id} style={{ ...innerTile, padding: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ color: '#E5E5E5', fontSize: '0.85rem', fontWeight: '500' }}>{bill.name}</span>
                        <span style={{ fontFamily: 'monospace', color: '#3B82F6', fontSize: '0.8rem' }}>{formatCurrency(bill.typical_amount)}</span>
                      </div>
                      <p style={{ color: '#5A5A5A', margin: 0, fontSize: '0.7rem' }}>Due: {bill.due_date}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available Funds */}
            <div style={{ ...contentTile, background: 'linear-gradient(145deg, #0A0A0F 0%, #080808 100%)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                  <DollarSign style={{ width: '18px', height: '18px', color: '#6366F1' }} />
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5A5A5A' }}>Available Funds</span>
              </div>
              <p style={{ fontFamily: 'monospace', fontSize: '1.5rem', fontWeight: '700', color: totalAvailableFunds >= 0 ? '#6366F1' : '#DC2626', margin: 0 }}>{formatCurrency(totalAvailableFunds)}</p>
              <p style={{ color: '#5A5A5A', margin: '0.25rem 0 0', fontSize: '0.75rem' }}>Across {accounts.length} account{accounts.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>

        {/* Add Category Modal */}
        {showCategoryModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
            <div style={{ ...contentTile, width: '100%', maxWidth: '480px', maxHeight: '80vh', overflowY: 'auto' }}>
              <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: '2px', background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.5), transparent)' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>Add Budget Category</h2>
                <button onClick={() => setShowCategoryModal(false)} style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.03)', border: 'none', cursor: 'pointer' }}>
                  <X style={{ width: '20px', height: '20px', color: '#6E6E6E' }} />
                </button>
              </div>
              {availableCategories.length === 0 ? (
                <p style={{ color: '#5A5A5A', textAlign: 'center', padding: '2rem' }}>All expense categories are already in your budget</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {availableCategories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => handleAddCategory(cat.id, 100)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '1rem',
                        borderRadius: '12px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        width: '100%',
                        textAlign: 'left'
                      }}
                    >
                      <span style={{ color: '#E5E5E5', fontWeight: '500' }}>{cat.name}</span>
                      <ArrowRight style={{ width: '16px', height: '16px', color: '#D4AF37' }} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Create Budget Modal */}
        {showCreateModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
            <div style={{ ...contentTile, width: '100%', maxWidth: '400px' }}>
              <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: '2px', background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.5), transparent)' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>Create Budget</h2>
                <button onClick={() => setShowCreateModal(false)} style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.03)', border: 'none', cursor: 'pointer' }}>
                  <X style={{ width: '20px', height: '20px', color: '#6E6E6E' }} />
                </button>
              </div>
              <p style={{ color: '#A3A3A3', marginBottom: '1.5rem', fontSize: '0.95rem' }}>Choose how to start your budget for {formatMonth(selectedMonth)}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button
                  onClick={() => { setShowCreateModal(false); createFromTemplate('50-30-20'); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1.25rem',
                    borderRadius: '12px',
                    background: 'rgba(212, 175, 55, 0.08)',
                    border: '1px solid rgba(212, 175, 55, 0.2)',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'rgba(212, 175, 55, 0.15)' }}>
                    <Sparkles style={{ width: '20px', height: '20px', color: '#D4AF37' }} />
                  </div>
                  <div>
                    <p style={{ color: '#F5F5F5', margin: 0, fontWeight: '600' }}>50/30/20 Rule</p>
                    <p style={{ color: '#5A5A5A', margin: '0.25rem 0 0', fontSize: '0.8rem' }}>Needs, Wants, Savings</p>
                  </div>
                </button>
                {budgets.length > 0 && (
                  <button
                    onClick={() => { setShowCreateModal(false); createFromTemplate('previous'); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '1.25rem',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.05)' }}>
                      <Copy style={{ width: '20px', height: '20px', color: '#A3A3A3' }} />
                    </div>
                    <div>
                      <p style={{ color: '#F5F5F5', margin: 0, fontWeight: '600' }}>Copy Previous Month</p>
                      <p style={{ color: '#5A5A5A', margin: '0.25rem 0 0', fontSize: '0.8rem' }}>Start from your last budget</p>
                    </div>
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    createBudgetMutation.mutate({
                      entity_id: selectedEntityId,
                      month: selectedMonth,
                      category_budgets: [],
                      total_planned: 0,
                    });
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1.25rem',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.05)' }}>
                    <Plus style={{ width: '20px', height: '20px', color: '#A3A3A3' }} />
                  </div>
                  <div>
                    <p style={{ color: '#F5F5F5', margin: 0, fontWeight: '600' }}>Start Fresh</p>
                    <p style={{ color: '#5A5A5A', margin: '0.25rem 0 0', fontSize: '0.8rem' }}>Build from scratch</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 1024px) {
          [data-testid="budgets-page"] > div > div:nth-child(3) {
            grid-template-columns: 1fr !important;
          }
        }
        input:focus {
          border-color: rgba(212, 175, 55, 0.5) !important;
        }
        select:focus {
          border-color: rgba(212, 175, 55, 0.3) !important;
        }
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
