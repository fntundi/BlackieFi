import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Upload, Sparkles, Tag } from 'lucide-react';
import { toast } from 'sonner';
import TransactionRow from '../components/TransactionRow';
import TransactionFilters from '../components/TransactionFilters';

export default function Transactions() {
  const [user, setUser] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    entity: 'all',
    type: 'all',
    minAmount: '',
    maxAmount: '',
    startDate: '',
    endDate: '',
    linkedAsset: 'all',
    linkedInventory: 'all',
    selectedTags: []
  });
  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    entity_id: '',
    account_id: '',
    category_id: '',
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-date', 100),
  });

  const { data: entities = [] } = useQuery({
    queryKey: ['entities'],
    queryFn: () => base44.entities.Entity.list(),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => base44.entities.Account.filter({ is_active: true }),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list(),
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: () => base44.entities.Asset.filter({ is_active: true }),
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => base44.entities.Inventory.filter({ is_active: true }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Transaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['transactions']);
      setShowDialog(false);
      setFormData({
        type: 'expense',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        entity_id: '',
        account_id: '',
        category_id: '',
      });
      toast.success('Transaction added');
    },
  });

  const categorizeBatch = async () => {
    const uncategorized = transactions.filter(t => !t.category_id);
    if (uncategorized.length === 0) {
      toast.info('All transactions are already categorized');
      return;
    }

    toast.info(`Categorizing ${uncategorized.length} transactions...`);
    let successCount = 0;

    for (const transaction of uncategorized.slice(0, 10)) {
      try {
        const response = await base44.functions.invoke('categorizeTransaction', {
          transaction_id: transaction.id,
          entity_id: transaction.entity_id
        });

        if (response.data.success && response.data.suggestion.confidence !== 'low') {
          await base44.entities.Transaction.update(transaction.id, {
            category_id: response.data.suggestion.category_id
          });
          successCount++;
        }
      } catch (error) {
        console.error('Failed to categorize:', error);
      }
    }

    queryClient.invalidateQueries(['transactions']);
    toast.success(`Auto-categorized ${successCount} transactions`);
  };

  const generateTagsBatch = async () => {
    const untagged = transactions.filter(t => !t.ai_tags || t.ai_tags.length === 0);
    if (untagged.length === 0) {
      toast.info('All transactions already have AI tags');
      return;
    }

    toast.info(`Generating tags for ${Math.min(untagged.length, 10)} transactions...`);
    let successCount = 0;

    for (const transaction of untagged.slice(0, 10)) {
      try {
        await base44.functions.invoke('generateTransactionTags', {
          transaction_id: transaction.id
        });
        successCount++;
      } catch (error) {
        console.error('Failed to generate tags:', error);
      }
    }

    queryClient.invalidateQueries(['transactions']);
    toast.success(`Generated tags for ${successCount} transactions`);
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (filters.search && !t.description?.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      if (filters.category !== 'all' && t.category_id !== filters.category) {
        return false;
      }
      if (filters.entity !== 'all' && t.entity_id !== filters.entity) {
        return false;
      }
      if (filters.type !== 'all' && t.type !== filters.type) {
        return false;
      }
      if (filters.minAmount && t.amount < parseFloat(filters.minAmount)) {
        return false;
      }
      if (filters.maxAmount && t.amount > parseFloat(filters.maxAmount)) {
        return false;
      }
      if (filters.startDate && t.date < filters.startDate) {
        return false;
      }
      if (filters.endDate && t.date > filters.endDate) {
        return false;
      }
      if (filters.linkedAsset !== 'all' && t.linked_asset_id !== filters.linkedAsset) {
        return false;
      }
      if (filters.linkedInventory !== 'all' && t.linked_inventory_id !== filters.linkedInventory) {
        return false;
      }
      if (filters.selectedTags.length > 0) {
        const hasAllTags = filters.selectedTags.every(tag => t.ai_tags?.includes(tag));
        if (!hasAllTags) return false;
      }
      return true;
    });
  }, [transactions, filters]);

  const allTags = useMemo(() => {
    const tagSet = new Set();
    transactions.forEach(t => {
      (t.ai_tags || []).forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [transactions]);

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      amount: parseFloat(formData.amount),
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
            <p className="text-gray-500 mt-1">Track all your financial transactions</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={categorizeBatch}
              className="border-amber-600 text-amber-700 hover:bg-amber-50"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Auto-Categorize
            </Button>
            <Button 
              variant="outline" 
              onClick={generateTagsBatch}
              className="border-blue-600 text-blue-700 hover:bg-blue-50"
            >
              <Tag className="w-4 h-4 mr-2" />
              Generate Tags
            </Button>
            <Button variant="outline" onClick={() => setShowImportDialog(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <DialogTrigger asChild>
                <Button className="bg-blue-800 hover:bg-blue-900 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Transaction
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Transaction</DialogTitle>
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
                        <SelectItem value="transfer">Transfer</SelectItem>
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
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="What was this for?"
                      required
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.filter(c => !c.parent_category).map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full">Add Transaction</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <TransactionFilters
          filters={filters}
          setFilters={setFilters}
          categories={categories}
          entities={entities}
          assets={assets}
          inventory={inventory}
          allTags={allTags}
        />

        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-600">
            Showing <span className="font-semibold">{filteredTransactions.length}</span> of{' '}
            <span className="font-semibold">{transactions.length}</span> transactions
          </p>
        </div>

        <div className="space-y-3">
          {filteredTransactions.map(transaction => (
            <TransactionRow
              key={transaction.id}
              transaction={transaction}
              categories={categories}
              onUpdate={() => queryClient.invalidateQueries(['transactions'])}
            />
          ))}
          {filteredTransactions.length === 0 && transactions.length > 0 && (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-gray-500">No transactions match your filters.</p>
              </CardContent>
            </Card>
          )}
          {transactions.length === 0 && (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-gray-500">No transactions yet. Add your first transaction to get started.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}