import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Tag, FolderTree } from 'lucide-react';

export default function Categories() {
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    parent_category: '',
    type: 'expense',
    auto_categorization_rules: '',
  });

  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Category.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['categories']);
      setShowDialog(false);
      setFormData({ name: '', parent_category: '', type: 'expense', auto_categorization_rules: '' });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const rules = formData.auto_categorization_rules
      ? formData.auto_categorization_rules.split(',').map(r => r.trim()).filter(r => r)
      : [];
    
    createMutation.mutate({
      name: formData.name,
      parent_category: formData.parent_category || null,
      type: formData.type,
      auto_categorization_rules: rules,
      is_default: false,
    });
  };

  const mainCategories = categories.filter(c => !c.parent_category);
  const getSubcategories = (parentId) => categories.filter(c => c.parent_category === parentId);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
            <p className="text-gray-500 mt-1">Organize your transactions with categories and subcategories</p>
          </div>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Category</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Category Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Groceries, Entertainment"
                    required
                  />
                </div>
                <div>
                  <Label>Parent Category (Optional)</Label>
                  <Select value={formData.parent_category} onValueChange={(value) => setFormData({ ...formData, parent_category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="None (Main Category)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>None (Main Category)</SelectItem>
                      {mainCategories.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Auto-categorization Keywords (Optional)</Label>
                  <Input
                    value={formData.auto_categorization_rules}
                    onChange={(e) => setFormData({ ...formData, auto_categorization_rules: e.target.value })}
                    placeholder="e.g., walmart, target, costco (comma-separated)"
                  />
                  <p className="text-xs text-gray-500 mt-1">Keywords to automatically categorize imported transactions</p>
                </div>
                <Button type="submit" className="w-full">Add Category</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mainCategories.map(category => {
            const subcategories = getSubcategories(category.id);
            
            return (
              <Card key={category.id}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Tag className="w-5 h-5 text-blue-600" />
                    <div className="flex-1">
                      <CardTitle className="text-lg">{category.name}</CardTitle>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs capitalize">{category.type}</Badge>
                        {category.is_default && <Badge variant="secondary" className="text-xs">Default</Badge>}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {subcategories.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <FolderTree className="w-4 h-4" />
                        <span className="font-medium">Subcategories</span>
                      </div>
                      {subcategories.map(sub => (
                        <div key={sub.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm text-gray-700">{sub.name}</span>
                          {sub.auto_categorization_rules && sub.auto_categorization_rules.length > 0 && (
                            <Badge variant="outline" className="text-xs">Auto</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {subcategories.length === 0 && (
                    <p className="text-sm text-gray-500">No subcategories</p>
                  )}
                  {category.auto_categorization_rules && category.auto_categorization_rules.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-gray-600 mb-1">Keywords:</p>
                      <div className="flex flex-wrap gap-1">
                        {category.auto_categorization_rules.slice(0, 3).map((rule, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">{rule}</Badge>
                        ))}
                        {category.auto_categorization_rules.length > 3 && (
                          <Badge variant="secondary" className="text-xs">+{category.auto_categorization_rules.length - 3}</Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {mainCategories.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-gray-500">No categories yet. Add your first category to organize transactions.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}