import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useEntity } from '../contexts/EntityContext';
import { toast } from 'sonner';
import { Plus, Package, X, Home, Car, Monitor, Briefcase } from 'lucide-react';

const ASSET_ICONS = {
  property: Home,
  vehicle: Car,
  technology: Monitor,
  equipment: Briefcase,
};

export default function Assets() {
  const { selectedEntityId } = useEntity();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'property',
    description: '',
    purchase_price: '',
    current_value: '',
    purchase_date: '',
  });

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['assets', selectedEntityId],
    queryFn: () => api.getAssets({ entity_id: selectedEntityId }),
    enabled: !!selectedEntityId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.createAsset(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['assets']);
      toast.success('Asset added');
      setShowForm(false);
      setFormData({ name: '', type: 'property', description: '', purchase_price: '', current_value: '', purchase_date: '' });
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteAsset(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['assets']);
      toast.success('Asset removed');
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      entity_id: selectedEntityId,
      purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
      current_value: formData.current_value ? parseFloat(formData.current_value) : null,
      purchase_date: formData.purchase_date || null,
    });
  };

  const totalValue = assets.reduce((sum, a) => sum + parseFloat(a.current_value || a.purchase_price || 0), 0);
  const formatCurrency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

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
    <div style={{ padding: '2rem', background: '#050505', minHeight: '100%' }} data-testid="assets-page">
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div>
            <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#D4AF37', marginBottom: '0.5rem' }}>Ownership</p>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '700', color: '#F5F5F5', margin: 0 }}>Assets</h1>
            <p style={{ marginTop: '0.5rem', color: '#525252' }}>Track your valuable possessions</p>
          </div>
          <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.875rem 1.5rem', borderRadius: '12px', fontWeight: '600', background: 'linear-gradient(135deg, #C4A030 0%, #D4AF37 50%, #C4A030 100%)', color: '#000', border: 'none', cursor: 'pointer' }} data-testid="add-asset-btn">
            <Plus style={{ width: '20px', height: '20px' }} />
            Add Asset
          </button>
        </div>

        {/* Total Value */}
        <div style={{ padding: '1.5rem', borderRadius: '16px', background: 'linear-gradient(135deg, #0F0F0F 0%, #0A0A0A 100%)', border: '1px solid rgba(212, 175, 55, 0.2)', marginBottom: '2rem', position: 'relative', overflow: 'hidden' }} data-testid="total-assets">
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)' }}></div>
          <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#525252', marginBottom: '0.5rem' }}>Total Asset Value</p>
          <p style={{ fontFamily: 'monospace', fontSize: '2.5rem', fontWeight: '700', color: '#D4AF37', margin: 0 }}>{formatCurrency(totalValue)}</p>
        </div>

        {/* Assets Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }} data-testid="assets-grid">
          {assets.map((asset) => {
            const Icon = ASSET_ICONS[asset.type] || Package;
            const appreciation = asset.current_value && asset.purchase_price ? ((asset.current_value - asset.purchase_price) / asset.purchase_price) * 100 : null;
            return (
              <div key={asset.id} style={{ padding: '1.5rem', borderRadius: '16px', background: '#0A0A0A', border: '1px solid rgba(255, 255, 255, 0.06)' }} data-testid={`asset-${asset.id}`}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(212, 175, 55, 0.1)' }}>
                    <Icon style={{ width: '24px', height: '24px', color: '#D4AF37' }} />
                  </div>
                  <button onClick={() => deleteMutation.mutate(asset.id)} style={{ padding: '0.5rem', borderRadius: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#525252' }}>
                    <X style={{ width: '16px', height: '16px' }} />
                  </button>
                </div>
                <p style={{ fontSize: '1.125rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>{asset.name}</p>
                <p style={{ fontSize: '0.875rem', color: '#525252', textTransform: 'capitalize', marginTop: '0.25rem' }}>{asset.type.replace('_', ' ')}</p>
                <div style={{ marginTop: '1rem' }}>
                  <p style={{ fontFamily: 'monospace', fontSize: '1.5rem', fontWeight: '700', color: '#D4AF37', margin: 0 }}>{formatCurrency(parseFloat(asset.current_value || asset.purchase_price || 0))}</p>
                  {appreciation !== null && (
                    <p style={{ fontSize: '0.875rem', marginTop: '0.25rem', color: appreciation >= 0 ? '#059669' : '#DC2626' }}>
                      {appreciation >= 0 ? '+' : ''}{appreciation.toFixed(1)}% since purchase
                    </p>
                  )}
                </div>
              </div>
            );
          })}
          {!isLoading && assets.length === 0 && (
            <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '4rem', color: '#525252' }}>
              <Package style={{ width: '48px', height: '48px', margin: '0 auto 1rem', opacity: 0.5 }} />
              <p>No assets tracked yet. Add your first asset.</p>
            </div>
          )}
        </div>

        {/* Modal */}
        {showForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
            <div style={{ width: '100%', maxWidth: '450px', padding: '1.5rem', borderRadius: '20px', background: 'linear-gradient(180deg, #0F0F0F 0%, #0A0A0A 100%)', border: '1px solid rgba(212, 175, 55, 0.2)' }} data-testid="add-asset-modal">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>Add Asset</h2>
                <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#525252' }}><X style={{ width: '20px', height: '20px' }} /></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Asset Name</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={inputStyle} placeholder="e.g., House" required data-testid="asset-name-input" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Type</label>
                    <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }} data-testid="asset-type-select">
                      <option value="property" style={{ background: '#0A0A0A' }}>Property</option>
                      <option value="vehicle" style={{ background: '#0A0A0A' }}>Vehicle</option>
                      <option value="equipment" style={{ background: '#0A0A0A' }}>Equipment</option>
                      <option value="technology" style={{ background: '#0A0A0A' }}>Technology</option>
                      <option value="furniture" style={{ background: '#0A0A0A' }}>Furniture</option>
                      <option value="other" style={{ background: '#0A0A0A' }}>Other</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Purchase Date</label>
                    <input type="date" value={formData.purchase_date} onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })} style={inputStyle} data-testid="asset-date-input" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Purchase Price</label>
                    <input type="number" step="0.01" value={formData.purchase_price} onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })} style={inputStyle} placeholder="250000.00" data-testid="asset-purchase-input" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Current Value</label>
                    <input type="number" step="0.01" value={formData.current_value} onChange={(e) => setFormData({ ...formData, current_value: e.target.value })} style={inputStyle} placeholder="275000.00" data-testid="asset-value-input" />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: '0.875rem', borderRadius: '12px', fontWeight: '600', background: 'transparent', border: '1px solid rgba(212, 175, 55, 0.2)', color: '#D4AF37', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ flex: 1, padding: '0.875rem', borderRadius: '12px', fontWeight: '600', background: 'linear-gradient(135deg, #C4A030 0%, #D4AF37 50%, #C4A030 100%)', color: '#000', border: 'none', cursor: 'pointer' }} data-testid="submit-asset-btn">{createMutation.isPending ? 'Saving...' : 'Save Asset'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 1024px) { [data-testid="assets-grid"] { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 640px) { [data-testid="assets-grid"] { grid-template-columns: 1fr !important; } }
        input:focus, select:focus { border-color: rgba(212, 175, 55, 0.5) !important; }
      `}</style>
    </div>
  );
}
