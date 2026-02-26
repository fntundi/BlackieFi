import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useEntity } from '../contexts/EntityContext';
import { toast } from 'sonner';
import { Plus, LineChart, X, TrendingUp } from 'lucide-react';

export default function Investments() {
  const { selectedEntityId } = useEntity();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'brokerage',
    provider: '',
  });

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['vehicles', selectedEntityId],
    queryFn: () => api.getInvestmentVehicles({ entity_id: selectedEntityId }),
    enabled: !!selectedEntityId,
  });

  const { data: holdings = [] } = useQuery({
    queryKey: ['holdings'],
    queryFn: () => api.getInvestmentHoldings(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.createInvestmentVehicle(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['vehicles']);
      toast.success('Investment vehicle created');
      setShowForm(false);
      setFormData({ name: '', type: 'brokerage', provider: '' });
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      entity_id: selectedEntityId,
      ...formData,
    });
  };

  const getVehicleHoldings = (vehicleId) => holdings.filter(h => h.vehicle_id === vehicleId);
  const getVehicleValue = (vehicleId) => {
    return getVehicleHoldings(vehicleId).reduce((sum, h) => {
      const price = h.current_price || (h.cost_basis / h.quantity);
      return sum + (price * h.quantity);
    }, 0);
  };

  const totalValue = vehicles.reduce((sum, v) => sum + getVehicleValue(v.id), 0);
  const totalCostBasis = holdings.reduce((sum, h) => sum + parseFloat(h.cost_basis || 0), 0);
  const totalGain = totalValue - totalCostBasis;

  return (
    <div className="page-container animate-fade-in" data-testid="investments-page">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Investments</h1>
            <p className="text-slate-400 mt-1">Track your investment portfolio</p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn btn-primary" data-testid="add-vehicle-btn">
            <Plus className="w-5 h-5" />
            Add Investment Account
          </button>
        </div>

        <div className="grid-3 mb-8">
          <div className="stat-card" data-testid="total-value">
            <p className="text-slate-400">Portfolio Value</p>
            <p className="stat-value text-emerald-500">${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="stat-card">
            <p className="text-slate-400">Cost Basis</p>
            <p className="stat-value text-slate-300">${totalCostBasis.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="stat-card">
            <p className="text-slate-400">Total Gain/Loss</p>
            <p className={`stat-value ${totalGain >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {totalGain >= 0 ? '+' : ''}${totalGain.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              <span className="text-sm ml-2">({totalCostBasis > 0 ? ((totalGain / totalCostBasis) * 100).toFixed(2) : 0}%)</span>
            </p>
          </div>
        </div>

        <div className="space-y-6" data-testid="vehicles-list">
          {vehicles.map((vehicle) => {
            const vehicleHoldings = getVehicleHoldings(vehicle.id);
            const vehicleValue = getVehicleValue(vehicle.id);
            const vehicleCostBasis = vehicleHoldings.reduce((sum, h) => sum + parseFloat(h.cost_basis || 0), 0);
            const vehicleGain = vehicleValue - vehicleCostBasis;

            return (
              <div key={vehicle.id} className="card" data-testid={`vehicle-${vehicle.id}`}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-cyan-500/10 rounded-lg">
                      <LineChart className="w-6 h-6 text-cyan-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{vehicle.name}</p>
                      <p className="text-sm text-slate-500">{vehicle.provider} · {vehicle.type.replace('_', ' ').toUpperCase()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xl font-bold text-emerald-500">
                      ${vehicleValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                    <p className={`text-sm ${vehicleGain >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {vehicleGain >= 0 ? '+' : ''}${vehicleGain.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {vehicleHoldings.length > 0 ? (
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Asset</th>
                          <th>Class</th>
                          <th className="text-right">Quantity</th>
                          <th className="text-right">Price</th>
                          <th className="text-right">Value</th>
                          <th className="text-right">Gain/Loss</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vehicleHoldings.map((holding) => {
                          const price = holding.current_price || (holding.cost_basis / holding.quantity);
                          const value = price * holding.quantity;
                          const gain = value - holding.cost_basis;
                          const gainPct = (gain / holding.cost_basis) * 100;

                          return (
                            <tr key={holding.id}>
                              <td className="font-medium">{holding.asset_name}</td>
                              <td className="capitalize">{holding.asset_class}</td>
                              <td className="text-right font-mono">{parseFloat(holding.quantity).toLocaleString()}</td>
                              <td className="text-right font-mono">${price.toFixed(2)}</td>
                              <td className="text-right font-mono">${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                              <td className={`text-right font-mono ${gain >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {gain >= 0 ? '+' : ''}${gain.toFixed(2)} ({gainPct.toFixed(1)}%)
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center text-slate-500 py-4">No holdings in this account</p>
                )}
              </div>
            );
          })}
          {!isLoading && vehicles.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              No investment accounts yet. Add your first one to start tracking.
            </div>
          )}
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="card w-full max-w-md" data-testid="add-vehicle-modal">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Add Investment Account</h2>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Account Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    placeholder="e.g., 401(k) Retirement"
                    required
                    data-testid="vehicle-name-input"
                  />
                </div>
                <div>
                  <label className="label">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="input"
                    data-testid="vehicle-type-select"
                  >
                    <option value="brokerage">Brokerage</option>
                    <option value="401k">401(k)</option>
                    <option value="ira">IRA</option>
                    <option value="roth_ira">Roth IRA</option>
                    <option value="crypto">Crypto</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="label">Provider</label>
                  <input
                    type="text"
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                    className="input"
                    placeholder="e.g., Fidelity, Vanguard"
                    data-testid="vehicle-provider-input"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary flex-1">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary flex-1" data-testid="submit-vehicle-btn">
                    {createMutation.isPending ? 'Saving...' : 'Add Account'}
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
