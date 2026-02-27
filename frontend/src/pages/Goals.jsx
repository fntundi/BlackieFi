import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useEntity } from '../contexts/EntityContext';
import { toast } from 'sonner';
import { Plus, Target, X, TrendingUp, Calendar, Award } from 'lucide-react';

export default function Goals() {
  const { selectedEntityId } = useEntity();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    goal_type: 'savings',
    target_amount: '',
    current_amount: '0',
    deadline: '',
    monthly_contribution: '',
    priority: 'medium',
    notes: '',
  });

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals', selectedEntityId],
    queryFn: () => api.getGoals({ entity_id: selectedEntityId }),
    enabled: !!selectedEntityId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.createGoal(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['goals']);
      toast.success('Goal created');
      setShowForm(false);
      setFormData({ name: '', goal_type: 'savings', target_amount: '', current_amount: '0', deadline: '', monthly_contribution: '', priority: 'medium', notes: '' });
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteGoal(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['goals']);
      toast.success('Goal deleted');
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      entity_id: selectedEntityId,
      target_amount: parseFloat(formData.target_amount),
      current_amount: parseFloat(formData.current_amount) || 0,
      monthly_contribution: parseFloat(formData.monthly_contribution) || 0,
      deadline: formData.deadline || null,
    });
  };

  const formatCurrency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

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

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#DC2626';
      case 'medium': return '#D4AF37';
      case 'low': return '#059669';
      default: return '#525252';
    }
  };

  return (
    <div style={{ padding: '2rem', background: '#050505', minHeight: '100%' }} data-testid="goals-page">
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div>
            <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#D4AF37', marginBottom: '0.5rem' }}>Planning</p>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '700', color: '#F5F5F5', margin: 0 }}>Financial Goals</h1>
            <p style={{ marginTop: '0.5rem', color: '#525252' }}>Track your savings and investment goals</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.875rem 1.5rem',
              borderRadius: '12px',
              fontWeight: '600',
              background: 'linear-gradient(135deg, #C4A030 0%, #D4AF37 50%, #C4A030 100%)',
              color: '#000',
              border: 'none',
              cursor: 'pointer'
            }}
            data-testid="add-goal-btn"
          >
            <Plus style={{ width: '20px', height: '20px' }} />
            Add Goal
          </button>
        </div>

        {/* Goals Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }} data-testid="goals-grid">
          {goals.map((goal) => {
            const progress = (goal.current_amount / goal.target_amount) * 100;
            return (
              <div key={goal.id} style={{
                padding: '1.5rem',
                borderRadius: '16px',
                background: '#0A0A0A',
                border: '1px solid rgba(212, 175, 55, 0.1)',
                position: 'relative',
                overflow: 'hidden'
              }} data-testid={`goal-${goal.id}`}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#1A1A1A' }}>
                  <div style={{ height: '100%', width: `${Math.min(progress, 100)}%`, background: 'linear-gradient(90deg, #997B19, #D4AF37, #F9F1D8)', transition: 'width 0.5s' }}></div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem', marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(212, 175, 55, 0.1)' }}>
                      <Target style={{ width: '24px', height: '24px', color: '#D4AF37' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: '1.125rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>{goal.name}</p>
                      <p style={{ fontSize: '0.75rem', color: '#525252', textTransform: 'capitalize', marginTop: '0.125rem' }}>{goal.goal_type.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                      fontSize: '0.625rem',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '999px',
                      background: `${getPriorityColor(goal.priority)}20`,
                      color: getPriorityColor(goal.priority),
                      fontWeight: '600',
                      textTransform: 'uppercase'
                    }}>{goal.priority}</span>
                    <button
                      onClick={() => deleteMutation.mutate(goal.id)}
                      style={{ padding: '0.5rem', borderRadius: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#525252' }}
                    >
                      <X style={{ width: '16px', height: '16px' }} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div>
                    <p style={{ fontSize: '0.7rem', color: '#525252', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Progress</p>
                    <p style={{ fontFamily: 'monospace', fontSize: '1.5rem', fontWeight: '700', color: '#D4AF37', margin: 0 }}>{progress.toFixed(1)}%</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '0.7rem', color: '#525252', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Target</p>
                    <p style={{ fontFamily: 'monospace', fontSize: '1.125rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>{formatCurrency(parseFloat(goal.target_amount))}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', color: '#525252' }}>
                    <TrendingUp style={{ width: '14px', height: '14px' }} />
                    <span>{formatCurrency(parseFloat(goal.current_amount))}</span>
                  </div>
                  {goal.deadline && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', color: '#525252' }}>
                      <Calendar style={{ width: '14px', height: '14px' }} />
                      <span>{goal.deadline}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {!isLoading && goals.length === 0 && (
            <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '4rem', color: '#525252' }}>
              <Award style={{ width: '48px', height: '48px', margin: '0 auto 1rem', opacity: 0.5 }} />
              <p>No goals yet. Create your first financial goal to start tracking.</p>
            </div>
          )}
        </div>

        {/* Modal */}
        {showForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
            <div style={{ width: '100%', maxWidth: '450px', padding: '1.5rem', borderRadius: '20px', background: 'linear-gradient(180deg, #0F0F0F 0%, #0A0A0A 100%)', border: '1px solid rgba(212, 175, 55, 0.2)', maxHeight: '90vh', overflowY: 'auto' }} data-testid="add-goal-modal">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>Add Goal</h2>
                <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#525252' }}>
                  <X style={{ width: '20px', height: '20px' }} />
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Goal Name</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={inputStyle} placeholder="e.g., Emergency Fund" required data-testid="goal-name-input" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Type</label>
                    <select value={formData.goal_type} onChange={(e) => setFormData({ ...formData, goal_type: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }} data-testid="goal-type-select">
                      <option value="savings" style={{ background: '#0A0A0A' }}>Savings</option>
                      <option value="debt_payoff" style={{ background: '#0A0A0A' }}>Debt Payoff</option>
                      <option value="investment" style={{ background: '#0A0A0A' }}>Investment</option>
                      <option value="retirement" style={{ background: '#0A0A0A' }}>Retirement</option>
                      <option value="emergency_fund" style={{ background: '#0A0A0A' }}>Emergency Fund</option>
                      <option value="other" style={{ background: '#0A0A0A' }}>Other</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Priority</label>
                    <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }} data-testid="goal-priority-select">
                      <option value="low" style={{ background: '#0A0A0A' }}>Low</option>
                      <option value="medium" style={{ background: '#0A0A0A' }}>Medium</option>
                      <option value="high" style={{ background: '#0A0A0A' }}>High</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Target Amount</label>
                    <input type="number" step="0.01" value={formData.target_amount} onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })} style={inputStyle} placeholder="10000.00" required data-testid="goal-target-input" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Current Amount</label>
                    <input type="number" step="0.01" value={formData.current_amount} onChange={(e) => setFormData({ ...formData, current_amount: e.target.value })} style={inputStyle} placeholder="0.00" data-testid="goal-current-input" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Monthly Contribution</label>
                    <input type="number" step="0.01" value={formData.monthly_contribution} onChange={(e) => setFormData({ ...formData, monthly_contribution: e.target.value })} style={inputStyle} placeholder="500.00" data-testid="goal-contribution-input" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Target Date</label>
                    <input type="date" value={formData.deadline} onChange={(e) => setFormData({ ...formData, deadline: e.target.value })} style={inputStyle} data-testid="goal-deadline-input" />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: '0.875rem', borderRadius: '12px', fontWeight: '600', background: 'transparent', border: '1px solid rgba(212, 175, 55, 0.2)', color: '#D4AF37', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ flex: 1, padding: '0.875rem', borderRadius: '12px', fontWeight: '600', background: 'linear-gradient(135deg, #C4A030 0%, #D4AF37 50%, #C4A030 100%)', color: '#000', border: 'none', cursor: 'pointer' }} data-testid="submit-goal-btn">{createMutation.isPending ? 'Saving...' : 'Save Goal'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) { [data-testid="goals-grid"] { grid-template-columns: 1fr !important; } }
        input:focus, select:focus { border-color: rgba(212, 175, 55, 0.5) !important; }
      `}</style>
    </div>
  );
}
