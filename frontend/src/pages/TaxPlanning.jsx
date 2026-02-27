import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import {
  Calculator,
  FileText,
  Plus,
  Trash2,
  Loader2,
  TrendingUp,
  DollarSign,
  Percent,
  Sparkles,
  AlertCircle
} from 'lucide-react';

const FILING_STATUSES = [
  { id: 'single', name: 'Single' },
  { id: 'married_filing_jointly', name: 'Married Filing Jointly' },
  { id: 'married_filing_separately', name: 'Married Filing Separately' },
  { id: 'head_of_household', name: 'Head of Household' },
];

export default function TaxPlanning() {
  const [selectedEntity, setSelectedEntity] = useState('');
  const [taxYear, setTaxYear] = useState(new Date().getFullYear());
  const [filingStatus, setFilingStatus] = useState('single');
  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate] = useState(null);

  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: entities = [] } = useQuery({
    queryKey: ['entities'],
    queryFn: () => api.getEntities(),
  });

  const { data: aiStatus } = useQuery({
    queryKey: ['ai-status'],
    queryFn: () => api.getAIStatus(),
  });

  const { data: scenarios = [], isLoading: scenariosLoading } = useQuery({
    queryKey: ['tax-scenarios', selectedEntity, taxYear],
    queryFn: () => api.getTaxScenarios(selectedEntity, taxYear),
    enabled: !!selectedEntity,
  });

  useEffect(() => {
    if (entities.length > 0 && !selectedEntity) {
      setSelectedEntity(entities[0].id);
    }
  }, [entities, selectedEntity]);

  const aiEnabled = aiStatus?.effective_ai_enabled;

  const estimateTax = async () => {
    if (!selectedEntity) return;

    setEstimating(true);
    try {
      const result = await api.estimateTax(selectedEntity, taxYear, filingStatus);
      setEstimate(result);
      toast.success('Tax estimate generated');
    } catch (error) {
      toast.error(error.message || 'Failed to estimate tax');
    } finally {
      setEstimating(false);
    }
  };

  const saveScenarioMutation = useMutation({
    mutationFn: (data) => api.createTaxScenario(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tax-scenarios']);
      toast.success('Scenario saved');
    },
  });

  const deleteScenarioMutation = useMutation({
    mutationFn: (id) => api.deleteTaxScenario(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['tax-scenarios']);
      toast.success('Scenario deleted');
    },
  });

  const saveEstimateAsScenario = () => {
    if (!estimate) return;

    saveScenarioMutation.mutate({
      entity_id: selectedEntity,
      name: `Tax Estimate ${taxYear} - ${new Date().toLocaleDateString()}`,
      tax_year: taxYear,
      filing_status: filingStatus,
      total_income: estimate.total_income || 0,
      total_deductions: estimate.total_deductions || 0,
      estimated_tax_liability: estimate.estimated_tax_liability || 0,
      effective_tax_rate: estimate.effective_tax_rate || 0,
      potential_deductions: estimate.potential_deductions || [],
      potential_credits: estimate.potential_credits || [],
      recommendations: estimate.recommendations || [],
      is_baseline: scenarios.length === 0,
    });
  };

  const cardStyle = {
    padding: '1.5rem',
    borderRadius: '16px',
    background: '#0A0A0A',
    border: '1px solid rgba(212, 175, 55, 0.1)'
  };

  const inputStyle = {
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    background: '#0F0F0F',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#F5F5F5',
    width: '100%'
  };

  return (
    <div style={{ padding: '2rem', background: '#050505', minHeight: '100%' }} data-testid="tax-planning-page">
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#D4AF37', marginBottom: '0.5rem' }}>Tax Planning</p>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '700', color: '#F5F5F5', margin: 0 }}>Tax Estimator</h1>
            <p style={{ marginTop: '0.5rem', color: '#525252' }}>AI-powered tax estimation and scenario planning</p>
          </div>
        </div>

        {!aiEnabled && (
          <div style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: '12px', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertCircle style={{ width: '20px', height: '20px', color: '#EAB308' }} />
            <span style={{ color: '#EAB308' }}>AI features are disabled. Enable AI in settings to use tax estimation.</span>
          </div>
        )}

        {/* Estimator Section */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <Calculator style={{ width: '24px', height: '24px', color: '#D4AF37' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>Generate Tax Estimate</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Entity</label>
              <select value={selectedEntity} onChange={(e) => setSelectedEntity(e.target.value)} style={inputStyle} data-testid="entity-select">
                {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Tax Year</label>
              <select value={taxYear} onChange={(e) => setTaxYear(parseInt(e.target.value))} style={inputStyle}>
                {[2025, 2024, 2023, 2022].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Filing Status</label>
              <select value={filingStatus} onChange={(e) => setFilingStatus(e.target.value)} style={inputStyle}>
                {FILING_STATUSES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                onClick={estimateTax}
                disabled={!aiEnabled || !selectedEntity || estimating}
                style={{
                  width: '100%',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '10px',
                  fontWeight: '600',
                  background: (!aiEnabled || estimating) ? 'rgba(255, 255, 255, 0.05)' : 'linear-gradient(135deg, #C4A030 0%, #D4AF37 50%, #C4A030 100%)',
                  color: (!aiEnabled || estimating) ? '#525252' : '#000',
                  border: 'none',
                  cursor: (!aiEnabled || estimating) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
                data-testid="estimate-btn"
              >
                {estimating ? <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} /> : <Sparkles style={{ width: '16px', height: '16px' }} />}
                Estimate Tax
              </button>
            </div>
          </div>

          {/* Estimate Results */}
          {estimate && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#D4AF37', margin: 0 }}>Estimate Results</h3>
                <button
                  onClick={saveEstimateAsScenario}
                  style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: 'transparent', border: '1px solid rgba(212, 175, 55, 0.3)', color: '#D4AF37', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
                >
                  <Plus style={{ width: '14px', height: '14px' }} />
                  Save Scenario
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <SummaryCard icon={DollarSign} label="Total Income" value={`$${(estimate.total_income || 0).toLocaleString()}`} color="#059669" />
                <SummaryCard icon={TrendingUp} label="Deductions" value={`$${(estimate.total_deductions || 0).toLocaleString()}`} color="#3B82F6" />
                <SummaryCard icon={DollarSign} label="Est. Tax" value={`$${(estimate.estimated_tax_liability || 0).toLocaleString()}`} color="#DC2626" />
                <SummaryCard icon={Percent} label="Effective Rate" value={`${(estimate.effective_tax_rate || 0).toFixed(1)}%`} color="#D4AF37" />
              </div>

              {/* Deductions & Credits */}
              {(estimate.potential_deductions?.length > 0 || estimate.potential_credits?.length > 0) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  {estimate.potential_deductions?.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: '0.75rem', fontWeight: '600', color: '#3B82F6', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Potential Deductions</h4>
                      <div style={{ display: 'grid', gap: '0.5rem' }}>
                        {estimate.potential_deductions.map((d, i) => (
                          <div key={i} style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                              <span style={{ fontWeight: '500', color: '#F5F5F5' }}>{d.name}</span>
                              <span style={{ color: '#3B82F6', fontWeight: '600' }}>${d.amount?.toLocaleString()}</span>
                            </div>
                            {d.description && <p style={{ fontSize: '0.75rem', color: '#737373', margin: 0 }}>{d.description}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {estimate.potential_credits?.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: '0.75rem', fontWeight: '600', color: '#059669', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Potential Credits</h4>
                      <div style={{ display: 'grid', gap: '0.5rem' }}>
                        {estimate.potential_credits.map((c, i) => (
                          <div key={i} style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(5, 150, 105, 0.05)', border: '1px solid rgba(5, 150, 105, 0.15)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                              <span style={{ fontWeight: '500', color: '#F5F5F5' }}>{c.name}</span>
                              <span style={{ color: '#059669', fontWeight: '600' }}>${c.amount?.toLocaleString()}</span>
                            </div>
                            {c.description && <p style={{ fontSize: '0.75rem', color: '#737373', margin: 0 }}>{c.description}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Recommendations */}
              {estimate.recommendations?.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: '600', color: '#D4AF37', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Recommendations</h4>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                    {estimate.recommendations.map((r, i) => (
                      <li key={i} style={{ color: '#A3A3A3', marginBottom: '0.5rem', fontSize: '0.875rem' }}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Saved Scenarios */}
        <div style={{ ...cardStyle, marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <FileText style={{ width: '24px', height: '24px', color: '#D4AF37' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>Saved Scenarios</h2>
          </div>

          {scenariosLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <Loader2 style={{ width: '32px', height: '32px', color: '#D4AF37', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : scenarios.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#525252', padding: '2rem' }}>No saved scenarios. Generate an estimate and save it to compare later.</p>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {scenarios.map(scenario => (
                <div key={scenario.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.02)', border: scenario.is_baseline ? '1px solid rgba(212, 175, 55, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <p style={{ fontWeight: '600', color: '#F5F5F5', margin: 0 }}>{scenario.name}</p>
                      {scenario.is_baseline && <span style={{ fontSize: '0.625rem', fontWeight: '600', padding: '0.125rem 0.375rem', borderRadius: '4px', background: 'rgba(212, 175, 55, 0.2)', color: '#D4AF37' }}>BASELINE</span>}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: '#737373', margin: 0 }}>
                      {FILING_STATUSES.find(s => s.id === scenario.filing_status)?.name || scenario.filing_status} • Created {scenario.created_at?.split('T')[0]}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '0.75rem', color: '#737373', margin: 0 }}>Estimated Tax</p>
                      <p style={{ fontWeight: '600', color: '#DC2626', margin: 0 }}>${scenario.estimated_tax_liability?.toLocaleString()}</p>
                    </div>
                    <button
                      onClick={() => deleteScenarioMutation.mutate(scenario.id)}
                      style={{ padding: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    >
                      <Trash2 style={{ width: '16px', height: '16px', color: '#DC2626' }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '12px', background: 'rgba(234, 179, 8, 0.05)', border: '1px solid rgba(234, 179, 8, 0.15)' }}>
          <p style={{ fontSize: '0.75rem', color: '#EAB308', margin: 0 }}>
            <strong>Disclaimer:</strong> This is an estimate for informational purposes only and should not be considered professional tax advice. Consult a qualified tax professional for accurate tax planning and filing.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        select option { background: #0A0A0A; }
      `}</style>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color }) {
  return (
    <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <Icon style={{ width: '16px', height: '16px', color: '#525252' }} />
        <span style={{ fontSize: '0.7rem', color: '#737373', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      </div>
      <p style={{ fontSize: '1.25rem', fontWeight: '700', color, margin: 0 }}>{value}</p>
    </div>
  );
}
