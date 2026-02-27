import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useEntity } from '../contexts/EntityContext';
import { toast } from 'sonner';
import { Plus, LineChart, X, Building, TrendingUp, Briefcase } from 'lucide-react';

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

  const getTypeLabel = (type) => {
    const labels = {
      '401k': '401(k)',
      'ira': 'IRA',
      'roth_ira': 'Roth IRA',
      'brokerage': 'Brokerage',
      'crypto': 'Crypto',
      'other': 'Other'
    };
    return labels[type] || type;
  };

  return (
    <div style={{ padding: '2rem', background: '#050505', minHeight: '100%' }} data-testid="investments-page">
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div>
            <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#D4AF37', marginBottom: '0.5rem' }}>Portfolio</p>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '700', color: '#F5F5F5', margin: 0 }}>Investments</h1>
            <p style={{ marginTop: '0.5rem', color: '#525252' }}>Track your investment accounts</p>
          </div>
          <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.875rem 1.5rem', borderRadius: '12px', fontWeight: '600', background: 'linear-gradient(135deg, #C4A030 0%, #D4AF37 50%, #C4A030 100%)', color: '#000', border: 'none', cursor: 'pointer' }} data-testid="add-investment-btn">
            <Plus style={{ width: '20px', height: '20px' }} />
            Add Account
          </button>
        </div>

        {/* Vehicles Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }} data-testid="investments-grid">
          {vehicles.map((vehicle) => (
            <div key={vehicle.id} style={{
              padding: '1.5rem',
              borderRadius: '16px',
              background: '#0A0A0A',
              border: '1px solid rgba(212, 175, 55, 0.1)',
              transition: 'all 0.3s'
            }} data-testid={`investment-${vehicle.id}`}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(212, 175, 55, 0.1)' }}>
                  <LineChart style={{ width: '24px', height: '24px', color: '#D4AF37' }} />
                </div>
                <button onClick={() => deleteMutation.mutate(vehicle.id)} style={{ padding: '0.5rem', borderRadius: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#525252' }}>
                  <X style={{ width: '16px', height: '16px' }} />
                </button>
              </div>
              <p style={{ fontSize: '1.125rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>{vehicle.name}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '6px', background: 'rgba(212, 175, 55, 0.1)', color: '#D4AF37', fontWeight: '600' }}>{getTypeLabel(vehicle.type)}</span>
                {vehicle.provider && <span style={{ fontSize: '0.875rem', color: '#525252' }}>{vehicle.provider}</span>}
              </div>
            </div>
          ))}
          {!isLoading && vehicles.length === 0 && (
            <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '4rem', color: '#525252' }}>
              <Briefcase style={{ width: '48px', height: '48px', margin: '0 auto 1rem', opacity: 0.5 }} />
              <p>No investment accounts yet. Add your first account.</p>
            </div>
          )}
        </div>

        {/* Modal */}
        {showForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
            <div style={{ width: '100%', maxWidth: '400px', padding: '1.5rem', borderRadius: '20px', background: 'linear-gradient(180deg, #0F0F0F 0%, #0A0A0A 100%)', border: '1px solid rgba(212, 175, 55, 0.2)' }} data-testid="add-investment-modal">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>Add Investment Account</h2>
                <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#525252' }}><X style={{ width: '20px', height: '20px' }} /></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Account Name</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={inputStyle} placeholder="e.g., Fidelity 401k" required data-testid="investment-name-input" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Type</label>
                    <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }} data-testid="investment-type-select">
                      <option value="401k" style={{ background: '#0A0A0A' }}>401(k)</option>
                      <option value="ira" style={{ background: '#0A0A0A' }}>IRA</option>
                      <option value="roth_ira" style={{ background: '#0A0A0A' }}>Roth IRA</option>
                      <option value="brokerage" style={{ background: '#0A0A0A' }}>Brokerage</option>
                      <option value="crypto" style={{ background: '#0A0A0A' }}>Crypto</option>
                      <option value="other" style={{ background: '#0A0A0A' }}>Other</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Provider</label>
                    <input type="text" value={formData.provider} onChange={(e) => setFormData({ ...formData, provider: e.target.value })} style={inputStyle} placeholder="Fidelity" data-testid="investment-provider-input" />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: '0.875rem', borderRadius: '12px', fontWeight: '600', background: 'transparent', border: '1px solid rgba(212, 175, 55, 0.2)', color: '#D4AF37', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ flex: 1, padding: '0.875rem', borderRadius: '12px', fontWeight: '600', background: 'linear-gradient(135deg, #C4A030 0%, #D4AF37 50%, #C4A030 100%)', color: '#000', border: 'none', cursor: 'pointer' }} data-testid="submit-investment-btn">{createMutation.isPending ? 'Saving...' : 'Save Account'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 1024px) { [data-testid="investments-grid"] { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 640px) { [data-testid="investments-grid"] { grid-template-columns: 1fr !important; } }
        input:focus, select:focus { border-color: rgba(212, 175, 55, 0.5) !important; }
      `}</style>
    </div>
  );
}
