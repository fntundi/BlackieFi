import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../../api/client';
import { useEntity } from '../../contexts/EntityContext';
import { toast } from 'sonner';
import {
  Loader2,
  FlaskConical,
  BarChart3,
  Shield,
  ClipboardCheck,
  Globe,
  PieChart,
  LineChart,
  Building2,
  Coins,
  Briefcase,
  FileText
} from 'lucide-react';
import { tileStyles, buttonStyles, GoldAccentLine } from '../../styles/tileStyles';

const inputStyle = {
  padding: '0.75rem 1rem',
  borderRadius: '10px',
  background: '#0A0A0A',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  color: '#F5F5F5',
  fontSize: '0.875rem',
  outline: 'none',
  width: '100%',
};

const selectStyle = {
  ...inputStyle,
  cursor: 'pointer',
};

const assetTypes = [
  { id: 'stock', label: 'Stock', icon: LineChart },
  { id: 'real_estate', label: 'Real Estate', icon: Building2 },
  { id: 'crypto', label: 'Crypto', icon: Coins },
  { id: 'private_equity', label: 'Private Equity', icon: Briefcase },
  { id: 'tax_lien', label: 'Tax Lien', icon: FileText },
  { id: 'precious_metal', label: 'Precious Metal', icon: Coins },
];

const analysisTypes = [
  { id: 'comprehensive', label: 'Comprehensive', icon: BarChart3, desc: 'Full asset analysis' },
  { id: 'risk', label: 'Risk Assessment', icon: Shield, desc: 'Evaluate risk factors' },
  { id: 'dd', label: 'Due Diligence', icon: ClipboardCheck, desc: 'Verification checklist' },
  { id: 'market', label: 'Market Research', icon: Globe, desc: 'Sector overview' },
  { id: 'portfolio', label: 'Portfolio', icon: PieChart, desc: 'Analyze your holdings' },
];

