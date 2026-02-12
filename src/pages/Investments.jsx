import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TrendingUp, Plus, Briefcase } from 'lucide-react';

export default function Investments() {
  const [showVehicleDialog, setShowVehicleDialog] = useState(false);
  const [showHoldingDialog, setShowHoldingDialog] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({
    name: '',
    type: '401k',
    provider: '',
    entity_id: '',
  });
  const [holdingForm, setHoldingForm] = useState({
    vehicle_id: '',
    asset_name: '',
    quantity: '',
    cost_basis: '',
    current_price: '',
  });

  const queryClient = useQueryClient();

  const { data: vehicles = [] } = useQuery({
    queryKey: ['investment-vehicles'],
    queryFn: () => base44.entities.InvestmentVehicle.filter({ is_active: true }),
  });

  const { data: holdings = [] } = useQuery({
    queryKey: ['investment-holdings'],
    queryFn: () => base44.entities.InvestmentHolding.list(),
  });

  const { data: entities = [] } = useQuery({
    queryKey: ['entities'],
    queryFn: () => base44.entities.Entity.list(),
  });

  const createVehicleMutation = useMutation({
    mutationFn: (data) => base44.entities.InvestmentVehicle.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['investment-vehicles']);
      setShowVehicleDialog(false);
      setVehicleForm({ name: '', type: '401k', provider: '', entity_id: '' });
    },
  });

  const createHoldingMutation = useMutation({
    mutationFn: (data) => base44.entities.InvestmentHolding.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['investment-holdings']);
      setShowHoldingDialog(false);
      setHoldingForm({ vehicle_id: '', asset_name: '', quantity: '', cost_basis: '', current_price: '' });
    },
  });

  const handleVehicleSubmit = (e) => {
    e.preventDefault();
    createVehicleMutation.mutate({ ...vehicleForm, is_active: true });
  };

  const handleHoldingSubmit = (e) => {
    e.preventDefault();
    createHoldingMutation.mutate({
      ...holdingForm,
      quantity: parseFloat(holdingForm.quantity),
      cost_basis: parseFloat(holdingForm.cost_basis),
      current_price: parseFloat(holdingForm.current_price),
      last_updated: new Date().toISOString().split('T')[0],
    });
  };

  const getTotalValue = () => {
    return holdings.reduce((sum, h) => sum + ((h.quantity || 0) * (h.current_price || 0)), 0);
  };

  const getTotalCostBasis = () => {
    return holdings.reduce((sum, h) => sum + (h.cost_basis || 0), 0);
  };

  const getGainLoss = () => {
    return getTotalValue() - getTotalCostBasis();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Investments</h1>
            <p className="text-gray-500 mt-1">Track your investment portfolio</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={showVehicleDialog} onOpenChange={setShowVehicleDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Vehicle
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Investment Vehicle</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleVehicleSubmit} className="space-y-4">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={vehicleForm.name}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, name: e.target.value })}
                      placeholder="e.g., My 401(k)"
                      required
                    />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select value={vehicleForm.type} onValueChange={(value) => setVehicleForm({ ...vehicleForm, type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="401k">401(k)</SelectItem>
                        <SelectItem value="ira">IRA</SelectItem>
                        <SelectItem value="roth_ira">Roth IRA</SelectItem>
                        <SelectItem value="brokerage">Brokerage</SelectItem>
                        <SelectItem value="crypto">Crypto</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Provider</Label>
                    <Input
                      value={vehicleForm.provider}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, provider: e.target.value })}
                      placeholder="e.g., Fidelity, Vanguard"
                    />
                  </div>
                  <div>
                    <Label>Entity</Label>
                    <Select value={vehicleForm.entity_id} onValueChange={(value) => setVehicleForm({ ...vehicleForm, entity_id: value })}>
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
                  <Button type="submit" className="w-full">Add Vehicle</Button>
                </form>
              </DialogContent>
            </Dialog>
            <Dialog open={showHoldingDialog} onOpenChange={setShowHoldingDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Holding
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Investment Holding</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleHoldingSubmit} className="space-y-4">
                  <div>
                    <Label>Vehicle</Label>
                    <Select value={holdingForm.vehicle_id} onValueChange={(value) => setHoldingForm({ ...holdingForm, vehicle_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select vehicle" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicles.map(v => (
                          <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Asset Name/Symbol</Label>
                    <Input
                      value={holdingForm.asset_name}
                      onChange={(e) => setHoldingForm({ ...holdingForm, asset_name: e.target.value })}
                      placeholder="e.g., AAPL, Bitcoin"
                      required
                    />
                  </div>
                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={holdingForm.quantity}
                      onChange={(e) => setHoldingForm({ ...holdingForm, quantity: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Cost Basis (Total)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={holdingForm.cost_basis}
                      onChange={(e) => setHoldingForm({ ...holdingForm, cost_basis: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Current Price (Per Unit)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={holdingForm.current_price}
                      onChange={(e) => setHoldingForm({ ...holdingForm, current_price: e.target.value })}
                    />
                  </div>
                  <Button type="submit" className="w-full">Add Holding</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">${getTotalValue().toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Cost Basis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">${getTotalCostBasis().toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Gain/Loss</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getGainLoss() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {getGainLoss() >= 0 ? '+' : ''}${getGainLoss().toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        {vehicles.map(vehicle => {
          const vehicleHoldings = holdings.filter(h => h.vehicle_id === vehicle.id);
          const vehicleValue = vehicleHoldings.reduce((sum, h) => sum + ((h.quantity || 0) * (h.current_price || 0)), 0);
          
          return (
            <Card key={vehicle.id}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Briefcase className="w-6 h-6 text-blue-600" />
                  <div className="flex-1">
                    <CardTitle>{vehicle.name}</CardTitle>
                    <p className="text-sm text-gray-500 capitalize">{vehicle.type?.replace(/_/g, ' ')} {vehicle.provider && `• ${vehicle.provider}`}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">${vehicleValue.toFixed(2)}</p>
                    <p className="text-sm text-gray-500">Total Value</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {vehicleHoldings.map(holding => {
                    const currentValue = (holding.quantity || 0) * (holding.current_price || 0);
                    const gainLoss = currentValue - (holding.cost_basis || 0);
                    
                    return (
                      <div key={holding.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{holding.asset_name}</p>
                          <p className="text-sm text-gray-500">{holding.quantity} shares @ ${holding.current_price?.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">${currentValue.toFixed(2)}</p>
                          <p className={`text-sm ${gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {gainLoss >= 0 ? '+' : ''}${gainLoss.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {vehicleHoldings.length === 0 && (
                    <p className="text-center text-gray-500 py-4">No holdings in this vehicle yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {vehicles.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-gray-500">No investment vehicles yet. Add your first vehicle to start tracking investments.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}