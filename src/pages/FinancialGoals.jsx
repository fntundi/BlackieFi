import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Target, 
  TrendingUp, 
  Calendar,
  DollarSign,
  Sparkles,
  Loader2,
  CheckCircle2,
  Pause,
  Play
} from 'lucide-react';
import { toast } from 'sonner';

export default function FinancialGoals() {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(null);
  const [formData, setFormData] = useState({
    entity_id: '',
    name: '',
    goal_type: 'savings',
    target_amount: '',
    current_amount: '0',
    deadline: '',
    monthly_contribution: '',
    priority: 'medium',
    notes: ''
  });

  const queryClient = useQueryClient();

  const { data: entities = [] } = useQuery({
    queryKey: ['entities'],
    queryFn: () => base44.entities.Entity.list(),
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: () => base44.entities.FinancialGoal.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FinancialGoal.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['goals']);
      setShowDialog(false);
      resetForm();
      toast.success('Goal created');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FinancialGoal.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['goals']);
      toast.success('Goal updated');
    },
  });

  const resetForm = () => {
    setFormData({
      entity_id: '',
      name: '',
      goal_type: 'savings',
      target_amount: '',
      current_amount: '0',
      deadline: '',
      monthly_contribution: '',
      priority: 'medium',
      notes: ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      target_amount: parseFloat(formData.target_amount),
      current_amount: parseFloat(formData.current_amount) || 0,
      monthly_contribution: parseFloat(formData.monthly_contribution) || 0
    });
  };

  const getRecommendations = async (goalId) => {
    setLoadingRecommendations(goalId);
    try {
      const { data } = await base44.functions.invoke('generateGoalRecommendations', {
        goal_id: goalId
      });
      queryClient.invalidateQueries(['goals']);
      setSelectedGoal(goals.find(g => g.id === goalId));
      toast.success('Recommendations generated');
    } catch (error) {
      toast.error('Failed to generate recommendations');
    } finally {
      setLoadingRecommendations(null);
    }
  };

  const toggleGoalStatus = (goal) => {
    const newStatus = goal.status === 'active' ? 'paused' : 'active';
    updateMutation.mutate({
      id: goal.id,
      data: { status: newStatus }
    });
  };

  const getProgressPercentage = (goal) => {
    return Math.min((goal.current_amount / goal.target_amount) * 100, 100);
  };

  const getTimeRemaining = (deadline) => {
    const days = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
    if (days < 0) return 'Overdue';
    if (days < 30) return `${days} days`;
    const months = Math.floor(days / 30);
    return `${months} ${months === 1 ? 'month' : 'months'}`;
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Financial Goals</h1>
            <p className="text-gray-500 mt-1">Track and achieve your financial objectives</p>
          </div>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button className="bg-blue-800 hover:bg-blue-900">
                <Plus className="w-4 h-4 mr-2" />
                Add Goal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Financial Goal</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Entity</Label>
                  <Select value={formData.entity_id} onValueChange={(v) => setFormData({...formData, entity_id: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select entity" />
                    </SelectTrigger>
                    <SelectContent>
                      {entities.map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Goal Name *</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                </div>
                <div>
                  <Label>Goal Type</Label>
                  <Select value={formData.goal_type} onValueChange={(v) => setFormData({...formData, goal_type: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="savings">Savings</SelectItem>
                      <SelectItem value="debt_payoff">Debt Payoff</SelectItem>
                      <SelectItem value="investment">Investment</SelectItem>
                      <SelectItem value="retirement">Retirement</SelectItem>
                      <SelectItem value="emergency_fund">Emergency Fund</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Target Amount *</Label>
                    <Input type="number" step="0.01" value={formData.target_amount} onChange={(e) => setFormData({...formData, target_amount: e.target.value})} required />
                  </div>
                  <div>
                    <Label>Current Amount</Label>
                    <Input type="number" step="0.01" value={formData.current_amount} onChange={(e) => setFormData({...formData, current_amount: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Deadline *</Label>
                    <Input type="date" value={formData.deadline} onChange={(e) => setFormData({...formData, deadline: e.target.value})} required />
                  </div>
                  <div>
                    <Label>Monthly Contribution</Label>
                    <Input type="number" step="0.01" value={formData.monthly_contribution} onChange={(e) => setFormData({...formData, monthly_contribution: e.target.value})} />
                  </div>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={formData.priority} onValueChange={(v) => setFormData({...formData, priority: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} />
                </div>
                <Button type="submit" className="w-full">Create Goal</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Goals</p>
                  <p className="text-2xl font-bold">{activeGoals.length}</p>
                </div>
                <Target className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Target</p>
                  <p className="text-2xl font-bold">
                    ${activeGoals.reduce((sum, g) => sum + g.target_amount, 0).toLocaleString()}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold">{completedGoals.length}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {activeGoals.map(goal => {
            const progress = getProgressPercentage(goal);
            const timeLeft = getTimeRemaining(goal.deadline);
            const amountRemaining = goal.target_amount - goal.current_amount;
            
            return (
              <Card key={goal.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {goal.name}
                        <Badge className={getPriorityColor(goal.priority)}>
                          {goal.priority}
                        </Badge>
                      </CardTitle>
                      <p className="text-sm text-gray-600 capitalize mt-1">{goal.goal_type.replace('_', ' ')}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleGoalStatus(goal)}
                    >
                      {goal.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium">Progress: {progress.toFixed(1)}%</span>
                      <span className="text-gray-600">
                        ${goal.current_amount.toLocaleString()} / ${goal.target_amount.toLocaleString()}
                      </span>
                    </div>
                    <Progress value={progress} className="h-3" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-gray-600">Time Left</p>
                        <p className="font-semibold">{timeLeft}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-gray-600">Remaining</p>
                        <p className="font-semibold">${amountRemaining.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  {goal.monthly_contribution > 0 && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-600">Monthly Contribution</p>
                      <p className="text-lg font-semibold text-blue-800">${goal.monthly_contribution.toFixed(2)}</p>
                    </div>
                  )}

                  <Button
                    onClick={() => getRecommendations(goal.id)}
                    disabled={loadingRecommendations === goal.id}
                    variant="outline"
                    className="w-full"
                  >
                    {loadingRecommendations === goal.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Get AI Recommendations
                      </>
                    )}
                  </Button>

                  {goal.ai_recommendations?.length > 0 && (
                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <p className="text-sm font-semibold text-purple-900 mb-2">AI Recommendations:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-purple-800">
                        {goal.ai_recommendations.slice(0, 3).map((rec, idx) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                      {goal.ai_recommendations.length > 3 && (
                        <button
                          onClick={() => setSelectedGoal(goal)}
                          className="text-sm text-purple-600 hover:text-purple-800 mt-2 font-medium"
                        >
                          View all {goal.ai_recommendations.length} recommendations →
                        </button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {activeGoals.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center">
              <Target className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 text-lg">No active goals yet</p>
              <p className="text-gray-400 text-sm">Create your first financial goal to start tracking progress</p>
            </CardContent>
          </Card>
        )}

        {selectedGoal && (
          <Dialog open={!!selectedGoal} onOpenChange={() => setSelectedGoal(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{selectedGoal.name} - All Recommendations</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                {selectedGoal.ai_recommendations.map((rec, idx) => (
                  <div key={idx} className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                    <p className="text-sm text-purple-900">{idx + 1}. {rec}</p>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}