export default function AnalysisLab({ onAnalysisComplete }) {
  const { selectedEntityId } = useEntity();
  const [analysisType, setAnalysisType] = useState('comprehensive');
  const [assetType, setAssetType] = useState('stock');
  const [identifier, setIdentifier] = useState('');
  const [analysisDepth, setAnalysisDepth] = useState('standard');
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [timeHorizon, setTimeHorizon] = useState('medium');
  const [marketSector, setMarketSector] = useState('');

  // Mutations
  const comprehensiveMutation = useMutation({
    mutationFn: () => api.comprehensiveAnalysis(assetType, identifier, analysisDepth),
    onSuccess: (data) => {
      if (onAnalysisComplete) {
        onAnalysisComplete({
          userMessage: `Comprehensive Analysis: ${data.identifier} (${data.asset_type})`,
          aiResponse: data.analysis
        });
      }
      toast.success('Analysis complete');
    },
    onError: (error) => toast.error(error.message || 'Analysis failed'),
  });

  const riskMutation = useMutation({
    mutationFn: () => api.riskAssessment(assetType, identifier, parseFloat(investmentAmount) || 10000, timeHorizon),
    onSuccess: (data) => {
      if (onAnalysisComplete) {
        onAnalysisComplete({
          userMessage: `Risk Assessment: ${data.identifier} ($${data.investment_amount.toLocaleString()})`,
          aiResponse: data.risk_assessment
        });
      }
      toast.success('Risk assessment complete');
    },
    onError: (error) => toast.error(error.message || 'Risk assessment failed'),
  });

  const ddMutation = useMutation({
    mutationFn: () => api.dueDiligence(assetType, identifier, investmentAmount ? parseFloat(investmentAmount) : null),
    onSuccess: (data) => {
      if (onAnalysisComplete) {
        onAnalysisComplete({
          userMessage: `Due Diligence Checklist: ${data.identifier}`,
          aiResponse: data.due_diligence_checklist
        });
      }
      toast.success('Due diligence checklist generated');
    },
    onError: (error) => toast.error(error.message || 'Due diligence failed'),
  });

  const researchMutation = useMutation({
    mutationFn: () => api.marketResearch(marketSector),
    onSuccess: (data) => {
      if (onAnalysisComplete) {
        onAnalysisComplete({
          userMessage: `Market Research: ${data.sector}`,
          aiResponse: data.research
        });
      }
      toast.success('Market research complete');
    },
    onError: (error) => toast.error(error.message || 'Research failed'),
  });

  const portfolioMutation = useMutation({
    mutationFn: () => api.portfolioAnalysis(selectedEntityId),
    onSuccess: (data) => {
      if (onAnalysisComplete) {
        onAnalysisComplete({
          userMessage: `Portfolio Analysis (${data.holdings_count} holdings, $${data.total_value.toLocaleString()})`,
          aiResponse: data.analysis
        });
      }
      toast.success('Portfolio analysis complete');
    },
    onError: (error) => toast.error(error.message || 'Portfolio analysis failed'),
  });

  const handleRunAnalysis = () => {
    if (analysisType === 'comprehensive') comprehensiveMutation.mutate();
    else if (analysisType === 'risk') riskMutation.mutate();
    else if (analysisType === 'dd') ddMutation.mutate();
    else if (analysisType === 'market') researchMutation.mutate();
    else if (analysisType === 'portfolio') portfolioMutation.mutate();
  };

  const isLoading = comprehensiveMutation.isLoading || riskMutation.isLoading || ddMutation.isLoading || researchMutation.isLoading || portfolioMutation.isLoading;

  const isDisabled = (analysisType !== 'market' && analysisType !== 'portfolio' && !identifier) || (analysisType === 'market' && !marketSector) || isLoading;

  return (
    <div style={tileStyles.content}>
      <GoldAccentLine />
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(212, 175, 55, 0.1)', boxShadow: '0 0 20px rgba(212, 175, 55, 0.15)' }}>
          <FlaskConical style={{ width: '24px', height: '24px', color: '#D4AF37' }} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>Analysis Lab</h2>
          <p style={{ fontSize: '0.8rem', color: '#8A8A8A', margin: 0 }}>Deep analysis, risk assessment, and due diligence</p>
        </div>
      </div>

      {/* Analysis Type Selection */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {analysisTypes.map(type => (
          <div
            key={type.id}
            onClick={() => setAnalysisType(type.id)}
            style={{
              padding: '1rem',
              borderRadius: '12px',
              cursor: 'pointer',
              textAlign: 'center',
              background: analysisType === type.id
                ? 'linear-gradient(145deg, rgba(212, 175, 55, 0.15) 0%, rgba(212, 175, 55, 0.05) 100%)'
                : 'rgba(255, 255, 255, 0.02)',
              border: analysisType === type.id
                ? '1px solid rgba(212, 175, 55, 0.3)'
                : '1px solid rgba(255, 255, 255, 0.05)'
            }}
            data-testid={`analysis-type-${type.id}`}
          >
            <type.icon style={{ width: '24px', height: '24px', color: analysisType === type.id ? '#D4AF37' : '#8A8A8A', margin: '0 auto 0.5rem' }} />
            <p style={{ fontSize: '0.8rem', fontWeight: '600', color: analysisType === type.id ? '#D4AF37' : '#F5F5F5', margin: 0 }}>{type.label}</p>
            <p style={{ fontSize: '0.65rem', color: '#8A8A8A', margin: '0.25rem 0 0 0' }}>{type.desc}</p>
          </div>
        ))}
      </div>

      {/* Conditional Inputs */}
      {analysisType !== 'market' && analysisType !== 'portfolio' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Asset Type</label>
            <select value={assetType} onChange={(e) => setAssetType(e.target.value)} style={selectStyle}>
              {assetTypes.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Identifier</label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Ticker, address, or name..."
              style={inputStyle}
            />
          </div>
        </div>
      )}

      {analysisType === 'comprehensive' && (
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Analysis Depth</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['quick', 'standard', 'deep'].map(d => (
              <button
                key={d}
                onClick={() => setAnalysisDepth(d)}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: analysisDepth === d ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                  border: analysisDepth === d ? '1px solid rgba(212, 175, 55, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
                  color: analysisDepth === d ? '#D4AF37' : '#8A8A8A',
                  fontWeight: '600',
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      )}

      {analysisType === 'risk' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Investment Amount ($)</label>
            <input
              type="number"
              value={investmentAmount}
              onChange={(e) => setInvestmentAmount(e.target.value)}
              placeholder="10000"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Time Horizon</label>
            <select value={timeHorizon} onChange={(e) => setTimeHorizon(e.target.value)} style={selectStyle}>
              <option value="short">Short (1 year)</option>
              <option value="medium">Medium (1-5 years)</option>
              <option value="long">Long (5+ years)</option>
            </select>
          </div>
        </div>
      )}

      {analysisType === 'market' && (
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Market Sector</label>
          <input
            type="text"
            value={marketSector}
            onChange={(e) => setMarketSector(e.target.value)}
            placeholder="e.g., Technology, Real Estate, Healthcare..."
            style={inputStyle}
          />
        </div>
      )}

      {/* Run Button */}
      <button
        onClick={handleRunAnalysis}
        disabled={isDisabled}
        style={{
          ...buttonStyles.primary,
          width: '100%',
          justifyContent: 'center',
          opacity: isLoading ? 0.5 : 1
        }}
        data-testid="run-analysis-btn"
      >
        {isLoading ? (
          <>
            <Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} />
            Analyzing...
          </>
        ) : (
          <>
            <FlaskConical style={{ width: '18px', height: '18px' }} />
            Run Analysis
          </>
        )}
      </button>
    </div>
  );
}
