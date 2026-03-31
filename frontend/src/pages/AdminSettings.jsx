import React, { useState, useEffect } from 'react';
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
  ExternalLink,
  Users,
  UserPlus,
  Database
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
  const isAdmin = user?.role === 'admin';

  const [expandedProvider, setExpandedProvider] = useState(null);
  const [testingProvider, setTestingProvider] = useState(null);
  const [storageForm, setStorageForm] = useState({
    provider: 'minio',
    endpoint_url: '',
    bucket: '',
    access_key: '',
    secret_key: '',
    region: '',
    secure: true,
    path_prefix: '',
    enabled: false
  });
  const [baseUrlInputs, setBaseUrlInputs] = useState({});
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    role: 'user'
  });
  const [inviteUser, setInviteUser] = useState({
    email: '',
    full_name: '',
    role: 'user'
  });
  const [selectedUserId, setSelectedUserId] = useState('');
  const [accessGrant, setAccessGrant] = useState({ entity_id: '', role: 'user' });
  const [testResult, setTestResult] = useState(null);
  const [apiKeyInputs, setApiKeyInputs] = useState({});
  const [modelSelections, setModelSelections] = useState({});

  const { data: storageSettings } = useQuery({
    queryKey: ['storage-settings'],
    queryFn: () => api.getStorageSettings(),
    enabled: isAdmin,
  });

  const { data: adminUsers = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.listAdminUsers(),
    enabled: isAdmin,
  });

  const { data: adminEntities = [] } = useQuery({
    queryKey: ['admin-entities'],
    queryFn: () => api.listAdminEntities(),
    enabled: isAdmin,
  });

  const { data: selectedUserAccess = [] } = useQuery({
    queryKey: ['user-entity-access', selectedUserId],
    queryFn: () => api.listUserEntityAccess(selectedUserId),
    enabled: isAdmin && !!selectedUserId,
  });

  useEffect(() => {
    if (storageSettings) {
      const { access_key_last4, ...rest } = storageSettings;
      setStorageForm((prev) => ({
        ...prev,
        ...rest,
        access_key: '',
        secret_key: ''
      }));
    }
  }, [storageSettings]);

  useEffect(() => {
    if (!selectedUserId && adminUsers.length > 0) {
      setSelectedUserId(adminUsers[0].id);
    }
  }, [adminUsers, selectedUserId]);

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

  const updateStorageMutation = useMutation({
    mutationFn: (config) => api.updateStorageSettings(config),
    onSuccess: () => {
      queryClient.invalidateQueries(['storage-settings']);
      toast.success('Storage settings updated');
    },
    onError: (error) => toast.error(error.message),
  });

  const createUserMutation = useMutation({
    mutationFn: (data) => api.createAdminUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-users']);
      toast.success('User created');
      setNewUser({ username: '', email: '', password: '', full_name: '', role: 'user' });
    },
    onError: (error) => toast.error(error.message),
  });

  const inviteUserMutation = useMutation({
    mutationFn: (data) => api.inviteAdminUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-users']);
      toast.success('Invitation sent');
      setInviteUser({ email: '', full_name: '', role: 'user' });
    },
    onError: (error) => toast.error(error.message),
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: ({ userId, role }) => api.updateUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-users']);
      toast.success('User role updated');
    },
    onError: (error) => toast.error(error.message),
  });

  const grantAccessMutation = useMutation({
    mutationFn: ({ userId, payload }) => api.grantUserEntityAccess(userId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['user-entity-access', selectedUserId]);
      toast.success('Entity access granted');
      setAccessGrant({ entity_id: '', role: 'user' });
    },
    onError: (error) => toast.error(error.message),
  });

  const revokeEntityAccessMutation = useMutation({
    mutationFn: ({ userId, entityId }) => api.revokeUserEntityAccess(userId, entityId),
    onSuccess: () => {
      queryClient.invalidateQueries(['user-entity-access', selectedUserId]);
      toast.success('Entity access revoked');
    },
    onError: (error) => toast.error(error.message),
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

  const handleSaveStorage = () => {
    const payload = { ...storageForm };
    if (!payload.secret_key) {
      delete payload.secret_key;
    }
    updateStorageMutation.mutate(payload);
  };

  const handleSaveBaseUrl = (providerId) => {
    const baseUrl = baseUrlInputs[providerId];
    if (!baseUrl) return;
    updateProviderMutation.mutate({
      provider: providerId,
      config: { base_url: baseUrl }
    });
  };

  const handleCreateUser = () => {
    if (!newUser.username || !newUser.email || !newUser.password) {
      toast.error('Please fill in all required fields');
      return;
    }
    createUserMutation.mutate(newUser);
  };

  const handleInviteUser = () => {
    if (!inviteUser.email) {
      toast.error('Please enter an email address');
      return;
    }
    inviteUserMutation.mutate(inviteUser);
  };

  const handleGrantAccess = () => {
    if (!selectedUserId || !accessGrant.entity_id) {
      toast.error('Please select a user and entity');
      return;
    }
    grantAccessMutation.mutate({
      userId: selectedUserId,
      payload: { entity_id: accessGrant.entity_id, role: accessGrant.role }
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


                      {['openrouter', 'ollama'].includes(provider.id) && (
                        <div style={{ marginBottom: '1.5rem' }}>
                          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>
                            Base URL
                          </label>
                          <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <input
                              value={baseUrlInputs[provider.id] ?? provider.base_url ?? ''}
                              onChange={(e) => setBaseUrlInputs({ ...baseUrlInputs, [provider.id]: e.target.value })}
                              style={{ ...inputStyle, flex: 1 }}
                              placeholder={provider.id === 'ollama' ? 'http://localhost:11434' : 'https://openrouter.ai/api/v1'}
                              data-testid={`base-url-${provider.id}`}
                            />
                            <button
                              onClick={() => handleSaveBaseUrl(provider.id)}
                              disabled={!baseUrlInputs[provider.id]}
                              style={{
                                padding: '0.75rem 1.25rem',
                                borderRadius: '10px',
                                fontWeight: '600',
                                background: baseUrlInputs[provider.id] ? 'linear-gradient(135deg, #C4A030 0%, #D4AF37 50%, #C4A030 100%)' : 'rgba(255, 255, 255, 0.05)',
                                color: baseUrlInputs[provider.id] ? '#000' : '#525252',
                                border: 'none',
                                cursor: baseUrlInputs[provider.id] ? 'pointer' : 'not-allowed'
                              }}
                              data-testid={`save-base-url-${provider.id}`}
                            >
                              Save
                            </button>
                          </div>
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

        {/* Object Storage Settings */}
        <div style={{ ...cardStyle, marginTop: '2rem' }} data-testid="storage-settings-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)' }}>
              <Database style={{ width: '22px', height: '22px', color: '#3B82F6' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>Object Storage (MinIO)</h2>
              <p style={{ margin: 0, color: '#525252', fontSize: '0.85rem' }}>Configure bucket storage for entity documents</p>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <div>
              <label style={{ fontSize: '0.7rem', color: '#737373', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Endpoint URL</label>
              <input value={storageForm.endpoint_url} onChange={(e) => setStorageForm({ ...storageForm, endpoint_url: e.target.value })} style={inputStyle} data-testid="storage-endpoint-input" placeholder="http://minio:9000" />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: '#737373', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Bucket</label>
              <input value={storageForm.bucket} onChange={(e) => setStorageForm({ ...storageForm, bucket: e.target.value })} style={inputStyle} data-testid="storage-bucket-input" />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: '#737373', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Access Key</label>
              <input value={storageForm.access_key} onChange={(e) => setStorageForm({ ...storageForm, access_key: e.target.value })} style={inputStyle} placeholder={storageSettings?.access_key_last4 ? `••••${storageSettings.access_key_last4}` : 'Enter access key'} data-testid="storage-access-key-input" />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: '#737373', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Secret Key</label>
              <input value={storageForm.secret_key} onChange={(e) => setStorageForm({ ...storageForm, secret_key: e.target.value })} style={inputStyle} placeholder={storageSettings?.secret_key_set ? '••••••••' : 'Enter secret key'} data-testid="storage-secret-key-input" />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: '#737373', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Region</label>
              <input value={storageForm.region || ''} onChange={(e) => setStorageForm({ ...storageForm, region: e.target.value })} style={inputStyle} data-testid="storage-region-input" placeholder="us-east-1" />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: '#737373', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Path Prefix</label>
              <input value={storageForm.path_prefix || ''} onChange={(e) => setStorageForm({ ...storageForm, path_prefix: e.target.value })} style={inputStyle} data-testid="storage-prefix-input" placeholder="blackiefi" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '2rem', marginTop: '1.25rem', alignItems: 'center' }}>
            <button onClick={() => setStorageForm({ ...storageForm, enabled: !storageForm.enabled })} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} data-testid="toggle-storage-enabled">
              {storageForm.enabled ? (
                <ToggleRight style={{ width: '40px', height: '40px', color: '#D4AF37' }} />
              ) : (
                <ToggleLeft style={{ width: '40px', height: '40px', color: '#525252' }} />
              )}
            </button>
            <div>
              <p style={{ margin: 0, color: '#F5F5F5', fontWeight: '600' }}>Storage Enabled</p>
              <p style={{ margin: 0, color: '#525252', fontSize: '0.8rem' }}>Uploads will use MinIO/S3 configuration</p>
            </div>
            <button onClick={() => setStorageForm({ ...storageForm, secure: !storageForm.secure })} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: 'auto' }} data-testid="toggle-storage-secure">
              {storageForm.secure ? (
                <ToggleRight style={{ width: '40px', height: '40px', color: '#D4AF37' }} />
              ) : (
                <ToggleLeft style={{ width: '40px', height: '40px', color: '#525252' }} />
              )}
            </button>
            <div>
              <p style={{ margin: 0, color: '#F5F5F5', fontWeight: '600' }}>Use SSL</p>
              <p style={{ margin: 0, color: '#525252', fontSize: '0.8rem' }}>Recommended for production</p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button onClick={handleSaveStorage} style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', fontWeight: '600', background: 'linear-gradient(135deg, #C4A030 0%, #D4AF37 50%, #C4A030 100%)', color: '#000', border: 'none', cursor: 'pointer' }} data-testid="save-storage-settings">
              Save Storage Settings
            </button>
          </div>
        </div>

        {/* User Management */}
        <div style={{ ...cardStyle, marginTop: '2rem' }} data-testid="user-management-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(212, 175, 55, 0.1)' }}>
              <Users style={{ width: '22px', height: '22px', color: '#D4AF37' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>Users & Access</h2>
              <p style={{ margin: 0, color: '#525252', fontSize: '0.85rem' }}>Create users, assign roles, and grant entity access</p>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <div>
              <h3 style={{ fontSize: '0.85rem', color: '#A3A3A3', marginBottom: '0.75rem' }}>Create User</h3>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <input value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} style={inputStyle} placeholder="Username" data-testid="create-user-username" />
                <input value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} style={inputStyle} placeholder="Email" data-testid="create-user-email" />
                <input value={newUser.full_name} onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })} style={inputStyle} placeholder="Full Name" data-testid="create-user-full-name" />
                <input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} style={inputStyle} placeholder="Temporary Password" data-testid="create-user-password" />
                <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }} data-testid="create-user-role">
                  <option value="admin">Admin</option>
                  <option value="accountant">Accountant</option>
                  <option value="user">User</option>
                </select>
                <button onClick={handleCreateUser} style={{ padding: '0.75rem', borderRadius: '10px', background: 'rgba(212, 175, 55, 0.15)', border: '1px solid rgba(212, 175, 55, 0.3)', color: '#D4AF37', cursor: 'pointer' }} data-testid="create-user-submit">
                  Create User
                </button>
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '0.85rem', color: '#A3A3A3', marginBottom: '0.75rem' }}>Invite User</h3>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <input value={inviteUser.email} onChange={(e) => setInviteUser({ ...inviteUser, email: e.target.value })} style={inputStyle} placeholder="Email" data-testid="invite-user-email" />
                <input value={inviteUser.full_name} onChange={(e) => setInviteUser({ ...inviteUser, full_name: e.target.value })} style={inputStyle} placeholder="Full Name" data-testid="invite-user-full-name" />
                <select value={inviteUser.role} onChange={(e) => setInviteUser({ ...inviteUser, role: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }} data-testid="invite-user-role">
                  <option value="admin">Admin</option>
                  <option value="accountant">Accountant</option>
                  <option value="user">User</option>
                </select>
                <button onClick={handleInviteUser} style={{ padding: '0.75rem', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#3B82F6', cursor: 'pointer' }} data-testid="invite-user-submit">
                  Send Invite
                </button>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '2rem' }}>
            <h3 style={{ fontSize: '0.85rem', color: '#A3A3A3', marginBottom: '0.75rem' }}>User Roles</h3>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {adminUsers.map((user) => (
                <div key={user.id} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr', gap: '0.75rem', alignItems: 'center', padding: '0.75rem', borderRadius: '12px', background: '#0F0F0F', border: '1px solid rgba(255,255,255,0.06)' }} data-testid={`admin-user-${user.id}`}>
                  <div>
                    <p style={{ margin: 0, color: '#F5F5F5' }}>{user.full_name || user.username}</p>
                    <p style={{ margin: 0, color: '#525252', fontSize: '0.75rem' }}>{user.email}</p>
                  </div>
                  <select value={user.role} onChange={(e) => updateUserRoleMutation.mutate({ userId: user.id, role: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }} data-testid={`admin-user-role-${user.id}`}>
                    <option value="admin">Admin</option>
                    <option value="accountant">Accountant</option>
                    <option value="user">User</option>
                  </select>
                  <div style={{ fontSize: '0.75rem', color: '#525252' }}>{new Date(user.created_at).toLocaleDateString()}</div>
                  <div style={{ fontSize: '0.75rem', color: '#525252' }}>AI: {user.ai_enabled ? 'On' : 'Off'}</div>
                </div>
              ))}
              {adminUsers.length === 0 && (
                <p style={{ color: '#525252' }}>No users found.</p>
              )}
            </div>
          </div>

          <div style={{ marginTop: '2rem' }}>
            <h3 style={{ fontSize: '0.85rem', color: '#A3A3A3', marginBottom: '0.75rem' }}>Entity Access</h3>
            <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
              <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }} data-testid="access-user-select">
                {adminUsers.map((user) => (
                  <option key={user.id} value={user.id}>{user.full_name || user.username}</option>
                ))}
              </select>
              <select value={accessGrant.entity_id} onChange={(e) => setAccessGrant({ ...accessGrant, entity_id: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }} data-testid="access-entity-select">
                <option value="">Select entity...</option>
                {adminEntities.map((entity) => (
                  <option key={entity.id} value={entity.id}>{entity.name} ({entity.type})</option>
                ))}
              </select>
              <select value={accessGrant.role} onChange={(e) => setAccessGrant({ ...accessGrant, role: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }} data-testid="access-role-select">
                <option value="admin">Admin</option>
                <option value="accountant">Accountant</option>
                <option value="user">User</option>
              </select>
            </div>
            <button onClick={handleGrantAccess} style={{ marginTop: '0.75rem', padding: '0.75rem 1.25rem', borderRadius: '10px', background: 'rgba(212, 175, 55, 0.15)', border: '1px solid rgba(212, 175, 55, 0.3)', color: '#D4AF37', cursor: 'pointer' }} data-testid="grant-entity-access">
              Grant Access
            </button>

            <div style={{ marginTop: '1rem', display: 'grid', gap: '0.75rem' }}>
              {selectedUserAccess.map((access) => (
                <div key={`${access.entity_id}-${access.role}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderRadius: '12px', background: '#0F0F0F', border: '1px solid rgba(255,255,255,0.06)' }} data-testid={`entity-access-${access.entity_id}`}>
                  <div>
                    <p style={{ margin: 0, color: '#F5F5F5' }}>{access.entity_name || access.entity_id}</p>
                    <p style={{ margin: 0, color: '#525252', fontSize: '0.75rem' }}>Role: {access.role}</p>
                  </div>
                  <button onClick={() => revokeEntityAccessMutation.mutate({ userId: selectedUserId, entityId: access.entity_id })} style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#A3A3A3', cursor: 'pointer' }} data-testid={`revoke-access-${access.entity_id}`}>
                    Revoke
                  </button>
                </div>
              ))}
              {selectedUserAccess.length === 0 && (
                <p style={{ color: '#525252' }}>No entity access assigned.</p>
              )}
            </div>
          </div>
        </div>
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
