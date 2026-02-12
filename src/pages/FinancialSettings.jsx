import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Target, Save, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function FinancialSettings() {
  const [user, setUser] = useState(null);
  const [selectedEntity, setSelectedEntity] = useState('');
  const [formData, setFormData] = useState({
    risk_tolerance: 'moderate',
    investment_experience: 'beginner',
    age: '',
    annual_income: '',
    time_horizon: 10,
    liquidity_needs: 'medium',
    financial_goals: []
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: entities = [] } = useQuery({
    queryKey: ['entities'],
    queryFn: () => base44.entities.Entity.list(),
  });

  useEffect(() => {
    if (entities.length > 0 && !selectedEntity) {
      setSelectedEntity(entities[0].id);
    }
  }, [entities]);

  const { data: profiles = [] } = useQuery({
    queryKey: ['financial-profiles', selectedEntity],
    queryFn: async () => {
      if (!selectedEntity) return [];
      return await base44.entities.FinancialProfile.filter({ entity_id: selectedEntity });
    },
    enabled: !!selectedEntity,
  });

  useEffect(() => {
    if (profiles.length > 0) {
      const profile = profiles[0];
      setFormData({
        risk_tolerance: profile.risk_tolerance || 'moderate',
        investment_experience: profile.investment_experience || 'beginner',
        age: profile.age || '',
        annual_income: profile.annual_income || '',
        time_horizon: profile.time_horizon || 10,
        liquidity_needs: profile.liquidity_needs || 'medium',
        financial_goals: profile.financial_goals || []
      });
    }
  }, [profiles]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (profiles.length > 0) {
        return await base44.entities.FinancialProfile.update(profiles[0].id, data);
      } else {
        return await base44.entities.FinancialProfile.create({ ...data, entity_id: selectedEntity });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-profiles'] });
      toast.success('Profile saved');
    },
  });

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const addGoal = () => {
    setFormData({
      ...formData,
      financial_goals: [...formData.financial_goals, { goal: '', target_amount: '', timeline_years: '' }]
    });
  };

  const updateGoal = (index, field, value) => {
    const newGoals = [...formData.financial_goals];
    newGoals[index][field] = value;
    setFormData({ ...formData, financial_goals: newGoals });
  };

  const removeGoal = (index) => {
    const newGoals = formData.financial_goals.filter((_, i) => i !== index);
    setFormData({ ...formData, financial_goals: newGoals });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">Only administrators can access application settings.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Financial Settings</h1>
            <p className="text-gray-500 mt-1">Configure your investment profile and goals</p>
          </div>
          <Select value={selectedEntity} onValueChange={setSelectedEntity}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select entity" />
            </SelectTrigger>
            <SelectContent>
              {entities.map(entity => (
                <SelectItem key={entity.id} value={entity.id}>
                  {entity.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Investment Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Risk Tolerance</Label>
                <Select value={formData.risk_tolerance} onValueChange={(v) => setFormData({...formData, risk_tolerance: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conservative">Conservative</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="aggressive">Aggressive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Investment Experience</Label>
                <Select value={formData.investment_experience} onValueChange={(v) => setFormData({...formData, investment_experience: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Age</Label>
                <Input
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({...formData, age: parseInt(e.target.value) || ''})}
                  placeholder="Your age"
                />
              </div>

              <div>
                <Label>Annual Income</Label>
                <Input
                  type="number"
                  value={formData.annual_income}
                  onChange={(e) => setFormData({...formData, annual_income: parseFloat(e.target.value) || ''})}
                  placeholder="$"
                />
              </div>

              <div>
                <Label>Time Horizon (years)</Label>
                <Input
                  type="number"
                  value={formData.time_horizon}
                  onChange={(e) => setFormData({...formData, time_horizon: parseInt(e.target.value) || 10})}
                />
              </div>

              <div>
                <Label>Liquidity Needs</Label>
                <Select value={formData.liquidity_needs} onValueChange={(v) => setFormData({...formData, liquidity_needs: v})}>
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
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                Financial Goals
              </CardTitle>
              <Button size="sm" onClick={addGoal}>
                <Plus className="w-4 h-4 mr-2" />
                Add Goal
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.financial_goals.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No goals set. Click "Add Goal" to create one.</p>
            ) : (
              formData.financial_goals.map((goal, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 grid md:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">Goal Description</Label>
                        <Input
                          value={goal.goal}
                          onChange={(e) => updateGoal(index, 'goal', e.target.value)}
                          placeholder="e.g., Retirement, House down payment"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Target Amount</Label>
                        <Input
                          type="number"
                          value={goal.target_amount}
                          onChange={(e) => updateGoal(index, 'target_amount', parseFloat(e.target.value) || '')}
                          placeholder="$"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Timeline (years)</Label>
                        <Input
                          type="number"
                          value={goal.timeline_years}
                          onChange={(e) => updateGoal(index, 'timeline_years', parseInt(e.target.value) || '')}
                          placeholder="Years"
                        />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeGoal(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-blue-800 hover:bg-blue-900">
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </div>
    </div>
  );
}