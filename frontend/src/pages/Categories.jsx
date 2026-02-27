import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useEntity } from '../contexts/EntityContext';
import { toast } from 'sonner';
import { Plus, Tags, X, ArrowUpRight, ArrowDownRight, ArrowLeftRight } from 'lucide-react';

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

  const getTypeIcon = (type) => {
    switch (type) {
      case 'income': return ArrowUpRight;
      case 'expense': return ArrowDownRight;
      default: return ArrowLeftRight;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'income': return '#059669';
      case 'expense': return '#DC2626';
      default: return '#D4AF37';
    }
  };

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

  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');
  const bothCategories = categories.filter(c => c.type === 'both');

  const CategoryCard = ({ category }) => {
    const Icon = getTypeIcon(category.type);
    const color = getTypeColor(category.type);
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem 1.25rem',
        borderRadius: '12px',
        background: '#0F0F0F',
        border: '1px solid rgba(255, 255, 255, 0.03)',
        transition: 'all 0.2s'
      }} data-testid={`category-${category.id}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.5rem', borderRadius: '8px', background: `${color}15` }}>
            <Icon style={{ width: '18px', height: '18px', color }} />
          </div>
          <span style={{ fontWeight: '500', color: '#F5F5F5' }}>{category.name}</span>
          {category.is_default && (
            <span style={{ fontSize: '0.625rem', padding: '0.125rem 0.375rem', borderRadius: '4px', background: 'rgba(212, 175, 55, 0.1)', color: '#D4AF37', fontWeight: '600' }}>DEFAULT</span>
          )}
        </div>
        {!category.is_default && (
          <button
            onClick={() => deleteMutation.mutate(category.id)}
            style={{ padding: '0.375rem', borderRadius: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#525252', transition: 'color 0.2s' }}
          >
            <X style={{ width: '14px', height: '14px' }} />
          </button>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: '2rem', background: '#050505', minHeight: '100%' }} data-testid="categories-page">
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div>
            <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#D4AF37', marginBottom: '0.5rem' }}>Organization</p>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '700', color: '#F5F5F5', margin: 0 }}>Categories</h1>
            <p style={{ marginTop: '0.5rem', color: '#525252' }}>Organize your transactions</p>
          </div>
          <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.875rem 1.5rem', borderRadius: '12px', fontWeight: '600', background: 'linear-gradient(135deg, #C4A030 0%, #D4AF37 50%, #C4A030 100%)', color: '#000', border: 'none', cursor: 'pointer' }} data-testid="add-category-btn">
            <Plus style={{ width: '20px', height: '20px' }} />
            Add Category
          </button>
        </div>

        {/* Categories by Type */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
          {/* Income */}
          <div style={{ padding: '1.5rem', borderRadius: '16px', background: '#0A0A0A', border: '1px solid rgba(5, 150, 105, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ padding: '0.625rem', borderRadius: '10px', background: 'rgba(5, 150, 105, 0.1)' }}>
                <ArrowUpRight style={{ width: '20px', height: '20px', color: '#059669' }} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>Income</h2>
                <p style={{ fontSize: '0.75rem', color: '#525252', margin: 0 }}>{incomeCategories.length} categories</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {incomeCategories.map(cat => <CategoryCard key={cat.id} category={cat} />)}
              {incomeCategories.length === 0 && <p style={{ color: '#525252', textAlign: 'center', padding: '1rem' }}>No income categories</p>}
            </div>
          </div>

          {/* Expense */}
          <div style={{ padding: '1.5rem', borderRadius: '16px', background: '#0A0A0A', border: '1px solid rgba(220, 38, 38, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ padding: '0.625rem', borderRadius: '10px', background: 'rgba(220, 38, 38, 0.1)' }}>
                <ArrowDownRight style={{ width: '20px', height: '20px', color: '#DC2626' }} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>Expense</h2>
                <p style={{ fontSize: '0.75rem', color: '#525252', margin: 0 }}>{expenseCategories.length} categories</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {expenseCategories.map(cat => <CategoryCard key={cat.id} category={cat} />)}
              {expenseCategories.length === 0 && <p style={{ color: '#525252', textAlign: 'center', padding: '1rem' }}>No expense categories</p>}
            </div>
          </div>

          {/* Both */}
          <div style={{ padding: '1.5rem', borderRadius: '16px', background: '#0A0A0A', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ padding: '0.625rem', borderRadius: '10px', background: 'rgba(212, 175, 55, 0.1)' }}>
                <ArrowLeftRight style={{ width: '20px', height: '20px', color: '#D4AF37' }} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>Both</h2>
                <p style={{ fontSize: '0.75rem', color: '#525252', margin: 0 }}>{bothCategories.length} categories</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {bothCategories.map(cat => <CategoryCard key={cat.id} category={cat} />)}
              {bothCategories.length === 0 && <p style={{ color: '#525252', textAlign: 'center', padding: '1rem' }}>No general categories</p>}
            </div>
          </div>
        </div>

        {/* Modal */}
        {showForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
            <div style={{ width: '100%', maxWidth: '400px', padding: '1.5rem', borderRadius: '20px', background: 'linear-gradient(180deg, #0F0F0F 0%, #0A0A0A 100%)', border: '1px solid rgba(212, 175, 55, 0.2)' }} data-testid="add-category-modal">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>Add Category</h2>
                <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#525252' }}><X style={{ width: '20px', height: '20px' }} /></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Category Name</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={inputStyle} placeholder="e.g., Groceries" required data-testid="category-name-input" />
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Type</label>
                  <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }} data-testid="category-type-select">
                    <option value="expense" style={{ background: '#0A0A0A' }}>Expense</option>
                    <option value="income" style={{ background: '#0A0A0A' }}>Income</option>
                    <option value="both" style={{ background: '#0A0A0A' }}>Both</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: '0.875rem', borderRadius: '12px', fontWeight: '600', background: 'transparent', border: '1px solid rgba(212, 175, 55, 0.2)', color: '#D4AF37', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ flex: 1, padding: '0.875rem', borderRadius: '12px', fontWeight: '600', background: 'linear-gradient(135deg, #C4A030 0%, #D4AF37 50%, #C4A030 100%)', color: '#000', border: 'none', cursor: 'pointer' }} data-testid="submit-category-btn">{createMutation.isPending ? 'Saving...' : 'Save Category'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 1024px) { [data-testid="categories-page"] > div > div:nth-child(2) { grid-template-columns: 1fr !important; } }
        input:focus, select:focus { border-color: rgba(212, 175, 55, 0.5) !important; }
      `}</style>
    </div>
  );
}
