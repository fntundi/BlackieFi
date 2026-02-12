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
import { Plus, CreditCard, TrendingDown } from 'lucide-react';

export default function Debts() {
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'loan',
    original_amount: '',
    current_balance: '',
    interest_rate: '',
    minimum_payment: '',
    payment_frequency: 'monthly',
    next_payment_date: new Date().toISOString().split('T')[0],
    entity_id: '',
    account_id: '',
  });

  const queryClient = useQueryClient();

  const { data: debts = [] } = useQuery({
    queryKey: ['debts'],
    queryFn: () => base44.entities.Debt.filter({ is_active: true }),
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
    mutationFn: (data) => base44.entities.Debt.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['debts']);
      setShowDialog(false);
      setFormData({
        name: '',
        type: 'loan',
        original_amount: '',
        current_balance: '',
        interest_rate: '',
        minimum_payment: '',
        payment_frequency: 'monthly',
        next_payment_date: new Date().toISOString().split('T')[0],
        entity_id: '',
        account_id: '',
      });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      original_amount: parseFloat(formData.original_amount),
      current_balance: parseFloat(formData.current_balance),
      interest_rate: parseFloat(formData.interest_rate),
      minimum_payment: parseFloat(formData.minimum_payment),
      is_active: true,
    });
  };

  const totalDebt = debts.reduce((sum, d) => sum + (d.current_balance || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Debts</h1>
            <p className="text-gray-500 mt-1">Track loans, credit cards, and other debts</p>
          </div>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Debt
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Debt</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Debt Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Car Loan, Credit Card"
                    required
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="loan">Loan</SelectItem>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                      <SelectItem value="line_of_credit">Line of Credit</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
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
                  <Label>Original Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.original_amount}
                    onChange={(e) => setFormData({ ...formData, original_amount: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Current Balance</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.current_balance}
                    onChange={(e) => setFormData({ ...formData, current_balance: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Interest Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.interest_rate}
                    onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Minimum Payment</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.minimum_payment}
                    onChange={(e) => setFormData({ ...formData, minimum_payment: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Payment Frequency</Label>
                  <Select value={formData.payment_frequency} onValueChange={(value) => setFormData({ ...formData, payment_frequency: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Next Payment Date</Label>
                  <Input
                    type="date"
                    value={formData.next_payment_date}
                    onChange={(e) => setFormData({ ...formData, next_payment_date: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full">Add Debt</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Total Debt</span>
              <span className="text-2xl font-bold text-red-600">${totalDebt.toFixed(2)}</span>
            </CardTitle>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {debts.map(debt => {
            const progress = debt.original_amount ? ((debt.original_amount - debt.current_balance) / debt.original_amount) * 100 : 0;
            return (
              <Card key={debt.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-6 h-6 text-orange-600" />
                      <div>
                        <CardTitle className="text-lg">{debt.name}</CardTitle>
                        <p className="text-sm text-gray-500 capitalize">{debt.type?.replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Current Balance</span>
                      <span className="font-semibold text-red-600">${debt.current_balance?.toFixed(2)}</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{progress.toFixed(0)}% paid off</span>
                      <span>Original: ${debt.original_amount?.toFixed(2)}</span>
                    </div>
                  </div>
                  {debt.interest_rate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Interest Rate</span>
                      <span className="font-medium">{debt.interest_rate}%</span>
                    </div>
                  )}
                  {debt.minimum_payment && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Min. Payment</span>
                      <span className="font-medium">${debt.minimum_payment?.toFixed(2)}</span>
                    </div>
                  )}
                  {debt.next_payment_date && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Next Payment</span>
                      <span className="font-medium">{debt.next_payment_date}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {debts.length === 0 && (
            <Card className="md:col-span-2">
              <CardContent className="py-12">
                <p className="text-center text-gray-500">No debts tracked yet. Add your first debt to start monitoring your progress.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}