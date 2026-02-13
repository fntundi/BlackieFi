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
import { 
  Plus, 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign,
  Search,
  ArrowUpDown,
  Edit
} from 'lucide-react';
import { toast } from 'sonner';

export default function Inventory() {
  const [showDialog, setShowDialog] = useState(false);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    entity_id: '',
    sku: '',
    name: '',
    description: '',
    category: '',
    quantity_on_hand: 0,
    unit_cost: '',
    unit_price: '',
    reorder_level: '',
    reorder_quantity: '',
    supplier: '',
    location: '',
    is_active: true
  });

  const [transactionData, setTransactionData] = useState({
    type: 'purchase',
    quantity: '',
    unit_cost: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    reference_number: ''
  });

  const queryClient = useQueryClient();

  const { data: entities = [] } = useQuery({
    queryKey: ['entities'],
    queryFn: () => base44.entities.Entity.list(),
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => base44.entities.Inventory.filter({ is_active: true }),
  });

  const { data: inventoryTransactions = [] } = useQuery({
    queryKey: ['inventory-transactions'],
    queryFn: () => base44.entities.InventoryTransaction.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Inventory.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['inventory']);
      setShowDialog(false);
      resetForm();
      toast.success('Inventory item added');
    },
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.InventoryTransaction.create(data);
      
      const currentItem = inventory.find(i => i.id === selectedItem.id);
      const newQuantity = data.type === 'purchase' || data.type === 'adjustment' 
        ? currentItem.quantity_on_hand + parseFloat(data.quantity)
        : currentItem.quantity_on_hand - parseFloat(data.quantity);
      
      await base44.entities.Inventory.update(selectedItem.id, {
        quantity_on_hand: newQuantity,
        last_restocked: data.type === 'purchase' ? data.date : currentItem.last_restocked
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['inventory']);
      queryClient.invalidateQueries(['inventory-transactions']);
      setShowTransactionDialog(false);
      setTransactionData({
        type: 'purchase',
        quantity: '',
        unit_cost: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
        reference_number: ''
      });
      toast.success('Inventory updated');
    },
  });

  const resetForm = () => {
    setFormData({
      entity_id: '',
      sku: '',
      name: '',
      description: '',
      category: '',
      quantity_on_hand: 0,
      unit_cost: '',
      unit_price: '',
      reorder_level: '',
      reorder_quantity: '',
      supplier: '',
      location: '',
      is_active: true
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      quantity_on_hand: parseFloat(formData.quantity_on_hand) || 0,
      unit_cost: parseFloat(formData.unit_cost) || 0,
      unit_price: parseFloat(formData.unit_price) || 0,
      reorder_level: parseFloat(formData.reorder_level) || 0,
      reorder_quantity: parseFloat(formData.reorder_quantity) || 0,
    });
  };

  const handleTransactionSubmit = (e) => {
    e.preventDefault();
    createTransactionMutation.mutate({
      entity_id: selectedItem.entity_id,
      inventory_id: selectedItem.id,
      ...transactionData,
      quantity: parseFloat(transactionData.quantity),
      unit_cost: parseFloat(transactionData.unit_cost) || 0
    });
  };

  const filteredInventory = inventory.filter(item => 
    item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockItems = inventory.filter(item => 
    item.reorder_level && item.quantity_on_hand <= item.reorder_level
  );

  const totalValue = inventory.reduce((sum, item) => 
    sum + (item.quantity_on_hand * (item.unit_cost || 0)), 0
  );

  const totalItems = inventory.reduce((sum, item) => sum + item.quantity_on_hand, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
            <p className="text-gray-500 mt-1">Track stock levels and manage inventory</p>
          </div>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Inventory Item</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
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
                    <Label>SKU</Label>
                    <Input value={formData.sku} onChange={(e) => setFormData({...formData, sku: e.target.value})} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Product Name *</Label>
                    <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Description</Label>
                    <Input value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Input value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} />
                  </div>
                  <div>
                    <Label>Quantity</Label>
                    <Input type="number" value={formData.quantity_on_hand} onChange={(e) => setFormData({...formData, quantity_on_hand: e.target.value})} />
                  </div>
                  <div>
                    <Label>Unit Cost</Label>
                    <Input type="number" step="0.01" value={formData.unit_cost} onChange={(e) => setFormData({...formData, unit_cost: e.target.value})} />
                  </div>
                  <div>
                    <Label>Unit Price</Label>
                    <Input type="number" step="0.01" value={formData.unit_price} onChange={(e) => setFormData({...formData, unit_price: e.target.value})} />
                  </div>
                  <div>
                    <Label>Reorder Level</Label>
                    <Input type="number" value={formData.reorder_level} onChange={(e) => setFormData({...formData, reorder_level: e.target.value})} />
                  </div>
                  <div>
                    <Label>Reorder Quantity</Label>
                    <Input type="number" value={formData.reorder_quantity} onChange={(e) => setFormData({...formData, reorder_quantity: e.target.value})} />
                  </div>
                  <div>
                    <Label>Supplier</Label>
                    <Input value={formData.supplier} onChange={(e) => setFormData({...formData, supplier: e.target.value})} />
                  </div>
                  <div>
                    <Label>Location</Label>
                    <Input value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} />
                  </div>
                </div>
                <Button type="submit" className="w-full">Add Item</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Items</p>
                  <p className="text-2xl font-bold">{totalItems.toFixed(0)}</p>
                </div>
                <Package className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold">${totalValue.toFixed(2)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Products</p>
                  <p className="text-2xl font-bold">{inventory.length}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Low Stock</p>
                  <p className="text-2xl font-bold text-red-600">{lowStockItems.length}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {lowStockItems.length > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Low Stock Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lowStockItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between bg-white p-3 rounded-lg">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-600">Current: {item.quantity_on_hand} | Reorder at: {item.reorder_level}</p>
                    </div>
                    <Badge variant="destructive">Low Stock</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search by name, SKU, or category..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredInventory.map(item => (
                <div key={item.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{item.name}</h3>
                        {item.sku && <Badge variant="outline">{item.sku}</Badge>}
                        {item.category && <Badge>{item.category}</Badge>}
                      </div>
                      {item.description && (
                        <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                      )}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Quantity</p>
                          <p className="font-semibold">{item.quantity_on_hand}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Unit Cost</p>
                          <p className="font-semibold">${item.unit_cost?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Unit Price</p>
                          <p className="font-semibold">${item.unit_price?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Total Value</p>
                          <p className="font-semibold">${((item.quantity_on_hand || 0) * (item.unit_cost || 0)).toFixed(2)}</p>
                        </div>
                      </div>
                      {item.supplier && (
                        <p className="text-sm text-gray-600 mt-2">Supplier: {item.supplier}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedItem(item);
                        setShowTransactionDialog(true);
                      }}
                    >
                      <ArrowUpDown className="w-4 h-4 mr-2" />
                      Adjust
                    </Button>
                  </div>
                </div>
              ))}
              {filteredInventory.length === 0 && (
                <p className="text-center text-gray-500 py-8">No inventory items found</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adjust Inventory: {selectedItem?.name}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleTransactionSubmit} className="space-y-4">
              <div>
                <Label>Transaction Type</Label>
                <Select value={transactionData.type} onValueChange={(v) => setTransactionData({...transactionData, type: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purchase">Purchase (Add Stock)</SelectItem>
                    <SelectItem value="sale">Sale (Remove Stock)</SelectItem>
                    <SelectItem value="adjustment">Adjustment</SelectItem>
                    <SelectItem value="return">Return</SelectItem>
                    <SelectItem value="waste">Waste/Loss</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  value={transactionData.quantity}
                  onChange={(e) => setTransactionData({...transactionData, quantity: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label>Unit Cost</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={transactionData.unit_cost}
                  onChange={(e) => setTransactionData({...transactionData, unit_cost: e.target.value})}
                />
              </div>
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={transactionData.date}
                  onChange={(e) => setTransactionData({...transactionData, date: e.target.value})}
                />
              </div>
              <div>
                <Label>Reference Number</Label>
                <Input
                  value={transactionData.reference_number}
                  onChange={(e) => setTransactionData({...transactionData, reference_number: e.target.value})}
                  placeholder="Invoice/PO number"
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Input
                  value={transactionData.notes}
                  onChange={(e) => setTransactionData({...transactionData, notes: e.target.value})}
                />
              </div>
              <Button type="submit" className="w-full">Update Inventory</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}