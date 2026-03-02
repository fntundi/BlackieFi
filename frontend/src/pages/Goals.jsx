import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useEntity } from '../contexts/EntityContext';
import { toast } from 'sonner';
import { Plus, Target, X, TrendingUp, Calendar, Award, CheckCircle, PauseCircle } from 'lucide-react';
import { tileStyles, headerStyles, inputStyles, buttonStyles, GoldAccentLine, GreenAccentLine, formatCurrency, formatDate } from '../styles/tileStyles';

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

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#DC2626';
      case 'medium': return '#D4AF37';
      case 'low': return '#059669';
      default: return '#525252';
    }
  };

  const getGoalTypeLabel = (type) => {
    const labels = {
      savings: 'Savings',
      debt_payoff: 'Debt Payoff',
      investment: 'Investment',
      retirement: 'Retirement',
      emergency_fund: 'Emergency Fund',
      other: 'Other',
    };
    return labels[type] || type;
  };

  const totalTarget = goals.reduce((sum, g) => sum + parseFloat(g.target_amount || 0), 0);
  const totalCurrent = goals.reduce((sum, g) => sum + parseFloat(g.current_amount || 0), 0);
  const overallProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;
  const activeGoals = goals.filter(g => g.status === 'active').length;

  return (
    <div style={{ padding: '2rem', background: '#050505', minHeight: '100%' }} data-testid="goals-page">
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
          <div>
            <p style={headerStyles.label}>Planning</p>
            <h1 style={headerStyles.title}>Financial Goals</h1>
            <p style={headerStyles.subtitle}>Track your savings and investment goals</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            style={buttonStyles.primary}
            data-testid="add-goal-btn"
          >
            <Plus style={{ width: '20px', height: '20px' }} />
            Add Goal
          </button>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
          {/* Total Target */}
          <div style={tileStyles.statGold} data-testid="total-target">
            <GoldAccentLine />
            <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8A8A', marginBottom: '0.75rem' }}>
              Total Target
            </p>
            <p style={{ fontFamily: 'monospace', fontSize: '1.75rem', fontWeight: '700', color: '#D4AF37', margin: 0 }}>
              {formatCurrency(totalTarget)}
            </p>
          </div>

          {/* Progress */}
          <div style={tileStyles.statGreen}>
            <GreenAccentLine />
            <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8A8A', marginBottom: '0.75rem' }}>
              Total Progress
            </p>
            <p style={{ fontFamily: 'monospace', fontSize: '1.75rem', fontWeight: '700', color: '#059669', margin: 0 }}>
              {formatCurrency(totalCurrent)}
            </p>
          </div>

          {/* Overall Progress % */}
          <div style={tileStyles.stat}>
            <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8A8A', marginBottom: '0.75rem' }}>
              Overall Progress
            </p>
            <p style={{ fontFamily: 'monospace', fontSize: '1.75rem', fontWeight: '700', color: '#F5F5F5', margin: 0 }}>
              {overallProgress.toFixed(1)}%
            </p>
          </div>

          {/* Active Goals */}
          <div style={tileStyles.stat}>
            <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8A8A', marginBottom: '0.75rem' }}>
              Active Goals
            </p>
            <p style={{ fontFamily: 'monospace', fontSize: '1.75rem', fontWeight: '700', color: '#F5F5F5', margin: 0 }}>
              {activeGoals}
            </p>
          </div>
        </div>

        {/* Goals Grid */}
        <div style={tileStyles.content}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#F5F5F5', marginBottom: '1.5rem' }}>Your Goals</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }} data-testid="goals-grid">
            {goals.map((goal) => {
              const progress = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
              const progressColor = progress >= 100 ? '#059669' : progress >= 50 ? '#D4AF37' : '#F5F5F5';
              
              return (
                <div key={goal.id} style={tileStyles.cardGold} data-testid={`goal-${goal.id}`}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ 
                        padding: '0.75rem', 
                        borderRadius: '12px', 
                        background: 'rgba(212, 175, 55, 0.1)',
                        boxShadow: '0 0 20px rgba(212, 175, 55, 0.15)'
                      }}>
                        <Target style={{ width: '24px', height: '24px', color: '#D4AF37' }} />
                      </div>
                      <div>
                        <p style={{ fontSize: '1.125rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>{goal.name}</p>
                        <p style={{ fontSize: '0.8rem', color: '#8A8A8A', margin: '0.25rem 0 0 0' }}>{getGoalTypeLabel(goal.goal_type)}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.75rem', 
                        borderRadius: '20px', 
                        fontSize: '0.7rem', 
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        background: `rgba(${getPriorityColor(goal.priority) === '#DC2626' ? '220, 38, 38' : getPriorityColor(goal.priority) === '#D4AF37' ? '212, 175, 55' : '5, 150, 105'}, 0.15)`,
                        color: getPriorityColor(goal.priority),
                      }}>
                        {goal.priority}
                      </span>
                      <button
                        onClick={() => deleteMutation.mutate(goal.id)}
                        style={{ padding: '0.5rem', borderRadius: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#525252' }}
                      >
                        <X style={{ width: '16px', height: '16px' }} />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', color: '#8A8A8A' }}>Progress</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: '600', color: progressColor }}>{progress.toFixed(1)}%</span>
                    </div>
                    <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)', overflow: 'hidden' }}>
                      <div style={{ 
                        height: '100%', 
                        width: `${Math.min(progress, 100)}%`, 
                        borderRadius: '4px',
                        background: progress >= 100 
                          ? 'linear-gradient(90deg, #059669, #10B981)' 
                          : 'linear-gradient(90deg, #C4A030, #D4AF37)',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>

                  {/* Values */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <p style={{ fontSize: '0.7rem', color: '#8A8A8A', margin: 0, textTransform: 'uppercase' }}>Current</p>
                      <p style={{ fontFamily: 'monospace', fontSize: '1.25rem', fontWeight: '700', color: '#F5F5F5', margin: '0.25rem 0 0 0' }}>
                        {formatCurrency(goal.current_amount)}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '0.7rem', color: '#8A8A8A', margin: 0, textTransform: 'uppercase' }}>Target</p>
                      <p style={{ fontFamily: 'monospace', fontSize: '1.25rem', fontWeight: '700', color: '#D4AF37', margin: '0.25rem 0 0 0' }}>
                        {formatCurrency(goal.target_amount)}
                      </p>
                    </div>
                  </div>

                  {goal.deadline && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <Calendar style={{ width: '14px', height: '14px', color: '#8A8A8A' }} />
                      <span style={{ fontSize: '0.8rem', color: '#8A8A8A' }}>Deadline: {formatDate(goal.deadline)}</span>
                    </div>
                  )}
                </div>
              );
            })}
            {!isLoading && goals.length === 0 && (
              <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '4rem', color: '#525252' }}>
                <Target style={{ width: '48px', height: '48px', margin: '0 auto 1rem', opacity: 0.5 }} />
                <p>No goals yet. Create your first financial goal to get started.</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal */}
        {showForm && (
          <div style={tileStyles.modalOverlay}>
            <div style={tileStyles.modal}>
              <GoldAccentLine />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#F5F5F5', margin: 0 }}>Create Goal</h2>
                <button
                  onClick={() => setShowForm(false)}
                  style={{ padding: '0.5rem', borderRadius: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#8A8A8A' }}
                >
                  <X style={{ width: '20px', height: '20px' }} />
                </button>
              </div>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Goal Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Emergency Fund"
                    style={inputStyles.base}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Goal Type
                    </label>
                    <select
                      value={formData.goal_type}
                      onChange={(e) => setFormData({ ...formData, goal_type: e.target.value })}
                      style={inputStyles.base}
                    >
                      <option value="savings">Savings</option>
                      <option value="debt_payoff">Debt Payoff</option>
                      <option value="investment">Investment</option>
                      <option value="retirement">Retirement</option>
                      <option value="emergency_fund">Emergency Fund</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Priority
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      style={inputStyles.base}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Target Amount
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={formData.target_amount}
                      onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                      placeholder="10000"
                      style={inputStyles.base}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Current Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.current_amount}
                      onChange={(e) => setFormData({ ...formData, current_amount: e.target.value })}
                      placeholder="0"
                      style={inputStyles.base}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Monthly Contribution
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.monthly_contribution}
                      onChange={(e) => setFormData({ ...formData, monthly_contribution: e.target.value })}
                      placeholder="500"
                      style={inputStyles.base}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#8A8A8A', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Deadline
                    </label>
                    <input
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                      style={inputStyles.base}
                    />
                  </div>
                </div>
                <button type="submit" style={{ ...buttonStyles.primary, justifyContent: 'center', marginTop: '0.5rem' }}>
                  Create Goal
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
