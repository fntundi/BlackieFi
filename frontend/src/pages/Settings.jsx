import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { toast } from 'sonner';
import { Settings as SettingsIcon, User, Sparkles, Shield, Save, ToggleLeft, ToggleRight } from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [profileData, setProfileData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
  });
  const [aiEnabled, setAiEnabled] = useState(user?.ai_enabled || false);

  const { data: aiStatus } = useQuery({
    queryKey: ['ai-status'],
    queryFn: () => api.getAIStatus(),
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data) => api.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['user']);
      toast.success('Profile updated');
    },
    onError: (error) => toast.error(error.message),
  });

  const toggleAIMutation = useMutation({
    mutationFn: (enabled) => api.updateProfile({ ai_enabled: enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries(['user', 'ai-status']);
      toast.success(aiEnabled ? 'AI disabled' : 'AI enabled');
    },
    onError: (error) => toast.error(error.message),
  });

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileData);
  };

  const handleToggleAI = () => {
    const newValue = !aiEnabled;
    setAiEnabled(newValue);
    toggleAIMutation.mutate(newValue);
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

  const cardStyle = {
    padding: '1.5rem',
    borderRadius: '16px',
    background: '#0A0A0A',
    border: '1px solid rgba(212, 175, 55, 0.1)'
  };

  return (
    <div style={{ padding: '2rem', background: '#050505', minHeight: '100%' }} data-testid="settings-page">
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#D4AF37', marginBottom: '0.5rem' }}>Account</p>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '700', color: '#F5F5F5', margin: 0 }}>Settings</h1>
          <p style={{ marginTop: '0.5rem', color: '#525252' }}>Manage your account preferences</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Profile Settings */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(212, 175, 55, 0.1)' }}>
                <User style={{ width: '24px', height: '24px', color: '#D4AF37' }} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>Profile</h2>
                <p style={{ fontSize: '0.875rem', color: '#525252', margin: 0 }}>Update your personal information</p>
              </div>
            </div>

            <form onSubmit={handleProfileSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Username</label>
                  <input type="text" value={user?.username || ''} disabled style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Full Name</label>
                  <input type="text" value={profileData.full_name} onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })} style={inputStyle} placeholder="Your full name" data-testid="settings-fullname-input" />
                </div>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Email</label>
                <input type="email" value={profileData.email} onChange={(e) => setProfileData({ ...profileData, email: e.target.value })} style={inputStyle} placeholder="your@email.com" data-testid="settings-email-input" />
              </div>
              <button type="submit" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.875rem 1.5rem', borderRadius: '12px', fontWeight: '600', background: 'linear-gradient(135deg, #C4A030 0%, #D4AF37 50%, #C4A030 100%)', color: '#000', border: 'none', cursor: 'pointer' }} data-testid="save-profile-btn">
                <Save style={{ width: '18px', height: '18px' }} />
                {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>

          {/* AI Settings */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(212, 175, 55, 0.1)' }}>
                <Sparkles style={{ width: '24px', height: '24px', color: '#D4AF37' }} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>AI Features</h2>
                <p style={{ fontSize: '0.875rem', color: '#525252', margin: 0 }}>Manage AI-powered insights</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderRadius: '12px', background: '#0F0F0F', border: '1px solid rgba(255, 255, 255, 0.03)' }}>
              <div>
                <p style={{ fontWeight: '500', color: '#F5F5F5', margin: 0 }}>Enable AI Insights</p>
                <p style={{ fontSize: '0.875rem', color: '#525252', margin: 0, marginTop: '0.25rem' }}>Get AI-powered recommendations and analysis</p>
              </div>
              <button onClick={handleToggleAI} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} data-testid="toggle-ai-btn">
                {aiEnabled ? (
                  <ToggleRight style={{ width: '40px', height: '40px', color: '#D4AF37' }} />
                ) : (
                  <ToggleLeft style={{ width: '40px', height: '40px', color: '#525252' }} />
                )}
              </button>
            </div>

            {aiStatus && (
              <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '12px', background: 'rgba(212, 175, 55, 0.05)', border: '1px solid rgba(212, 175, 55, 0.1)' }}>
                <p style={{ fontSize: '0.75rem', color: '#737373', margin: 0 }}>
                  System AI: <span style={{ color: aiStatus.system_ai_enabled ? '#059669' : '#DC2626' }}>{aiStatus.system_ai_enabled ? 'Enabled' : 'Disabled'}</span>
                  {' • '}
                  Your AI: <span style={{ color: aiStatus.user_ai_enabled ? '#059669' : '#DC2626' }}>{aiStatus.user_ai_enabled ? 'Enabled' : 'Disabled'}</span>
                  {' • '}
                  Provider: <span style={{ color: '#D4AF37' }}>{aiStatus.llm_provider || 'OpenRouter'}</span>
                </p>
              </div>
            )}
          </div>

          {/* Account Info */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(212, 175, 55, 0.1)' }}>
                <Shield style={{ width: '24px', height: '24px', color: '#D4AF37' }} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>Account Info</h2>
                <p style={{ fontSize: '0.875rem', color: '#525252', margin: 0 }}>Your account details</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ padding: '1rem', borderRadius: '12px', background: '#0F0F0F' }}>
                <p style={{ fontSize: '0.7rem', color: '#525252', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Role</p>
                <p style={{ fontWeight: '600', color: '#F5F5F5', margin: 0, textTransform: 'capitalize' }}>{user?.role || 'User'}</p>
              </div>
              <div style={{ padding: '1rem', borderRadius: '12px', background: '#0F0F0F' }}>
                <p style={{ fontSize: '0.7rem', color: '#525252', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Member Since</p>
                <p style={{ fontWeight: '600', color: '#F5F5F5', margin: 0 }}>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        input:focus { border-color: rgba(212, 175, 55, 0.5) !important; }
      `}</style>
    </div>
  );
}
