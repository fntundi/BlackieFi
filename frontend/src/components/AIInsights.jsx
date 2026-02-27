import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../api/client';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  DollarSign,
  RefreshCw,
  ChevronRight,
  Loader2
} from 'lucide-react';

export default function AIInsights({ entityId }) {
  const [activeInsight, setActiveInsight] = useState(null);

  // Check if AI is enabled
  const { data: aiStatus } = useQuery({
    queryKey: ['ai-status'],
    queryFn: () => api.getAIStatus(),
  });

  const aiEnabled = aiStatus?.effective_ai_enabled;

  // Fetch AI insights when AI is enabled
  const { data: anomalies, isLoading: loadingAnomalies, refetch: refetchAnomalies } = useQuery({
    queryKey: ['ai-anomalies', entityId],
    queryFn: () => api.detectAnomalies(entityId),
    enabled: aiEnabled && !!entityId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: forecast, isLoading: loadingForecast, refetch: refetchForecast } = useQuery({
    queryKey: ['ai-forecast', entityId],
    queryFn: () => api.forecastCashFlow(entityId, 3),
    enabled: aiEnabled && !!entityId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: savings, isLoading: loadingSavings, refetch: refetchSavings } = useQuery({
    queryKey: ['ai-savings', entityId],
    queryFn: () => api.identifyCostSavings(entityId),
    enabled: aiEnabled && !!entityId,
    staleTime: 5 * 60 * 1000,
  });

  const refreshAll = () => {
    refetchAnomalies();
    refetchForecast();
    refetchSavings();
  };

  // Don't render if AI is not enabled
  if (!aiEnabled) {
    return null;
  }

  const isLoading = loadingAnomalies || loadingForecast || loadingSavings;

  const cardStyle = {
    padding: '1.25rem',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(10, 10, 10, 0.95) 100%)',
    border: '1px solid rgba(212, 175, 55, 0.15)',
    cursor: 'pointer',
    transition: 'all 0.2s'
  };

  return (
    <div style={{ marginBottom: '2rem' }} data-testid="ai-insights-section">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles style={{ width: '20px', height: '20px', color: '#D4AF37' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#D4AF37', margin: 0 }}>AI Insights</h3>
          <span style={{ fontSize: '0.625rem', padding: '0.125rem 0.5rem', borderRadius: '4px', background: 'rgba(5, 150, 105, 0.2)', color: '#059669', textTransform: 'uppercase', fontWeight: '600' }}>Live</span>
        </div>
        <button
          onClick={refreshAll}
          disabled={isLoading}
          style={{
            padding: '0.5rem',
            borderRadius: '8px',
            background: 'rgba(212, 175, 55, 0.1)',
            border: 'none',
            cursor: isLoading ? 'wait' : 'pointer'
          }}
        >
          <RefreshCw style={{ width: '16px', height: '16px', color: '#D4AF37', animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* Insights Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        
        {/* Anomalies Card */}
        <div 
          style={cardStyle}
          onClick={() => setActiveInsight(activeInsight === 'anomalies' ? null : 'anomalies')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle style={{ width: '18px', height: '18px', color: '#EAB308' }} />
              <span style={{ fontWeight: '600', color: '#F5F5F5' }}>Spending Anomalies</span>
            </div>
            <ChevronRight style={{ width: '16px', height: '16px', color: '#525252', transform: activeInsight === 'anomalies' ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
          </div>
          
          {loadingAnomalies ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#737373' }}>
              <Loader2 style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '0.875rem' }}>Analyzing...</span>
            </div>
          ) : (
            <>
              <p style={{ fontSize: '0.875rem', color: '#A3A3A3', margin: 0 }}>
                {(anomalies?.anomalies?.length || 0) > 0 
                  ? `${anomalies.anomalies.length} unusual spending patterns detected`
                  : 'No unusual patterns detected'}
              </p>
              
              {activeInsight === 'anomalies' && anomalies?.anomalies?.length > 0 && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  {anomalies.anomalies.slice(0, 3).map((a, i) => (
                    <div key={i} style={{ marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: '500', color: '#F5F5F5', fontSize: '0.875rem' }}>{a.category}</span>
                        <span style={{ 
                          fontSize: '0.625rem', 
                          padding: '0.125rem 0.375rem', 
                          borderRadius: '4px', 
                          background: a.severity === 'high' ? 'rgba(220, 38, 38, 0.2)' : a.severity === 'medium' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                          color: a.severity === 'high' ? '#DC2626' : a.severity === 'medium' ? '#EAB308' : '#3B82F6',
                          textTransform: 'uppercase'
                        }}>{a.severity}</span>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: '#737373', margin: 0 }}>{a.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Cash Flow Forecast Card */}
        <div 
          style={cardStyle}
          onClick={() => setActiveInsight(activeInsight === 'forecast' ? null : 'forecast')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp style={{ width: '18px', height: '18px', color: '#3B82F6' }} />
              <span style={{ fontWeight: '600', color: '#F5F5F5' }}>Cash Flow Forecast</span>
            </div>
            <ChevronRight style={{ width: '16px', height: '16px', color: '#525252', transform: activeInsight === 'forecast' ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
          </div>
          
          {loadingForecast ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#737373' }}>
              <Loader2 style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '0.875rem' }}>Forecasting...</span>
            </div>
          ) : (
            <>
              <p style={{ fontSize: '0.875rem', color: '#A3A3A3', margin: 0 }}>
                {(forecast?.forecast?.length || 0) > 0 
                  ? `${forecast.forecast.length}-month outlook available`
                  : 'Forecast data not available'}
              </p>
              
              {activeInsight === 'forecast' && forecast?.forecast?.length > 0 && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  {forecast.forecast.slice(0, 3).map((f, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem', color: '#A3A3A3' }}>{f.month}</span>
                      <span style={{ 
                        fontSize: '0.875rem', 
                        fontWeight: '600',
                        color: f.net_cash_flow >= 0 ? '#059669' : '#DC2626'
                      }}>
                        {f.net_cash_flow >= 0 ? '+' : ''}${f.net_cash_flow?.toLocaleString()}
                      </span>
                    </div>
                  ))}
                  {forecast.assumptions?.length > 0 && (
                    <p style={{ fontSize: '0.75rem', color: '#525252', margin: '0.5rem 0 0', fontStyle: 'italic' }}>
                      Based on: {forecast.assumptions[0]}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Cost Savings Card */}
        <div 
          style={cardStyle}
          onClick={() => setActiveInsight(activeInsight === 'savings' ? null : 'savings')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Lightbulb style={{ width: '18px', height: '18px', color: '#059669' }} />
              <span style={{ fontWeight: '600', color: '#F5F5F5' }}>Savings Opportunities</span>
            </div>
            <ChevronRight style={{ width: '16px', height: '16px', color: '#525252', transform: activeInsight === 'savings' ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
          </div>
          
          {loadingSavings ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#737373' }}>
              <Loader2 style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '0.875rem' }}>Finding opportunities...</span>
            </div>
          ) : (
            <>
              {savings?.total_potential_savings > 0 ? (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#059669' }}>${savings.total_potential_savings.toLocaleString()}</span>
                  <span style={{ fontSize: '0.75rem', color: '#737373' }}>potential monthly savings</span>
                </div>
              ) : (
                <p style={{ fontSize: '0.875rem', color: '#A3A3A3', margin: 0 }}>No savings opportunities found</p>
              )}
              
              {activeInsight === 'savings' && savings?.opportunities?.length > 0 && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  {savings.opportunities.slice(0, 3).map((s, i) => (
                    <div key={i} style={{ marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: '500', color: '#F5F5F5', fontSize: '0.875rem' }}>{s.category}</span>
                        <span style={{ color: '#059669', fontWeight: '600', fontSize: '0.875rem' }}>
                          -${s.estimated_monthly_savings?.toLocaleString()}/mo
                        </span>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: '#737373', margin: 0 }}>{s.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
