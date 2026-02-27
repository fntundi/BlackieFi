import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import {
  Settings,
  Shield,
  Target,
  TrendingUp,
  Clock,
  Droplet,
  User,
  DollarSign,
  Plus,
  Trash2,
  Save
} from 'lucide-react';

const RISK_LEVELS = [
  { id: 'conservative', name: 'Conservative', description: 'Low risk, stable returns' },
  { id: 'moderate', name: 'Moderate', description: 'Balanced risk and return' },
  { id: 'aggressive', name: 'Aggressive', description: 'High risk, potential high returns' },
];

const EXPERIENCE_LEVELS = [
  { id: 'beginner', name: 'Beginner', description: 'New to investing' },
  { id: 'intermediate', name: 'Intermediate', description: 'Some investing experience' },
  { id: 'advanced', name: 'Advanced', description: 'Experienced investor' },
];

const LIQUIDITY_LEVELS = [
  { id: 'low', name: 'Low', description: 'Can wait years for funds' },
  { id: 'medium', name: 'Medium', description: 'May need funds within 1-3 years' },
  { id: 'high', name: 'High', description: 'May need funds quickly' },
];

export default function FinancialSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedEntity, setSelectedEntity] = useState('');
  const [profile, setProfile] = useState({
    risk_tolerance: 'moderate',
    investment_experience: 'beginner',
    age: '',
    annual_income: '',
    time_horizon: 10,
    liquidity_needs: 'medium',
    financial_goals: [],
  });
  const [newGoal, setNewGoal] = useState({ goal: '', target_amount: '', timeline_years: '' });

  const isAdmin = user?.role === 'admin';

  const { data: entities = [] } = useQuery({
    queryKey: ['entities'],
    queryFn: () => api.getEntities(),
  });

  const { data: existingProfile, isLoading } = useQuery({
    queryKey: ['financial-profile', selectedEntity],
    queryFn: () => api.getFinancialProfile(selectedEntity),
    enabled: !!selectedEntity && isAdmin,
    retry: false,
    onError: () => {},
  });

  useEffect(() => {
    if (entities.length > 0 && !selectedEntity) {
      setSelectedEntity(entities[0].id);
    }
  }, [entities, selectedEntity]);

  useEffect(() => {
    if (existingProfile) {
      setProfile({
        risk_tolerance: existingProfile.risk_tolerance || 'moderate',
        investment_experience: existingProfile.investment_experience || 'beginner',
        age: existingProfile.age || '',
        annual_income: existingProfile.annual_income || '',
        time_horizon: existingProfile.time_horizon || 10,
        liquidity_needs: existingProfile.liquidity_needs || 'medium',
        financial_goals: existingProfile.financial_goals || [],
      });
    } else {
      setProfile({
        risk_tolerance: 'moderate',
        investment_experience: 'beginner',
        age: '',
        annual_income: '',
        time_horizon: 10,
        liquidity_needs: 'medium',
        financial_goals: [],
      });
    }
  }, [existingProfile, selectedEntity]);

  const saveMutation = useMutation({
    mutationFn: (data) => api.saveFinancialProfile({ ...data, entity_id: selectedEntity }),
    onSuccess: () => {
      queryClient.invalidateQueries(['financial-profile']);
      toast.success('Profile saved');
    },
    onError: (err) => toast.error(err.message),
  });

  const addGoal = () => {
    if (!newGoal.goal) return;
    setProfile({
      ...profile,
      financial_goals: [...profile.financial_goals, {
        goal: newGoal.goal,
        target_amount: newGoal.target_amount ? parseFloat(newGoal.target_amount) : null,
        timeline_years: newGoal.timeline_years ? parseInt(newGoal.timeline_years) : null,
      }],
    });
    setNewGoal({ goal: '', target_amount: '', timeline_years: '' });
  };

  const removeGoal = (index) => {
    setProfile({
      ...profile,
      financial_goals: profile.financial_goals.filter((_, i) => i !== index),
    });
  };

  const handleSave = () => {
    saveMutation.mutate(profile);
  };

  if (!isAdmin) {
    return (
      <div style={{ padding: '2rem', background: '#050505', minHeight: '100%' }} data-testid="financial-settings-page">
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', padding: '4rem' }}>
          <Shield style={{ width: '64px', height: '64px', color: '#DC2626', margin: '0 auto 1.5rem' }} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#F5F5F5', marginBottom: '0.5rem' }}>Access Denied</h1>
          <p style={{ color: '#525252' }}>You need admin privileges to access financial settings.</p>
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
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    background: '#0F0F0F',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#F5F5F5',
    width: '100%'
  };

  return (
    <div style={{ padding: '2rem', background: '#050505', minHeight: '100%' }} data-testid="financial-settings-page">
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#D4AF37', marginBottom: '0.5rem' }}>Configuration</p>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '700', color: '#F5F5F5', margin: 0 }}>Financial Settings</h1>
            <p style={{ marginTop: '0.5rem', color: '#525252' }}>Configure investment profile and financial goals</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              style={{ ...inputStyle, width: 'auto', minWidth: '180px' }}
              data-testid="entity-select"
            >
              {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <button
              onClick={handleSave}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '10px',
                fontWeight: '600',
                background: 'linear-gradient(135deg, #C4A030 0%, #D4AF37 50%, #C4A030 100%)',
                color: '#000',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              data-testid="save-profile-btn"
            >
              <Save style={{ width: '18px', height: '18px' }} />
              Save
            </button>
          </div>
        </div>

        {/* Risk Tolerance */}
        <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <TrendingUp style={{ width: '24px', height: '24px', color: '#D4AF37' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>Risk Tolerance</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {RISK_LEVELS.map(level => (
              <button
                key={level.id}
                onClick={() => setProfile({ ...profile, risk_tolerance: level.id })}
                style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  textAlign: 'left',
                  background: profile.risk_tolerance === level.id ? 'rgba(212, 175, 55, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                  border: profile.risk_tolerance === level.id ? '1px solid rgba(212, 175, 55, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)',
                  cursor: 'pointer'
                }}
              >
                <p style={{ fontWeight: '600', color: profile.risk_tolerance === level.id ? '#D4AF37' : '#F5F5F5', marginBottom: '0.25rem' }}>{level.name}</p>
                <p style={{ fontSize: '0.75rem', color: '#737373', margin: 0 }}>{level.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Investment Experience */}
        <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <User style={{ width: '24px', height: '24px', color: '#D4AF37' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>Investment Experience</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {EXPERIENCE_LEVELS.map(level => (
              <button
                key={level.id}
                onClick={() => setProfile({ ...profile, investment_experience: level.id })}
                style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  textAlign: 'left',
                  background: profile.investment_experience === level.id ? 'rgba(212, 175, 55, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                  border: profile.investment_experience === level.id ? '1px solid rgba(212, 175, 55, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)',
                  cursor: 'pointer'
                }}
              >
                <p style={{ fontWeight: '600', color: profile.investment_experience === level.id ? '#D4AF37' : '#F5F5F5', marginBottom: '0.25rem' }}>{level.name}</p>
                <p style={{ fontSize: '0.75rem', color: '#737373', margin: 0 }}>{level.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Personal Details */}
        <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <Settings style={{ width: '24px', height: '24px', color: '#D4AF37' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>Personal Details</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Age</label>
              <input
                type="number"
                value={profile.age}
                onChange={(e) => setProfile({ ...profile, age: e.target.value ? parseInt(e.target.value) : '' })}
                style={inputStyle}
                placeholder="Enter age"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Annual Income</label>
              <input
                type="number"
                value={profile.annual_income}
                onChange={(e) => setProfile({ ...profile, annual_income: e.target.value ? parseFloat(e.target.value) : '' })}
                style={inputStyle}
                placeholder="$0"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Time Horizon (Years)</label>
              <input
                type="number"
                value={profile.time_horizon}
                onChange={(e) => setProfile({ ...profile, time_horizon: parseInt(e.target.value) || 10 })}
                style={inputStyle}
                placeholder="10"
              />
            </div>
          </div>
        </div>

        {/* Liquidity Needs */}
        <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <Droplet style={{ width: '24px', height: '24px', color: '#D4AF37' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>Liquidity Needs</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {LIQUIDITY_LEVELS.map(level => (
              <button
                key={level.id}
                onClick={() => setProfile({ ...profile, liquidity_needs: level.id })}
                style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  textAlign: 'left',
                  background: profile.liquidity_needs === level.id ? 'rgba(212, 175, 55, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                  border: profile.liquidity_needs === level.id ? '1px solid rgba(212, 175, 55, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)',
                  cursor: 'pointer'
                }}
              >
                <p style={{ fontWeight: '600', color: profile.liquidity_needs === level.id ? '#D4AF37' : '#F5F5F5', marginBottom: '0.25rem' }}>{level.name}</p>
                <p style={{ fontSize: '0.75rem', color: '#737373', margin: 0 }}>{level.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Financial Goals */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <Target style={{ width: '24px', height: '24px', color: '#D4AF37' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>Financial Goals</h2>
          </div>

          {/* Add Goal */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '0.75rem', marginBottom: '1rem' }}>
            <input
              type="text"
              value={newGoal.goal}
              onChange={(e) => setNewGoal({ ...newGoal, goal: e.target.value })}
              style={inputStyle}
              placeholder="Goal name (e.g., Retirement)"
            />
            <input
              type="number"
              value={newGoal.target_amount}
              onChange={(e) => setNewGoal({ ...newGoal, target_amount: e.target.value })}
              style={inputStyle}
              placeholder="Target $"
            />
            <input
              type="number"
              value={newGoal.timeline_years}
              onChange={(e) => setNewGoal({ ...newGoal, timeline_years: e.target.value })}
              style={inputStyle}
              placeholder="Years"
            />
            <button
              onClick={addGoal}
              disabled={!newGoal.goal}
              style={{
                padding: '0.75rem',
                borderRadius: '10px',
                background: newGoal.goal ? 'linear-gradient(135deg, #C4A030 0%, #D4AF37 50%, #C4A030 100%)' : 'rgba(255, 255, 255, 0.05)',
                color: newGoal.goal ? '#000' : '#525252',
                border: 'none',
                cursor: newGoal.goal ? 'pointer' : 'not-allowed'
              }}
            >
              <Plus style={{ width: '20px', height: '20px' }} />
            </button>
          </div>

          {/* Goals List */}
          {profile.financial_goals.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#525252', padding: '2rem' }}>No goals added yet</p>
          ) : (
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {profile.financial_goals.map((goal, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <div>
                    <p style={{ fontWeight: '600', color: '#F5F5F5', marginBottom: '0.25rem' }}>{goal.goal}</p>
                    <p style={{ fontSize: '0.75rem', color: '#737373', margin: 0 }}>
                      {goal.target_amount && `$${goal.target_amount.toLocaleString()}`}
                      {goal.target_amount && goal.timeline_years && ' • '}
                      {goal.timeline_years && `${goal.timeline_years} years`}
                    </p>
                  </div>
                  <button onClick={() => removeGoal(index)} style={{ padding: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                    <Trash2 style={{ width: '16px', height: '16px', color: '#DC2626' }} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        select option { background: #0A0A0A; }
      `}</style>
    </div>
  );
}
