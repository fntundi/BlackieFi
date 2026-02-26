import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useEntity } from '../contexts/EntityContext';
import { toast } from 'sonner';
import { Plus, Target, X, Play, Pause, CheckCircle2 } from 'lucide-react';

export default function Goals() {
  const { selectedEntityId } = useEntity();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    goal_type: 'savings',
    target_amount: '',
    current_amount: '',
    deadline: '',
    monthly_contribution: '',
    priority: 'medium',
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
      setFormData({ name: '', goal_type: 'savings', target_amount: '', current_amount: '', deadline: '', monthly_contribution: '', priority: 'medium' });
    },
    onError: (error) => toast.error(error.message),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => api.updateGoalStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries(['goals']);
      toast.success('Goal updated');
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      entity_id: selectedEntityId,
      name: formData.name,
      goal_type: formData.goal_type,
      target_amount: parseFloat(formData.target_amount),
      current_amount: parseFloat(formData.current_amount) || 0,
      deadline: formData.deadline || null,
      monthly_contribution: parseFloat(formData.monthly_contribution) || 0,
      priority: formData.priority,
    });
  };

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const pausedGoals = goals.filter(g => g.status === 'paused');

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'badge-danger';
      case 'medium': return 'badge-warning';
      default: return 'badge-info';
    }
  };

  const renderGoal = (goal) => {
    const progress = (goal.current_amount / goal.target_amount) * 100;
    const remaining = goal.target_amount - goal.current_amount;

    return (
      <div key={goal.id} className="card" data-testid={`goal-${goal.id}`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold text-white text-lg">{goal.name}</p>
              <span className={`badge ${getPriorityColor(goal.priority)}`}>{goal.priority}</span>
            </div>
            <p className="text-sm text-slate-500 capitalize">{goal.goal_type.replace('_', ' ')}</p>
          </div>
          <div className="flex gap-1">
            {goal.status === 'active' && (
              <button
                onClick={() => updateStatusMutation.mutate({ id: goal.id, status: 'paused' })}
                className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors"
                title="Pause"
              >
                <Pause className="w-4 h-4" />
              </button>
            )}
            {goal.status === 'paused' && (
              <button
                onClick={() => updateStatusMutation.mutate({ id: goal.id, status: 'active' })}
                className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                title="Resume"
              >
                <Play className="w-4 h-4" />
              </button>
            )}
            {progress >= 100 && goal.status !== 'completed' && (
              <button
                onClick={() => updateStatusMutation.mutate({ id: goal.id, status: 'completed' })}
                className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                title="Mark Complete"
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-400">{progress.toFixed(0)}% complete</span>
            <span className="text-white font-mono">
              ${parseFloat(goal.current_amount).toLocaleString()} / ${parseFloat(goal.target_amount).toLocaleString()}
            </span>
          </div>
          <div className="progress">
            <div
              className="progress-bar"
              style={{
                width: `${Math.min(progress, 100)}%`,
                background: progress >= 100
                  ? 'linear-gradient(90deg, #22c55e, #10b981)'
                  : 'linear-gradient(90deg, #10b981, #06b6d4)'
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-500">Remaining</span>
            <p className="font-mono text-white">${remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
          {goal.deadline && (
            <div>
              <span className="text-slate-500">Deadline</span>
              <p className="text-white">{goal.deadline}</p>
            </div>
          )}
          {goal.monthly_contribution > 0 && (
            <div>
              <span className="text-slate-500">Monthly</span>
              <p className="font-mono text-emerald-500">${parseFloat(goal.monthly_contribution).toLocaleString()}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="page-container animate-fade-in" data-testid="goals-page">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Financial Goals</h1>
            <p className="text-slate-400 mt-1">Track progress towards your financial objectives</p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn btn-primary" data-testid="add-goal-btn">
            <Plus className="w-5 h-5" />
            Add Goal
          </button>
        </div>

        <div className="grid-3 mb-8">
          <div className="stat-card">
            <p className="text-slate-400">Active Goals</p>
            <p className="stat-value text-emerald-500">{activeGoals.length}</p>
          </div>
          <div className="stat-card">
            <p className="text-slate-400">Total Target</p>
            <p className="stat-value text-cyan-500">
              ${activeGoals.reduce((sum, g) => sum + parseFloat(g.target_amount), 0).toLocaleString()}
            </p>
          </div>
          <div className="stat-card">
            <p className="text-slate-400">Completed</p>
            <p className="stat-value text-amber-500">{completedGoals.length}</p>
          </div>
        </div>

        {activeGoals.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-500" />
              Active Goals
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="active-goals">
              {activeGoals.map(renderGoal)}
            </div>
          </div>
        )}

        {pausedGoals.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Pause className="w-5 h-5 text-amber-500" />
              Paused Goals
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="paused-goals">
              {pausedGoals.map(renderGoal)}
            </div>
          </div>
        )}

        {completedGoals.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              Completed Goals
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-75" data-testid="completed-goals">
              {completedGoals.map(renderGoal)}
            </div>
          </div>
        )}

        {!isLoading && goals.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            No financial goals yet. Create your first goal to start tracking progress.
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="card w-full max-w-md" data-testid="add-goal-modal">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Create Goal</h2>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Goal Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    placeholder="e.g., Emergency Fund"
                    required
                    data-testid="goal-name-input"
                  />
                </div>
                <div>
                  <label className="label">Type</label>
                  <select
                    value={formData.goal_type}
                    onChange={(e) => setFormData({ ...formData, goal_type: e.target.value })}
                    className="input"
                    data-testid="goal-type-select"
                  >
                    <option value="savings">Savings</option>
                    <option value="emergency_fund">Emergency Fund</option>
                    <option value="debt_payoff">Debt Payoff</option>
                    <option value="investment">Investment</option>
                    <option value="retirement">Retirement</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Target Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.target_amount}
                      onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                      className="input"
                      required
                      data-testid="goal-target-input"
                    />
                  </div>
                  <div>
                    <label className="label">Current Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.current_amount}
                      onChange={(e) => setFormData({ ...formData, current_amount: e.target.value })}
                      className="input"
                      data-testid="goal-current-input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Deadline</label>
                    <input
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                      className="input"
                      data-testid="goal-deadline-input"
                    />
                  </div>
                  <div>
                    <label className="label">Monthly Contribution</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.monthly_contribution}
                      onChange={(e) => setFormData({ ...formData, monthly_contribution: e.target.value })}
                      className="input"
                      data-testid="goal-monthly-input"
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="input"
                    data-testid="goal-priority-select"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary flex-1">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary flex-1" data-testid="submit-goal-btn">
                    {createMutation.isPending ? 'Saving...' : 'Create Goal'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
