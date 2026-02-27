import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { toast } from 'sonner';
import { Plus, Building2, X, User, Briefcase } from 'lucide-react';
import { useEntity } from '../contexts/EntityContext';

export default function Entities() {
  const queryClient = useQueryClient();
  const { selectEntity } = useEntity();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'personal',
  });

  const { data: entities = [], isLoading } = useQuery({
    queryKey: ['entities'],
    queryFn: () => api.getEntities(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.createEntity(data),
    onSuccess: (newEntity) => {
      queryClient.invalidateQueries(['entities']);
      toast.success('Entity created');
      setShowForm(false);
      setFormData({ name: '', type: 'personal' });
      if (newEntity?.id) {
        selectEntity(newEntity.id);
      }
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteEntity(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['entities']);
      toast.success('Entity deleted');
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
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

  return (
    <div style={{ padding: '2rem', background: '#050505', minHeight: '100%' }} data-testid="entities-page">
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div>
            <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#D4AF37', marginBottom: '0.5rem' }}>Management</p>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '700', color: '#F5F5F5', margin: 0 }}>Entities</h1>
            <p style={{ marginTop: '0.5rem', color: '#525252' }}>Manage your personal and business entities</p>
          </div>
          <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.875rem 1.5rem', borderRadius: '12px', fontWeight: '600', background: 'linear-gradient(135deg, #C4A030 0%, #D4AF37 50%, #C4A030 100%)', color: '#000', border: 'none', cursor: 'pointer' }} data-testid="add-entity-btn">
            <Plus style={{ width: '20px', height: '20px' }} />
            Add Entity
          </button>
        </div>

        {/* Entities Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }} data-testid="entities-grid">
          {entities.map((entity) => {
            const Icon = entity.type === 'business' ? Briefcase : User;
            return (
              <div key={entity.id} style={{
                padding: '1.5rem',
                borderRadius: '16px',
                background: '#0A0A0A',
                border: '1px solid rgba(212, 175, 55, 0.1)',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }} onClick={() => selectEntity(entity.id)} data-testid={`entity-${entity.id}`}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ padding: '0.75rem', borderRadius: '12px', background: entity.type === 'business' ? 'rgba(212, 175, 55, 0.1)' : 'rgba(59, 130, 246, 0.1)' }}>
                    <Icon style={{ width: '24px', height: '24px', color: entity.type === 'business' ? '#D4AF37' : '#3B82F6' }} />
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(entity.id); }} style={{ padding: '0.5rem', borderRadius: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#525252' }}>
                    <X style={{ width: '16px', height: '16px' }} />
                  </button>
                </div>
                <p style={{ fontSize: '1.25rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>{entity.name}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '6px',
                    background: entity.type === 'business' ? 'rgba(212, 175, 55, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                    color: entity.type === 'business' ? '#D4AF37' : '#3B82F6',
                    fontWeight: '600',
                    textTransform: 'capitalize'
                  }}>{entity.type}</span>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#525252', marginTop: '1rem' }}>
                  Created: {new Date(entity.created_at).toLocaleDateString()}
                </p>
              </div>
            );
          })}
          {!isLoading && entities.length === 0 && (
            <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '4rem', color: '#525252' }}>
              <Building2 style={{ width: '48px', height: '48px', margin: '0 auto 1rem', opacity: 0.5 }} />
              <p>No entities yet. Create your first entity.</p>
            </div>
          )}
        </div>

        {/* Modal */}
        {showForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
            <div style={{ width: '100%', maxWidth: '400px', padding: '1.5rem', borderRadius: '20px', background: 'linear-gradient(180deg, #0F0F0F 0%, #0A0A0A 100%)', border: '1px solid rgba(212, 175, 55, 0.2)' }} data-testid="add-entity-modal">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>Add Entity</h2>
                <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#525252' }}><X style={{ width: '20px', height: '20px' }} /></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Entity Name</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={inputStyle} placeholder="e.g., My Business LLC" required data-testid="entity-name-input" />
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Type</label>
                  <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }} data-testid="entity-type-select">
                    <option value="personal" style={{ background: '#0A0A0A' }}>Personal</option>
                    <option value="business" style={{ background: '#0A0A0A' }}>Business</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: '0.875rem', borderRadius: '12px', fontWeight: '600', background: 'transparent', border: '1px solid rgba(212, 175, 55, 0.2)', color: '#D4AF37', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ flex: 1, padding: '0.875rem', borderRadius: '12px', fontWeight: '600', background: 'linear-gradient(135deg, #C4A030 0%, #D4AF37 50%, #C4A030 100%)', color: '#000', border: 'none', cursor: 'pointer' }} data-testid="submit-entity-btn">{createMutation.isPending ? 'Saving...' : 'Save Entity'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 1024px) { [data-testid="entities-grid"] { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 640px) { [data-testid="entities-grid"] { grid-template-columns: 1fr !important; } }
        input:focus, select:focus { border-color: rgba(212, 175, 55, 0.5) !important; }
      `}</style>
    </div>
  );
}
