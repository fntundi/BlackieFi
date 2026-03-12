import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../api/client';
import { toast } from 'sonner';
import {
  Loader2,
  Briefcase,
  Target,
  LineChart,
  Building2,
  Coins,
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

export default function StrategyStudio({ onAnalysisComplete }) {
  const [selectedFramework, setSelectedFramework] = useState(null);
  const [assetType, setAssetType] = useState('stock');
  const [ticker, setTicker] = useState('');
  const [context, setContext] = useState('');

  // Fetch frameworks
  const { data: frameworksData } = useQuery({
    queryKey: ['strategy-frameworks'],
    queryFn: () => api.getStrategyFrameworks(),
  });
  const frameworks = frameworksData?.frameworks || [];

  // Analysis mutation
  const strategyMutation = useMutation({
    mutationFn: () => api.analyzeWithStrategy(
      selectedFramework?.id || 'default_0',
      assetType,
      ticker,
      context || null
    ),
    onSuccess: (data) => {
      if (onAnalysisComplete) {
        onAnalysisComplete({
          userMessage: `Strategy Analysis (${data.framework}): ${data.asset}`,
          aiResponse: data.analysis
        });
      }
      toast.success('Strategy analysis complete');
    },
    onError: (error) => toast.error(error.message || 'Strategy analysis failed'),
  });

  return (
    <div style={tileStyles.content}>
      <GoldAccentLine />
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(212, 175, 55, 0.1)', boxShadow: '0 0 20px rgba(212, 175, 55, 0.15)' }}>
          <Briefcase style={{ width: '24px', height: '24px', color: '#D4AF37' }} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>Strategy Studio</h2>
          <p style={{ fontSize: '0.8rem', color: '#8A8A8A', margin: 0 }}>Analyze investments with proven frameworks</p>
        </div>
      </div>

      {/* Framework Selection */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Investment Framework
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
          {frameworks.slice(0, 6).map((fw) => (
            <div
              key={fw.id}
              onClick={() => setSelectedFramework(fw)}
              style={{
                padding: '1rem',
                borderRadius: '12px',
                cursor: 'pointer',
                background: selectedFramework?.id === fw.id
                  ? 'linear-gradient(145deg, rgba(212, 175, 55, 0.15) 0%, rgba(212, 175, 55, 0.05) 100%)'
                  : 'rgba(255, 255, 255, 0.02)',
                border: selectedFramework?.id === fw.id
                  ? '1px solid rgba(212, 175, 55, 0.3)'
                  : '1px solid rgba(255, 255, 255, 0.05)',
                transition: 'all 0.2s'
              }}
              data-testid={`framework-${fw.id}`}
            >
              <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: selectedFramework?.id === fw.id ? '#D4AF37' : '#F5F5F5', margin: '0 0 0.25rem 0' }}>{fw.name}</h4>
              <p style={{ fontSize: '0.7rem', color: '#8A8A8A', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{fw.description}</p>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.6rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(212, 175, 55, 0.1)', color: '#D4AF37' }}>{fw.risk_tolerance}</span>
                <span style={{ fontSize: '0.6rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)', color: '#8A8A8A' }}>{fw.time_horizon}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Asset Input */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Asset Type</label>
          <select value={assetType} onChange={(e) => setAssetType(e.target.value)} style={selectStyle}>
            {assetTypes.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Ticker / Name</label>
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="e.g., AAPL, 123 Main St, Bitcoin..."
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Additional Context (Optional)</label>
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Any additional information about the investment..."
          style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
        />
      </div>

      <button
        onClick={() => strategyMutation.mutate()}
        disabled={!ticker || strategyMutation.isLoading}
        style={{
          ...buttonStyles.primary,
          width: '100%',
          justifyContent: 'center',
          opacity: (!ticker || strategyMutation.isLoading) ? 0.5 : 1
        }}
        data-testid="run-strategy-btn"
      >
        {strategyMutation.isLoading ? (
          <>
            <Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} />
            Analyzing...
          </>
        ) : (
          <>
            <Target style={{ width: '18px', height: '18px' }} />
            Run Strategy Analysis
          </>
        )}
      </button>
    </div>
  );
}
