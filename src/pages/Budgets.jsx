import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Sparkles, AlertTriangle, CheckCircle, TrendingDown, Loader2, Save, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

export default function BudgetsPage() {
  const [selectedEntity, setSelectedEntity] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [editingBudget, setEditingBudget] = useState(null);
  const [generating, setGenerating] = useState(false);
  const queryClient = useQueryClient();

  const { data: entities = [] } = useQuery({
    queryKey: ['entities'],
    queryFn: () => base44.entities.Entity.list(),
  });

  useEffect(() => {
    if (entities.length > 0 && !selectedEntity) {
      setSelectedEntity(entities[0].id);
    }
  }, [entities]);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', selectedEntity],
    queryFn: async () => {
      if (!selectedEntity) return [];
      return await base44.entities.Category.filter({
        entity_id: [selectedEntity, null],
        type: ['expense', 'both']
      });
    },
    enabled: !!selectedEntity,
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets', selectedEntity, selectedMonth],
    queryFn: async () => {
      if (!selectedEntity) return [];
      return await base44.entities.Budget.filter({ 
        entity_id: selectedEntity,
        month: selectedMonth 
      });
    },
    enabled: !!selectedEntity,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', selectedEntity, selectedMonth],
    queryFn: async () => {
      if (!selectedEntity) return [];
      const allTxns = await base44.entities.Transaction.filter({ 
        entity_id: selectedEntity,
        type: 'expense'
      }, '-date', 200);
      return allTxns.filter(t => t.date?.startsWith(selectedMonth));
    },
    enabled: !!selectedEntity,
  });

  const createMutation = useMutation({
    mutationFn: (budgetData) => base44.entities.Budget.create(budgetData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      setEditingBudget(null);
      toast.success('Budget saved');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Budget.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      setEditingBudget(null);
      toast.success('Budget updated');
    },
  });

  const generateAIBudget = async () => {
    setGenerating(true);
    try {
      const response = await base44.functions.invoke('generateBudget', {
        entity_id: selectedEntity,
        month: selectedMonth
      });

      if (response.data.success) {
        const suggestions = response.data.budget_suggestions;
        
        // Create or update budget
        const existingBudget = budgets.find(b => b.month === selectedMonth);
        const budgetData = {
          entity_id: selectedEntity,
          month: selectedMonth,
          category_budgets: suggestions.category_budgets,
          total_planned: suggestions.total_recommended
        };

        if (existingBudget) {
          await updateMutation.mutateAsync({ id: existingBudget.id, data: budgetData });
        } else {
          await createMutation.mutateAsync(budgetData);
        }

        toast.success(`Budget generated with $${suggestions.savings_opportunity?.toFixed(2)} savings opportunity`);
      }
    } catch (error) {
      toast.error('Failed to generate budget');
    } finally {
      setGenerating(false);
    }
  };

  const currentBudget = budgets.find(b => b.month === selectedMonth);
  const categoryBudgets = currentBudget?.category_budgets || [];

  const getCategorySpending = (categoryId) => {
    return transactions
      .filter(t => t.category_id === categoryId)
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  };

  const budgetCategories = categoryBudgets.map(cb => {
    const category = categories.find(c => c.id === cb.category_id);
    const spent = getCategorySpending(cb.category_id);
    const percentage = cb.planned_amount > 0 ? (spent / cb.planned_amount) * 100 : 0;
    const remaining = cb.planned_amount - spent;

    return {
      ...cb,
      category_name: category?.name || 'Unknown',
      spent,
      percentage,
      remaining,
      status: percentage >= 100 ? 'exceeded' : percentage >= 80 ? 'warning' : 'ok'
    };
  });

  const totalBudgeted = categoryBudgets.reduce((sum, cb) => sum + cb.planned_amount, 0);
  const totalSpent = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalRemaining = totalBudgeted - totalSpent;

  const handleSaveBudget = (categoryId, plannedAmount) => {
    const updatedBudgets = [...categoryBudgets];
    const existingIndex = updatedBudgets.findIndex(cb => cb.category_id === categoryId);
    
    if (existingIndex >= 0) {
      updatedBudgets[existingIndex].planned_amount = parseFloat(plannedAmount);
    } else {
      updatedBudgets.push({ category_id: categoryId, planned_amount: parseFloat(plannedAmount) });
    }

    const newTotal = updatedBudgets.reduce((sum, cb) => sum + cb.planned_amount, 0);
    const budgetData = {
      entity_id: selectedEntity,
      month: selectedMonth,
      category_budgets: updatedBudgets,
      total_planned: newTotal
    };

    if (currentBudget) {
      updateMutation.mutate({ id: currentBudget.id, data: budgetData });
    } else {
      createMutation.mutate(budgetData);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Budgets</h1>
            <p className="text-gray-500 mt-1">Plan and track your spending limits</p>
          </div>
          <div className="flex items-center gap-3">
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
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-48"
            />
            <Button
              onClick={generateAIBudget}
              disabled={generating || !selectedEntity}
              className="bg-gradient-to-r from-amber-500 to-blue-800 text-white"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI Generate
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Budget</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">${totalBudgeted.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Spent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">${totalSpent.toFixed(2)}</div>
              <div className="text-sm text-gray-500 mt-1">
                {totalBudgeted > 0 ? ((totalSpent / totalBudgeted) * 100).toFixed(1) : 0}% of budget
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Remaining</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totalRemaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${totalRemaining.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Budgets */}
        {budgetCategories.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-2">No budget set for this month</p>
              <p className="text-sm text-gray-400">Click "AI Generate" to create a smart budget based on your spending history</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {budgetCategories.map((budget) => (
              <Card key={budget.category_id}>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{budget.category_name}</h3>
                          {budget.status === 'exceeded' && (
                            <Badge className="bg-red-100 text-red-800">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Over Budget
                            </Badge>
                          )}
                          {budget.status === 'warning' && (
                            <Badge className="bg-amber-100 text-amber-800">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              80% Used
                            </Badge>
                          )}
                          {budget.status === 'ok' && (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              On Track
                            </Badge>
                          )}
                          {budget.priority && (
                            <Badge variant="outline" className="text-xs capitalize">
                              {budget.priority}
                            </Badge>
                          )}
                        </div>
                        {budget.reasoning && (
                          <p className="text-sm text-gray-600 mb-3">{budget.reasoning}</p>
                        )}
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-gray-600">
                            <span className="font-semibold text-gray-900">${budget.spent.toFixed(2)}</span> of ${budget.planned_amount.toFixed(2)}
                          </span>
                          <span className={`font-medium ${budget.remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {budget.remaining >= 0 ? `$${budget.remaining.toFixed(2)} left` : `$${Math.abs(budget.remaining).toFixed(2)} over`}
                          </span>
                        </div>
                        <Progress 
                          value={Math.min(budget.percentage, 100)} 
                          className="h-3"
                          indicatorClassName={
                            budget.status === 'exceeded' ? 'bg-red-600' :
                            budget.status === 'warning' ? 'bg-amber-500' :
                            'bg-green-600'
                          }
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          {budget.percentage.toFixed(1)}% used
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newAmount = prompt(`Set budget for ${budget.category_name}:`, budget.planned_amount);
                          if (newAmount && !isNaN(newAmount)) {
                            handleSaveBudget(budget.category_id, newAmount);
                          }
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}