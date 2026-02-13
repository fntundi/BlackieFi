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
  Building2, 
  Car, 
  Laptop, 
  Package, 
  DollarSign,
  TrendingDown,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

const ASSET_ICONS = {
  property: Building2,
  vehicle: Car,
  equipment: Package,
  technology: Laptop,
  furniture: Package,
  intellectual_property: Package,
  other: Package
};

export default function Assets() {
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    entity_id: '',
    name: '',
    type: 'equipment',
    description: '',
    purchase_date: new Date().toISOString().split('T')[0],
    purchase_price: '',
    current_value: '',
    depreciation_method: 'straight_line',
    useful_life_years: '',
    salvage_value: '',
    location: '',
    serial_number: '',
    vendor: '',
    warranty_expiration: '',
    maintenance_schedule: '',
    is_active: true
  });

  const queryClient = useQueryClient();

  const { data: entities = [] } = useQuery({
    queryKey: ['entities'],
    queryFn: () => base44.entities.Entity.list(),
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: () => base44.entities.Asset.filter({ is_active: true }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Asset.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['assets']);
      setShowDialog(false);
      resetForm();
      toast.success('Asset added');
    },
  });

  const resetForm = () => {
    setFormData({
      entity_id: '',
      name: '',
      type: 'equipment',
      description: '',
      purchase_date: new Date().toISOString().split('T')[0],
      purchase_price: '',
      current_value: '',
      depreciation_method: 'straight_line',
      useful_life_years: '',
      salvage_value: '',
      location: '',
      serial_number: '',
      vendor: '',
      warranty_expiration: '',
      maintenance_schedule: '',
      is_active: true
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      purchase_price: parseFloat(formData.purchase_price),
      current_value: formData.current_value ? parseFloat(formData.current_value) : parseFloat(formData.purchase_price),
      useful_life_years: formData.useful_life_years ? parseFloat(formData.useful_life_years) : undefined,
      salvage_value: formData.salvage_value ? parseFloat(formData.salvage_value) : 0,
    });
  };

  const calculateDepreciation = (asset) => {
    if (asset.depreciation_method === 'none' || !asset.useful_life_years) return 0;
    
    const yearsSincePurchase = (new Date() - new Date(asset.purchase_date)) / (1000 * 60 * 60 * 24 * 365);
    
    if (asset.depreciation_method === 'straight_line') {
      const annualDepreciation = (asset.purchase_price - (asset.salvage_value || 0)) / asset.useful_life_years;
      return Math.min(annualDepreciation * yearsSincePurchase, asset.purchase_price - (asset.salvage_value || 0));
    }
    
    return 0;
  };

  const totalValue = assets.reduce((sum, a) => sum + (a.current_value || a.purchase_price), 0);
  const totalDepreciation = assets.reduce((sum, a) => sum + calculateDepreciation(a), 0);

  const assetsByType = assets.reduce((acc, asset) => {
    acc[asset.type] = (acc[asset.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Asset Registry</h1>
            <p className="text-gray-500 mt-1">Track and manage all business assets</p>
          </div>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Asset
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Asset</DialogTitle>
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
                    <Label>Asset Type *</Label>
                    <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="property">Property</SelectItem>
                        <SelectItem value="vehicle">Vehicle</SelectItem>
                        <SelectItem value="equipment">Equipment</SelectItem>
                        <SelectItem value="furniture">Furniture</SelectItem>
                        <SelectItem value="technology">Technology</SelectItem>
                        <SelectItem value="intellectual_property">Intellectual Property</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Asset Name *</Label>
                    <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Description</Label>
                    <Input value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                  </div>
                  <div>
                    <Label>Purchase Date *</Label>
                    <Input type="date" value={formData.purchase_date} onChange={(e) => setFormData({...formData, purchase_date: e.target.value})} required />
                  </div>
                  <div>
                    <Label>Purchase Price *</Label>
                    <Input type="number" step="0.01" value={formData.purchase_price} onChange={(e) => setFormData({...formData, purchase_price: e.target.value})} required />
                  </div>
                  <div>
                    <Label>Current Value</Label>
                    <Input type="number" step="0.01" value={formData.current_value} onChange={(e) => setFormData({...formData, current_value: e.target.value})} placeholder="Leave blank to use purchase price" />
                  </div>
                  <div>
                    <Label>Depreciation Method</Label>
                    <Select value={formData.depreciation_method} onValueChange={(v) => setFormData({...formData, depreciation_method: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="straight_line">Straight Line</SelectItem>
                        <SelectItem value="declining_balance">Declining Balance</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Useful Life (years)</Label>
                    <Input type="number" value={formData.useful_life_years} onChange={(e) => setFormData({...formData, useful_life_years: e.target.value})} />
                  </div>
                  <div>
                    <Label>Salvage Value</Label>
                    <Input type="number" step="0.01" value={formData.salvage_value} onChange={(e) => setFormData({...formData, salvage_value: e.target.value})} />
                  </div>
                  <div>
                    <Label>Location</Label>
                    <Input value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} />
                  </div>
                  <div>
                    <Label>Serial Number</Label>
                    <Input value={formData.serial_number} onChange={(e) => setFormData({...formData, serial_number: e.target.value})} />
                  </div>
                  <div>
                    <Label>Vendor</Label>
                    <Input value={formData.vendor} onChange={(e) => setFormData({...formData, vendor: e.target.value})} />
                  </div>
                  <div>
                    <Label>Warranty Expiration</Label>
                    <Input type="date" value={formData.warranty_expiration} onChange={(e) => setFormData({...formData, warranty_expiration: e.target.value})} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Maintenance Schedule</Label>
                    <Input value={formData.maintenance_schedule} onChange={(e) => setFormData({...formData, maintenance_schedule: e.target.value})} placeholder="e.g., Annual inspection" />
                  </div>
                </div>
                <Button type="submit" className="w-full">Add Asset</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Asset Value</p>
                  <p className="text-2xl font-bold text-green-600">${totalValue.toFixed(2)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Assets</p>
                  <p className="text-2xl font-bold">{assets.length}</p>
                </div>
                <Package className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Depreciation</p>
                  <p className="text-2xl font-bold text-orange-600">${totalDepreciation.toFixed(2)}</p>
                </div>
                <TrendingDown className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {Object.entries(assetsByType).map(([type, count]) => {
            const Icon = ASSET_ICONS[type] || Package;
            const typeAssets = assets.filter(a => a.type === type);
            const typeValue = typeAssets.reduce((sum, a) => sum + (a.current_value || a.purchase_price), 0);
            
            return (
              <Card key={type}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 capitalize">
                    <Icon className="w-5 h-5" />
                    {type.replace(/_/g, ' ')}
                    <Badge className="ml-auto">{count}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Value</span>
                    <span className="font-semibold">${typeValue.toFixed(2)}</span>
                  </div>
                  <div className="space-y-2">
                    {typeAssets.map(asset => {
                      const depreciation = calculateDepreciation(asset);
                      const currentValue = asset.current_value || (asset.purchase_price - depreciation);
                      
                      return (
                        <div key={asset.id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium">{asset.name}</p>
                              {asset.serial_number && (
                                <p className="text-xs text-gray-500">SN: {asset.serial_number}</p>
                              )}
                            </div>
                            <p className="font-semibold text-green-600">${currentValue.toFixed(2)}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                            <div>
                              <p>Purchase: ${asset.purchase_price.toFixed(2)}</p>
                            </div>
                            <div>
                              <p>Age: {Math.floor((new Date() - new Date(asset.purchase_date)) / (1000 * 60 * 60 * 24 * 365))} years</p>
                            </div>
                          </div>
                          {asset.location && (
                            <p className="text-xs text-gray-500 mt-1">📍 {asset.location}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {assets.length === 0 && (
            <Card className="md:col-span-2">
              <CardContent className="py-12">
                <p className="text-center text-gray-500">No assets recorded yet. Add your first asset to start tracking.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}