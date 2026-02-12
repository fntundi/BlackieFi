import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, DollarSign, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import RecurringTransactionCard from '../components/RecurringTransactionCard';

export default function RecurringTransactions() {
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    type: 'expense',
    name: '',
    amount: '',
    frequency: 'monthly',
    next_date: new Date().toISOString().split('T')[0],
    entity_id: '',
    account_id: '',
    is_variable: false,
  });

  const queryClient = useQueryClient();

  const { data: recurring = [] } = useQuery({
    queryKey: ['recurring'],
    queryFn: () => base44.entities.RecurringTransaction.list('next_date'),
  });

  const { data: entities = [] } = useQuery({
    queryKey: ['entities'],
    queryFn: () => base44.entities.Entity.list(),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => base44.entities.Account.filter({ is_active: true }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.RecurringTransaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['recurring']);
      setShowDialog(false);
      setFormData({
        type: 'expense',
        name: '',
        amount: '',
        frequency: 'monthly',
        next_date: new Date().toISOString().split('T')[0],
        entity_id: '',
        account_id: '',
        is_variable: false,
      });
      toast.success('Recurring transaction added');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RecurringTransaction.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['recurring']);
      toast.success('Recurring transaction deleted');
    },
  });

  const handleProcessNow = async () => {
    try {
      const response = await base44.functions.invoke('processRecurringTransactions', {});
      queryClient.invalidateQueries(['recurring']);
      queryClient.invalidateQueries(['transactions']);
      toast.success(`Processed ${response.data.results.created} recurring transactions`);
    } catch (error) {
      toast.error('Failed to process recurring transactions');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      amount: parseFloat(formData.amount),
      is_active: true,
    });
  };

  const frequencyLabels = {
    weekly: 'Weekly',
    biweekly: 'Bi-weekly',
    semimonthly: 'Semi-monthly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    yearly: 'Yearly',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Recurring Transactions</h1>
            <p className="text-gray-500 mt-1">Manage your recurring income and expenses</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={handleProcessNow}
              className="border-blue-800 text-blue-800 hover:bg-blue-50"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Process Now
            </Button>
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <DialogTrigger asChild>
                <Button className="bg-blue-800 hover:bg-blue-900 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Recurring
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Recurring Transaction</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Type</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Monthly Salary, Netflix"
                    required
                  />
                </div>
                <div>
                  <Label>Entity</Label>
                  <Select value={formData.entity_id} onValueChange={(value) => setFormData({ ...formData, entity_id: value })}>
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
                  <Label>Account</Label>
                  <Select value={formData.account_id} onValueChange={(value) => setFormData({ ...formData, account_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Frequency</Label>
                  <Select value={formData.frequency} onValueChange={(value) => setFormData({ ...formData, frequency: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly</SelectItem>
                      <SelectItem value="semimonthly">Semi-monthly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Next Date</Label>
                  <Input
                    type="date"
                    value={formData.next_date}
                    onChange={(e) => setFormData({ ...formData, next_date: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">Add Recurring Transaction</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {recurring.map(rt => (
            <RecurringTransactionCard
              key={rt.id}
              recurring={rt}
              onDelete={(id) => deleteMutation.mutate(id)}
              onRefresh={() => queryClient.invalidateQueries(['transactions'])}
            />
          ))}
          {recurring.length === 0 && (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-gray-500">No recurring transactions yet. Add your first recurring income or expense to get started.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}