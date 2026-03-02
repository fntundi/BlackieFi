import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useEntity } from '../contexts/EntityContext';
import { toast } from 'sonner';
import { Plus, Package, X, Home, Car, Monitor, Briefcase, Building2, TrendingUp, Calendar } from 'lucide-react';
import { tileStyles, headerStyles, inputStyles, buttonStyles, GoldAccentLine, formatCurrency, formatDate } from '../styles/tileStyles';

const ASSET_ICONS = {
  property: Home,
  vehicle: Car,
  technology: Monitor,
  equipment: Briefcase,
  furniture: Package,
  intellectual_property: Building2,
  other: Package,
};

const ASSET_TYPES = {
  property: 'Property',
  vehicle: 'Vehicle',
  technology: 'Technology',
  equipment: 'Equipment',
  furniture: 'Furniture',
  intellectual_property: 'IP',
  other: 'Other',
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
  const totalPurchased = assets.reduce((sum, a) => sum + parseFloat(a.purchase_price || 0), 0);
  const totalGainLoss = totalValue - totalPurchased;
  const gainLossPercent = totalPurchased > 0 ? (totalGainLoss / totalPurchased) * 100 : 0;

  return (
    <div style={{ padding: '2rem', background: '#050505', minHeight: '100%' }} data-testid="assets-page">
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
          <div>
            <p style={headerStyles.label}>Ownership</p>
            <h1 style={headerStyles.title}>Assets</h1>
            <p style={headerStyles.subtitle}>Track your valuable possessions</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            style={buttonStyles.primary}
            data-testid="add-asset-btn"
          >
            <Plus style={{ width: '20px', height: '20px' }} />
            Add Asset
          </button>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
          {/* Total Value */}
          <div style={tileStyles.statGold} data-testid="total-assets">
            <GoldAccentLine />
            <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8A8A', marginBottom: '0.75rem' }}>
              Total Value
            </p>
            <p style={{ fontFamily: 'monospace', fontSize: '1.75rem', fontWeight: '700', color: '#D4AF37', margin: 0 }}>
              {formatCurrency(totalValue)}
            </p>
          </div>

          {/* Purchase Cost */}
          <div style={tileStyles.stat}>
            <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8A8A', marginBottom: '0.75rem' }}>
              Purchase Cost
            </p>
            <p style={{ fontFamily: 'monospace', fontSize: '1.75rem', fontWeight: '700', color: '#F5F5F5', margin: 0 }}>
              {formatCurrency(totalPurchased)}
            </p>
          </div>

          {/* Appreciation */}
          <div style={totalGainLoss >= 0 ? tileStyles.statGreen : tileStyles.statRed}>
            <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8A8A', marginBottom: '0.75rem' }}>
              {totalGainLoss >= 0 ? 'Appreciation' : 'Depreciation'}
            </p>
            <p style={{ fontFamily: 'monospace', fontSize: '1.75rem', fontWeight: '700', color: totalGainLoss >= 0 ? '#059669' : '#DC2626', margin: 0 }}>
              {totalGainLoss >= 0 ? '+' : ''}{formatCurrency(totalGainLoss)}
            </p>
          </div>

          {/* Asset Count */}
          <div style={tileStyles.stat}>
            <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8A8A', marginBottom: '0.75rem' }}>
              Total Assets
            </p>
            <p style={{ fontFamily: 'monospace', fontSize: '1.75rem', fontWeight: '700', color: '#F5F5F5', margin: 0 }}>
              {assets.length}
            </p>
          </div>
        </div>

        {/* Assets Grid */}
        <div style={tileStyles.content}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#F5F5F5', marginBottom: '1.5rem' }}>Your Assets</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }} data-testid="assets-grid">
            {assets.map((asset) => {
              const Icon = ASSET_ICONS[asset.type] || Package;
              const currentValue = parseFloat(asset.current_value || asset.purchase_price || 0);
              const purchasePrice = parseFloat(asset.purchase_price || 0);
              const gainLoss = currentValue - purchasePrice;
              const gainLossPercent = purchasePrice > 0 ? (gainLoss / purchasePrice) * 100 : 0;
              
              return (
                <div key={asset.id} style={tileStyles.cardGold} data-testid={`asset-${asset.id}`}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{ 
                      padding: '0.75rem', 
                      borderRadius: '12px', 
                      background: 'rgba(212, 175, 55, 0.1)',
                      boxShadow: '0 0 20px rgba(212, 175, 55, 0.15)'
                    }}>
                      <Icon style={{ width: '24px', height: '24px', color: '#D4AF37' }} />
                    </div>
                    <button
                      onClick={() => deleteMutation.mutate(asset.id)}
                      style={{ padding: '0.5rem', borderRadius: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#525252' }}
                    >
                      <X style={{ width: '16px', height: '16px' }} />
                    </button>
                  </div>
                  <p style={{ fontSize: '1.125rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>{asset.name}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', marginBottom: '1rem' }}>
                    <span style={{ 
                      padding: '0.2rem 0.6rem', 
                      borderRadius: '12px', 
                      fontSize: '0.7rem', 
                      fontWeight: '600',
                      background: 'rgba(212, 175, 55, 0.15)',
                      color: '#D4AF37',
                    }}>
                      {ASSET_TYPES[asset.type] || asset.type}
                    </span>
                  </div>

                  {asset.description && (
                    <p style={{ fontSize: '0.8rem', color: '#8A8A8A', marginBottom: '1rem', lineHeight: '1.4' }}>{asset.description}</p>
                  )}

                  {/* Value */}
                  <p style={{ fontFamily: 'monospace', fontSize: '1.5rem', fontWeight: '700', color: '#D4AF37', margin: '0 0 0.5rem 0' }}>
                    {formatCurrency(currentValue)}
                  </p>

                  {/* Gain/Loss */}
                  {purchasePrice > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ 
                        fontSize: '0.875rem', 
                        fontWeight: '600', 
                        color: gainLoss >= 0 ? '#059669' : '#DC2626' 
                      }}>
                        {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss)}
                      </span>
                      <span style={{ 
                        padding: '0.15rem 0.5rem', 
                        borderRadius: '8px', 
                        fontSize: '0.75rem', 
                        fontWeight: '600',
                        background: gainLoss >= 0 ? 'rgba(5, 150, 105, 0.15)' : 'rgba(220, 38, 38, 0.15)',
                        color: gainLoss >= 0 ? '#059669' : '#DC2626',
                      }}>
                        {gainLossPercent >= 0 ? '+' : ''}{gainLossPercent.toFixed(1)}%
                      </span>
                    </div>
                  )}

                  {asset.purchase_date && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <Calendar style={{ width: '14px', height: '14px', color: '#8A8A8A' }} />
                      <span style={{ fontSize: '0.8rem', color: '#8A8A8A' }}>Purchased: {formatDate(asset.purchase_date)}</span>
                    </div>
                  )}
                </div>
              );
            })}
            {!isLoading && assets.length === 0 && (
              <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '4rem', color: '#525252' }}>
                <Package style={{ width: '48px', height: '48px', margin: '0 auto 1rem', opacity: 0.5 }} />
                <p>No assets tracked. Add your first asset to get started.</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal */}
        {showForm && (
          <div style={tileStyles.modalOverlay}>
            <div style={tileStyles.modal}>
              <GoldAccentLine />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#F5F5F5', margin: 0 }}>Add Asset</h2>
                <button
                  onClick={() => setShowForm(false)}
                  style={{ padding: '0.5rem', borderRadius: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#8A8A8A' }}
                >
                  <X style={{ width: '20px', height: '20px' }} />
                </button>
              </div>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Asset Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Tesla Model 3"
                    style={inputStyles.base}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Asset Type
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      style={inputStyles.base}
                    >
                      <option value="property">Property</option>
                      <option value="vehicle">Vehicle</option>
                      <option value="technology">Technology</option>
                      <option value="equipment">Equipment</option>
                      <option value="furniture">Furniture</option>
                      <option value="intellectual_property">IP</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Purchase Date
                    </label>
                    <input
                      type="date"
                      value={formData.purchase_date}
                      onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                      style={inputStyles.base}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description"
                    style={inputStyles.base}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Purchase Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.purchase_price}
                      onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                      placeholder="45000"
                      style={inputStyles.base}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Current Value
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.current_value}
                      onChange={(e) => setFormData({ ...formData, current_value: e.target.value })}
                      placeholder="42000"
                      style={inputStyles.base}
                    />
                  </div>
                </div>
                <button type="submit" style={{ ...buttonStyles.primary, justifyContent: 'center', marginTop: '0.5rem' }}>
                  Add Asset
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
