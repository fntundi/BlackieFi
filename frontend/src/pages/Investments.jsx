import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useEntity } from '../contexts/EntityContext';
import { toast } from 'sonner';
import { Plus, LineChart, X, Building, TrendingUp, Briefcase, PieChart, DollarSign } from 'lucide-react';
import { tileStyles, headerStyles, inputStyles, buttonStyles, GoldAccentLine, formatCurrency } from '../styles/tileStyles';

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
    queryKey: ['investment-vehicles', selectedEntityId],
    queryFn: () => api.getInvestmentVehicles({ entity_id: selectedEntityId }),
    enabled: !!selectedEntityId,
  });

  const { data: holdings = [] } = useQuery({
    queryKey: ['investment-holdings'],
    queryFn: () => api.getInvestmentHoldings(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.createInvestmentVehicle(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['investment-vehicles']);
      toast.success('Investment account created');
      setShowForm(false);
      setFormData({ name: '', type: 'brokerage', provider: '' });
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteInvestmentVehicle(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['investment-vehicles']);
      toast.success('Investment account removed');
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

  const getTypeLabel = (type) => {
    const labels = {
      '401k': '401(k)',
      'ira': 'IRA',
      'roth_ira': 'Roth IRA',
      '403b': '403(b)',
      'sep_ira': 'SEP IRA',
      'brokerage': 'Brokerage',
      'crypto': 'Crypto',
      'hsa': 'HSA',
      '529': '529 Plan',
      'other': 'Other'
    };
    return labels[type] || type;
  };

  const getTypeIcon = (type) => {
    if (['401k', '403b', 'ira', 'roth_ira', 'sep_ira'].includes(type)) return Briefcase;
    if (type === 'crypto') return TrendingUp;
    if (type === 'brokerage') return LineChart;
    return Building;
  };

  // Calculate totals from holdings
  const vehicleHoldings = (vehicleId) => holdings.filter(h => h.vehicle_id === vehicleId);
  const vehicleValue = (vehicleId) => {
    return vehicleHoldings(vehicleId).reduce((sum, h) => {
      const price = h.current_price || (h.cost_basis / h.quantity);
      return sum + (h.quantity * price);
    }, 0);
  };
  const vehicleCostBasis = (vehicleId) => {
    return vehicleHoldings(vehicleId).reduce((sum, h) => sum + h.cost_basis, 0);
  };

  const totalValue = vehicles.reduce((sum, v) => sum + vehicleValue(v.id), 0);
  const totalCostBasis = vehicles.reduce((sum, v) => sum + vehicleCostBasis(v.id), 0);
  const totalGainLoss = totalValue - totalCostBasis;
  const totalGainLossPercent = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;

  return (
    <div style={{ padding: '2rem', background: '#050505', minHeight: '100%' }} data-testid="investments-page">
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
          <div>
            <p style={headerStyles.label}>Portfolio</p>
            <h1 style={headerStyles.title}>Investments</h1>
            <p style={headerStyles.subtitle}>Track your investment accounts and holdings</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            style={buttonStyles.primary}
            data-testid="add-investment-btn"
          >
            <Plus style={{ width: '20px', height: '20px' }} />
            Add Account
          </button>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
          {/* Total Value */}
          <div style={tileStyles.statGold} data-testid="total-value">
            <GoldAccentLine />
            <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8A8A', marginBottom: '0.75rem' }}>
              Total Value
            </p>
            <p style={{ fontFamily: 'monospace', fontSize: '1.75rem', fontWeight: '700', color: '#D4AF37', margin: 0 }}>
              {formatCurrency(totalValue)}
            </p>
          </div>

          {/* Cost Basis */}
          <div style={tileStyles.stat}>
            <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8A8A', marginBottom: '0.75rem' }}>
              Cost Basis
            </p>
            <p style={{ fontFamily: 'monospace', fontSize: '1.75rem', fontWeight: '700', color: '#F5F5F5', margin: 0 }}>
              {formatCurrency(totalCostBasis)}
            </p>
          </div>

          {/* Gain/Loss */}
          <div style={totalGainLoss >= 0 ? tileStyles.statGreen : tileStyles.statRed}>
            <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8A8A', marginBottom: '0.75rem' }}>
              Total Gain/Loss
            </p>
            <p style={{ fontFamily: 'monospace', fontSize: '1.75rem', fontWeight: '700', color: totalGainLoss >= 0 ? '#059669' : '#DC2626', margin: 0 }}>
              {totalGainLoss >= 0 ? '+' : ''}{formatCurrency(totalGainLoss)}
            </p>
          </div>

          {/* Return % */}
          <div style={tileStyles.stat}>
            <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8A8A', marginBottom: '0.75rem' }}>
              Total Return
            </p>
            <p style={{ fontFamily: 'monospace', fontSize: '1.75rem', fontWeight: '700', color: totalGainLossPercent >= 0 ? '#059669' : '#DC2626', margin: 0 }}>
              {totalGainLossPercent >= 0 ? '+' : ''}{totalGainLossPercent.toFixed(2)}%
            </p>
          </div>
        </div>

        {/* Vehicles Grid */}
        <div style={tileStyles.content}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#F5F5F5', marginBottom: '1.5rem' }}>Investment Accounts</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }} data-testid="investments-grid">
            {vehicles.map((vehicle) => {
              const Icon = getTypeIcon(vehicle.type);
              const value = vehicleValue(vehicle.id);
              const costBasis = vehicleCostBasis(vehicle.id);
              const gainLoss = value - costBasis;
              const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;
              const holdingsCount = vehicleHoldings(vehicle.id).length;
              
              return (
                <div key={vehicle.id} style={tileStyles.cardGold} data-testid={`vehicle-${vehicle.id}`}>
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
                      onClick={() => deleteMutation.mutate(vehicle.id)}
                      style={{ padding: '0.5rem', borderRadius: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#525252' }}
                    >
                      <X style={{ width: '16px', height: '16px' }} />
                    </button>
                  </div>
                  <p style={{ fontSize: '1.125rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>{vehicle.name}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', marginBottom: '1rem' }}>
                    <span style={{ 
                      padding: '0.2rem 0.6rem', 
                      borderRadius: '12px', 
                      fontSize: '0.7rem', 
                      fontWeight: '600',
                      background: 'rgba(212, 175, 55, 0.15)',
                      color: '#D4AF37',
                    }}>
                      {getTypeLabel(vehicle.type)}
                    </span>
                    {vehicle.provider && (
                      <span style={{ fontSize: '0.8rem', color: '#8A8A8A' }}>{vehicle.provider}</span>
                    )}
                  </div>

                  {/* Value */}
                  <p style={{ fontFamily: 'monospace', fontSize: '1.5rem', fontWeight: '700', color: '#D4AF37', margin: '0 0 0.5rem 0' }}>
                    {formatCurrency(value)}
                  </p>

                  {/* Gain/Loss */}
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
                      {gainLossPercent >= 0 ? '+' : ''}{gainLossPercent.toFixed(2)}%
                    </span>
                  </div>

                  {/* Holdings count */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <PieChart style={{ width: '14px', height: '14px', color: '#8A8A8A' }} />
                    <span style={{ fontSize: '0.8rem', color: '#8A8A8A' }}>{holdingsCount} holdings</span>
                  </div>
                </div>
              );
            })}
            {!isLoading && vehicles.length === 0 && (
              <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '4rem', color: '#525252' }}>
                <LineChart style={{ width: '48px', height: '48px', margin: '0 auto 1rem', opacity: 0.5 }} />
                <p>No investment accounts yet. Add your first account to start tracking.</p>
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
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#F5F5F5', margin: 0 }}>Add Investment Account</h2>
                <button
                  onClick={() => setShowForm(false)}
                  style={{ padding: '0.5rem', borderRadius: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#8A8A8A' }}
                >
                  <X style={{ width: '20px', height: '20px' }} />
                </button>
              </div>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Account Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Fidelity 401k"
                    style={inputStyles.base}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Account Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    style={inputStyles.base}
                  >
                    <option value="401k">401(k)</option>
                    <option value="ira">IRA</option>
                    <option value="roth_ira">Roth IRA</option>
                    <option value="403b">403(b)</option>
                    <option value="sep_ira">SEP IRA</option>
                    <option value="brokerage">Brokerage</option>
                    <option value="crypto">Crypto</option>
                    <option value="hsa">HSA</option>
                    <option value="529">529 Plan</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Provider (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                    placeholder="e.g., Fidelity, Vanguard, Coinbase"
                    style={inputStyles.base}
                  />
                </div>
                <button type="submit" style={{ ...buttonStyles.primary, justifyContent: 'center', marginTop: '0.5rem' }}>
                  Create Account
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
