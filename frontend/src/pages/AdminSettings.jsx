import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import {
  Settings,
  Cpu,
  Check,
  X,
  Key,
  Play,
  Loader2,
  ChevronDown,
  Sparkles,
  Server,
  Cloud,
  Shield,
  ToggleLeft,
  ToggleRight,
  ExternalLink
} from 'lucide-react';

const PROVIDER_ICONS = {
  openrouter: Cloud,
  emergent: Sparkles,
  ollama: Server,
};

const PROVIDER_DESCRIPTIONS = {
  openrouter: 'Access 300+ models from OpenAI, Anthropic, Google, Meta, and more through a unified API.',
  emergent: 'Emergent Universal Key - Access GPT-5.2, Claude, and Gemini models with a single API key.',
  ollama: 'Run models locally on your own hardware. No API key required. Privacy-focused.',
};

export default function AdminSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expandedProvider, setExpandedProvider] = useState(null);
  const [testingProvider, setTestingProvider] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [apiKeyInputs, setApiKeyInputs] = useState({});
  const [modelSelections, setModelSelections] = useState({});

  // Check if user is admin
  const isAdmin = user?.role === 'admin';

  const { data: llmData, isLoading } = useQuery({
    queryKey: ['llm-providers'],
    queryFn: () => api.getLLMProviders(),
    enabled: isAdmin,
  });

  const { data: systemSettings } = useQuery({
    queryKey: ['system-settings'],
    queryFn: () => api.getSettings(),
  });

  const updateProviderMutation = useMutation({
    mutationFn: ({ provider, config }) => api.updateProviderConfig(provider, config),
    onSuccess: () => {
      queryClient.invalidateQueries(['llm-providers']);
      toast.success('Provider configuration updated');
    },
    onError: (error) => toast.error(error.message),
  });

  const setActiveMutation = useMutation({
    mutationFn: (provider) => api.setActiveProvider(provider),
    onSuccess: () => {
      queryClient.invalidateQueries(['llm-providers', 'system-settings', 'ai-status']);
      toast.success('Active provider updated');
    },
    onError: (error) => toast.error(error.message),
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (data) => api.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['system-settings', 'ai-status']);
      toast.success('System settings updated');
    },
    onError: (error) => toast.error(error.message),
  });

  const testProviderMutation = useMutation({
    mutationFn: (provider) => api.testProvider(provider),
    onSuccess: (data) => {
      setTestResult(data);
      if (data.success) {
        toast.success(`${data.provider} is working!`);
      } else {
        toast.error(`Test failed: ${data.error}`);
      }
    },
    onError: (error) => {
      setTestResult({ success: false, error: error.message });
      toast.error(error.message);
    },
    onSettled: () => setTestingProvider(null),
  });

  const handleToggleProvider = (provider, enabled) => {
    updateProviderMutation.mutate({
      provider: provider.id,
      config: { enabled: !enabled }
    });
  };

  const handleSaveApiKey = (providerId) => {
    const apiKey = apiKeyInputs[providerId];
    if (!apiKey) return;
    
    updateProviderMutation.mutate({
      provider: providerId,
      config: { api_key: apiKey }
    });
    setApiKeyInputs({ ...apiKeyInputs, [providerId]: '' });
  };

  const handleSaveModel = (providerId) => {
    const model = modelSelections[providerId];
    if (!model) return;
    
    updateProviderMutation.mutate({
      provider: providerId,
      config: { default_model: model }
    });
  };

  const handleTestProvider = (providerId) => {
    setTestingProvider(providerId);
    setTestResult(null);
    testProviderMutation.mutate(providerId);
  };

  const handleSetActive = (providerId) => {
    setActiveMutation.mutate(providerId);
  };

  const handleToggleSystemAI = () => {
    updateSettingsMutation.mutate({
      ai_enabled: !systemSettings?.ai_enabled
    });
  };

  if (!isAdmin) {
    return (
      <div style={{ padding: '2rem', background: '#050505', minHeight: '100%' }} data-testid="admin-settings-page">
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', padding: '4rem' }}>
          <Shield style={{ width: '64px', height: '64px', color: '#DC2626', margin: '0 auto 1.5rem' }} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#F5F5F5', marginBottom: '0.5rem' }}>Access Denied</h1>
          <p style={{ color: '#525252' }}>You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  const cardStyle = {
    padding: '1.5rem',
    borderRadius: '16px',
    background: '#0A0A0A',
    border: '1px solid rgba(212, 175, 55, 0.1)'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    background: '#0F0F0F',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#F5F5F5',
    fontSize: '0.875rem',
    outline: 'none',
    boxSizing: 'border-box'
  };

  return (
    <div style={{ padding: '2rem', background: '#050505', minHeight: '100%' }} data-testid="admin-settings-page">
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#D4AF37', marginBottom: '0.5rem' }}>Administration</p>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '700', color: '#F5F5F5', margin: 0 }}>AI Configuration</h1>
          <p style={{ marginTop: '0.5rem', color: '#525252' }}>Configure LLM providers and AI features for your organization</p>
        </div>

        {/* System AI Toggle */}
        <div style={{ ...cardStyle, marginBottom: '1.5rem', background: 'linear-gradient(135deg, #0F0F0F 0%, #0A0A0A 100%)', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(212, 175, 55, 0.1)' }}>
                <Sparkles style={{ width: '24px', height: '24px', color: '#D4AF37' }} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>System-Wide AI</h2>
                <p style={{ fontSize: '0.875rem', color: '#525252', margin: 0 }}>Master switch for all AI features across the platform</p>
              </div>
            </div>
            <button
              onClick={handleToggleSystemAI}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              data-testid="toggle-system-ai"
            >
              {systemSettings?.ai_enabled ? (
                <ToggleRight style={{ width: '48px', height: '48px', color: '#D4AF37' }} />
              ) : (
                <ToggleLeft style={{ width: '48px', height: '48px', color: '#525252' }} />
              )}
            </button>
          </div>
          <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', borderRadius: '10px', background: systemSettings?.ai_enabled ? 'rgba(5, 150, 105, 0.1)' : 'rgba(220, 38, 38, 0.1)' }}>
            <p style={{ fontSize: '0.875rem', color: systemSettings?.ai_enabled ? '#059669' : '#DC2626', margin: 0 }}>
              {systemSettings?.ai_enabled ? '✓ AI features are enabled for all users' : '✗ AI features are disabled system-wide'}
            </p>
          </div>
        </div>

        {/* Active Provider Indicator */}
        {llmData && (
          <div style={{ ...cardStyle, marginBottom: '1.5rem', background: 'rgba(212, 175, 55, 0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Cpu style={{ width: '20px', height: '20px', color: '#D4AF37' }} />
              <span style={{ fontSize: '0.875rem', color: '#A3A3A3' }}>Active Provider:</span>
              <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#D4AF37', textTransform: 'capitalize' }}>
                {llmData.active_provider}
              </span>
            </div>
          </div>
        )}

        {/* LLM Providers */}
        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#D4AF37', marginBottom: '1rem' }}>LLM Providers</h3>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <Loader2 style={{ width: '32px', height: '32px', color: '#D4AF37', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {llmData?.providers.map((provider) => {
              const Icon = PROVIDER_ICONS[provider.id] || Cpu;
              const isExpanded = expandedProvider === provider.id;
              const isActive = llmData.active_provider === provider.id;
              const isTesting = testingProvider === provider.id;

              return (
                <div
                  key={provider.id}
                  style={{
                    ...cardStyle,
                    border: isActive ? '1px solid rgba(212, 175, 55, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)',
                    transition: 'all 0.3s'
                  }}
                  data-testid={`provider-card-${provider.id}`}
                >
                  {/* Provider Header */}
                  <div
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                    onClick={() => setExpandedProvider(isExpanded ? null : provider.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{
                        padding: '0.75rem',
                        borderRadius: '12px',
                        background: provider.enabled ? 'rgba(212, 175, 55, 0.1)' : 'rgba(255, 255, 255, 0.05)'
                      }}>
                        <Icon style={{ width: '24px', height: '24px', color: provider.enabled ? '#D4AF37' : '#525252' }} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>{provider.name}</h3>
                          {isActive && (
                            <span style={{
                              fontSize: '0.625rem',
                              fontWeight: '700',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '6px',
                              background: 'rgba(212, 175, 55, 0.2)',
                              color: '#D4AF37',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em'
                            }}>Active</span>
                          )}
                          {provider.is_local && (
                            <span style={{
                              fontSize: '0.625rem',
                              fontWeight: '600',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '6px',
                              background: 'rgba(59, 130, 246, 0.1)',
                              color: '#3B82F6',
                              textTransform: 'uppercase'
                            }}>Local</span>
                          )}
                        </div>
                        <p style={{ fontSize: '0.8rem', color: '#525252', margin: 0, marginTop: '0.25rem' }}>
                          {PROVIDER_DESCRIPTIONS[provider.id]}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleProvider(provider, provider.enabled); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        data-testid={`toggle-${provider.id}`}
                      >
                        {provider.enabled ? (
                          <ToggleRight style={{ width: '36px', height: '36px', color: '#059669' }} />
                        ) : (
                          <ToggleLeft style={{ width: '36px', height: '36px', color: '#525252' }} />
                        )}
                      </button>
                      <ChevronDown style={{
                        width: '20px',
                        height: '20px',
                        color: '#525252',
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s'
                      }} />
                    </div>
                  </div>

                  {/* Expanded Configuration */}
                  {isExpanded && (
                    <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      {/* API Key Section */}
                      {provider.requires_api_key && (
                        <div style={{ marginBottom: '1.5rem' }}>
                          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>
                            API Key
                          </label>
                          <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <div style={{ flex: 1, position: 'relative' }}>
                              <Key style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#525252' }} />
                              <input
                                type="password"
                                value={apiKeyInputs[provider.id] || ''}
                                onChange={(e) => setApiKeyInputs({ ...apiKeyInputs, [provider.id]: e.target.value })}
                                style={{ ...inputStyle, paddingLeft: '2.5rem' }}
                                placeholder={provider.has_api_key ? '••••••••••••••••' : 'Enter API key...'}
                                data-testid={`api-key-input-${provider.id}`}
                              />
                            </div>
                            <button
                              onClick={() => handleSaveApiKey(provider.id)}
                              disabled={!apiKeyInputs[provider.id]}
                              style={{
                                padding: '0.75rem 1.25rem',
                                borderRadius: '10px',
                                fontWeight: '600',
                                background: apiKeyInputs[provider.id] ? 'linear-gradient(135deg, #C4A030 0%, #D4AF37 50%, #C4A030 100%)' : 'rgba(255, 255, 255, 0.05)',
                                color: apiKeyInputs[provider.id] ? '#000' : '#525252',
                                border: 'none',
                                cursor: apiKeyInputs[provider.id] ? 'pointer' : 'not-allowed'
                              }}
                              data-testid={`save-key-${provider.id}`}
                            >
                              Save
                            </button>
                          </div>
                          {provider.has_api_key && (
                            <p style={{ fontSize: '0.75rem', color: '#059669', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Check style={{ width: '14px', height: '14px' }} /> API key configured
                            </p>
                          )}
                        </div>
                      )}

                      {/* Model Selection */}
                      <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>
                          Default Model
                        </label>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <select
                            value={modelSelections[provider.id] || provider.default_model || ''}
                            onChange={(e) => setModelSelections({ ...modelSelections, [provider.id]: e.target.value })}
                            style={{ ...inputStyle, flex: 1, cursor: 'pointer' }}
                            data-testid={`model-select-${provider.id}`}
                          >
                            <ModelOptions provider={provider.id} currentModel={provider.default_model} />
                          </select>
                          <button
                            onClick={() => handleSaveModel(provider.id)}
                            disabled={!modelSelections[provider.id]}
                            style={{
                              padding: '0.75rem 1.25rem',
                              borderRadius: '10px',
                              fontWeight: '600',
                              background: modelSelections[provider.id] ? 'linear-gradient(135deg, #C4A030 0%, #D4AF37 50%, #C4A030 100%)' : 'rgba(255, 255, 255, 0.05)',
                              color: modelSelections[provider.id] ? '#000' : '#525252',
                              border: 'none',
                              cursor: modelSelections[provider.id] ? 'pointer' : 'not-allowed'
                            }}
                            data-testid={`save-model-${provider.id}`}
                          >
                            Save
                          </button>
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                          onClick={() => handleTestProvider(provider.id)}
                          disabled={!provider.enabled || isTesting}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem 1.25rem',
                            borderRadius: '10px',
                            fontWeight: '600',
                            background: 'transparent',
                            border: '1px solid rgba(212, 175, 55, 0.3)',
                            color: provider.enabled ? '#D4AF37' : '#525252',
                            cursor: provider.enabled && !isTesting ? 'pointer' : 'not-allowed'
                          }}
                          data-testid={`test-${provider.id}`}
                        >
                          {isTesting ? (
                            <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                          ) : (
                            <Play style={{ width: '16px', height: '16px' }} />
                          )}
                          Test Connection
                        </button>
                        {!isActive && provider.enabled && (
                          <button
                            onClick={() => handleSetActive(provider.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.75rem 1.25rem',
                              borderRadius: '10px',
                              fontWeight: '600',
                              background: 'linear-gradient(135deg, #C4A030 0%, #D4AF37 50%, #C4A030 100%)',
                              color: '#000',
                              border: 'none',
                              cursor: 'pointer'
                            }}
                            data-testid={`set-active-${provider.id}`}
                          >
                            <Check style={{ width: '16px', height: '16px' }} />
                            Set as Active
                          </button>
                        )}
                      </div>

                      {/* Test Result */}
                      {testResult && testingProvider === null && expandedProvider === provider.id && (
                        <div style={{
                          marginTop: '1rem',
                          padding: '1rem',
                          borderRadius: '10px',
                          background: testResult.success ? 'rgba(5, 150, 105, 0.1)' : 'rgba(220, 38, 38, 0.1)',
                          border: `1px solid ${testResult.success ? 'rgba(5, 150, 105, 0.3)' : 'rgba(220, 38, 38, 0.3)'}`
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            {testResult.success ? (
                              <Check style={{ width: '16px', height: '16px', color: '#059669' }} />
                            ) : (
                              <X style={{ width: '16px', height: '16px', color: '#DC2626' }} />
                            )}
                            <span style={{ fontWeight: '600', color: testResult.success ? '#059669' : '#DC2626' }}>
                              {testResult.success ? 'Test Passed' : 'Test Failed'}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.875rem', color: '#A3A3A3', margin: 0 }}>
                            {testResult.response || testResult.error}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Info Section */}
        <div style={{ marginTop: '2rem', padding: '1.5rem', borderRadius: '16px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
          <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#3B82F6', marginBottom: '0.75rem' }}>Provider Information</h4>
          <ul style={{ fontSize: '0.8rem', color: '#A3A3A3', margin: 0, paddingLeft: '1.25rem', lineHeight: '1.8' }}>
            <li><strong style={{ color: '#F5F5F5' }}>Emergent:</strong> Uses the Universal Key (pre-configured). Supports GPT-5.2, Claude, and Gemini models.</li>
            <li><strong style={{ color: '#F5F5F5' }}>OpenRouter:</strong> Requires an API key from <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" style={{ color: '#D4AF37' }}>openrouter.ai</a>. Access 300+ models.</li>
            <li><strong style={{ color: '#F5F5F5' }}>Ollama:</strong> Run models locally. Install from <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" style={{ color: '#D4AF37' }}>ollama.ai</a> and run <code style={{ background: 'rgba(255,255,255,0.1)', padding: '0.125rem 0.375rem', borderRadius: '4px' }}>ollama serve</code>.</li>
          </ul>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        input:focus, select:focus { border-color: rgba(212, 175, 55, 0.5) !important; }
        select option { background: #0A0A0A; }
      `}</style>
    </div>
  );
}

// Model options component
function ModelOptions({ provider, currentModel }) {
  const { data: models = [] } = useQuery({
    queryKey: ['provider-models', provider],
    queryFn: () => api.getProviderModels(provider),
  });

  return (
    <>
      <option value="" style={{ background: '#0A0A0A' }}>Select a model...</option>
      {models.map((model) => (
        <option key={model.id} value={model.id} style={{ background: '#0A0A0A' }}>
          {model.name} {currentModel === model.id ? '(current)' : ''}
        </option>
      ))}
    </>
  );
}
