import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Settings as SettingsIcon, User, Brain, Shield, ChevronRight } from 'lucide-react';

export default function Settings() {
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('profile');

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.getSettings(),
  });

  const { data: aiStatus } = useQuery({
    queryKey: ['ai-status'],
    queryFn: () => api.getAIStatus(),
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data) => api.updateProfile(data),
    onSuccess: (data) => {
      updateUser(data);
      toast.success('Profile updated');
    },
    onError: (error) => toast.error(error.message),
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (data) => api.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['settings', 'ai-status']);
      toast.success('Settings updated');
    },
    onError: (error) => toast.error(error.message),
  });

  const handleToggleAI = () => {
    updateProfileMutation.mutate({ ai_enabled: !user?.ai_enabled });
  };

  const handleLLMProviderChange = (provider) => {
    updateProfileMutation.mutate({ preferred_llm_provider: provider });
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'ai', label: 'AI Settings', icon: Brain },
  ];

  if (user?.role === 'admin') {
    tabs.push({ id: 'system', label: 'System', icon: Shield });
  }

  return (
    <div className="page-container animate-fade-in" data-testid="settings-page">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-slate-400 mt-1">Manage your account and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <nav className="space-y-1" data-testid="settings-nav">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      activeTab === tab.id
                        ? 'bg-emerald-500/10 text-emerald-500 border-l-2 border-emerald-500'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                    data-testid={`settings-tab-${tab.id}`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            {activeTab === 'profile' && (
              <div className="card" data-testid="profile-settings">
                <h2 className="text-xl font-semibold text-white mb-6">Profile Settings</h2>
                <div className="space-y-6">
                  <div>
                    <label className="label">Username</label>
                    <input type="text" value={user?.username || ''} disabled className="input opacity-60" />
                    <p className="text-xs text-slate-500 mt-1">Username cannot be changed</p>
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input type="email" value={user?.email || ''} disabled className="input opacity-60" />
                  </div>
                  <div>
                    <label className="label">Full Name</label>
                    <input type="text" defaultValue={user?.full_name || ''} className="input" />
                  </div>
                  <div>
                    <label className="label">Role</label>
                    <span className={`badge ${user?.role === 'admin' ? 'badge-danger' : 'badge-info'}`}>
                      {user?.role}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="space-y-6" data-testid="ai-settings">
                <div className="card">
                  <h2 className="text-xl font-semibold text-white mb-6">AI Features</h2>
                  
                  <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg mb-6">
                    <div>
                      <p className="font-medium text-white">Enable AI Features</p>
                      <p className="text-sm text-slate-500">Get smart insights and recommendations</p>
                    </div>
                    <button
                      onClick={handleToggleAI}
                      className={`relative w-14 h-7 rounded-full transition-colors ${
                        user?.ai_enabled ? 'bg-emerald-500' : 'bg-slate-600'
                      }`}
                      data-testid="ai-toggle"
                    >
                      <div
                        className={`absolute w-5 h-5 bg-white rounded-full top-1 transition-transform ${
                          user?.ai_enabled ? 'translate-x-8' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {aiStatus && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${aiStatus.ai_available ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        <span className="text-sm text-slate-400">
                          {aiStatus.ai_available ? 'AI is available' : 'AI is not available'}
                        </span>
                      </div>
                      
                      {!aiStatus.system_ai_enabled && (
                        <p className="text-sm text-amber-500 bg-amber-500/10 px-3 py-2 rounded-lg">
                          AI features are disabled system-wide. Contact your administrator.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {user?.ai_enabled && aiStatus?.system_ai_enabled && (
                  <div className="card">
                    <h3 className="text-lg font-semibold text-white mb-4">LLM Provider</h3>
                    <div className="space-y-3">
                      {aiStatus?.available_llm_providers?.map((provider) => (
                        <button
                          key={provider}
                          onClick={() => handleLLMProviderChange(provider)}
                          className={`w-full flex items-center justify-between p-4 rounded-lg border transition-all ${
                            user?.preferred_llm_provider === provider
                              ? 'border-emerald-500 bg-emerald-500/10'
                              : 'border-slate-700 hover:border-slate-600'
                          }`}
                        >
                          <span className="capitalize text-white">{provider}</span>
                          {user?.preferred_llm_provider === provider && (
                            <span className="badge badge-success">Active</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'system' && user?.role === 'admin' && (
              <div className="card" data-testid="system-settings">
                <h2 className="text-xl font-semibold text-white mb-6">System Settings</h2>
                <p className="text-sm text-amber-500 bg-amber-500/10 px-3 py-2 rounded-lg mb-6">
                  Admin only: Changes here affect all users
                </p>

                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                    <div>
                      <p className="font-medium text-white">System-wide AI</p>
                      <p className="text-sm text-slate-500">Enable AI features for all users</p>
                    </div>
                    <button
                      onClick={() => updateSettingsMutation.mutate({ ai_enabled: !settings?.settings?.ai_enabled })}
                      className={`relative w-14 h-7 rounded-full transition-colors ${
                        settings?.settings?.ai_enabled ? 'bg-emerald-500' : 'bg-slate-600'
                      }`}
                      data-testid="system-ai-toggle"
                    >
                      <div
                        className={`absolute w-5 h-5 bg-white rounded-full top-1 transition-transform ${
                          settings?.settings?.ai_enabled ? 'translate-x-8' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {settings?.llm_keys_configured && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-400 mb-3">API Keys Status</h3>
                      <div className="grid grid-cols-3 gap-3">
                        {Object.entries(settings.llm_keys_configured).map(([provider, configured]) => (
                          <div
                            key={provider}
                            className={`p-3 rounded-lg border ${
                              configured ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-slate-700 bg-slate-800/50'
                            }`}
                          >
                            <p className="text-sm capitalize text-white">{provider}</p>
                            <p className={`text-xs ${configured ? 'text-emerald-500' : 'text-slate-500'}`}>
                              {configured ? 'Configured' : 'Not set'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
