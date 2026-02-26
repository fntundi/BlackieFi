import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useEntity } from '../contexts/EntityContext';
import { toast } from 'sonner';
import { Plus, Package, X, Building2, Car, Laptop } from 'lucide-react';

const ASSET_ICONS = {
  property: Building2,
  vehicle: Car,
  technology: Laptop,
  equipment: Package,
};

export default function Assets() {
  const { selectedEntityId } = useEntity();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'equipment',
    description: '',
    purchase_price: '',
    current_value: '',
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
      setFormData({ name: '', type: 'equipment', description: '', purchase_price: '', current_value: '' });
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      entity_id: selectedEntityId,
      name: formData.name,
      type: formData.type,
      description: formData.description,
      purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
      current_value: formData.current_value ? parseFloat(formData.current_value) : parseFloat(formData.purchase_price) || null,
    });
  };

  const totalValue = assets.reduce((sum, a) => sum + parseFloat(a.current_value || a.purchase_price || 0), 0);

  return (
    <div className="page-container animate-fade-in" data-testid="assets-page">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Assets</h1>
            <p className="text-slate-400 mt-1">Track your valuable possessions</p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn btn-primary" data-testid="add-asset-btn">
            <Plus className="w-5 h-5" />
            Add Asset
          </button>
        </div>

        <div className="stat-card mb-8" data-testid="total-assets-value">
          <p className="text-slate-400">Total Asset Value</p>
          <p className="stat-value text-emerald-500">${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="assets-grid">
          {assets.map((asset) => {
            const Icon = ASSET_ICONS[asset.type] || Package;
            return (
              <div key={asset.id} className="card" data-testid={`asset-${asset.id}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-cyan-500/10 rounded-lg">
                    <Icon className="w-6 h-6 text-cyan-500" />
                  </div>
                  <span className="badge badge-info capitalize">{asset.type}</span>
                </div>
                <p className="font-semibold text-white text-lg">{asset.name}</p>
                {asset.description && <p className="text-sm text-slate-500 mt-1">{asset.description}</p>}
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-400">Current Value</span>
                    <span className="font-mono font-semibold text-emerald-500">
                      ${parseFloat(asset.current_value || asset.purchase_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {asset.purchase_price && (
                    <div className="flex justify-between mt-2">
                      <span className="text-sm text-slate-400">Purchase Price</span>
                      <span className="font-mono text-slate-500">
                        ${parseFloat(asset.purchase_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {!isLoading && assets.length === 0 && (
            <div className="col-span-3 text-center py-12 text-slate-500">
              No assets tracked yet. Add your first asset to get started.
            </div>
          )}
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="card w-full max-w-md" data-testid="add-asset-modal">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Add Asset</h2>
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
                    placeholder="e.g., MacBook Pro"
                    required
                    data-testid="asset-name-input"
                  />
                </div>
                <div>
                  <label className="label">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="input"
                    data-testid="asset-type-select"
                  >
                    <option value="property">Property</option>
                    <option value="vehicle">Vehicle</option>
                    <option value="technology">Technology</option>
                    <option value="equipment">Equipment</option>
                    <option value="furniture">Furniture</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="label">Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input"
                    placeholder="Optional description"
                    data-testid="asset-description-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Purchase Price</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.purchase_price}
                      onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                      className="input"
                      data-testid="asset-purchase-input"
                    />
                  </div>
                  <div>
                    <label className="label">Current Value</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.current_value}
                      onChange={(e) => setFormData({ ...formData, current_value: e.target.value })}
                      className="input"
                      data-testid="asset-value-input"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary flex-1">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary flex-1" data-testid="submit-asset-btn">
                    {createMutation.isPending ? 'Saving...' : 'Add Asset'}
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
