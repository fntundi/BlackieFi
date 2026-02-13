import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Search } from 'lucide-react';

export default function TransactionFilters({ 
  filters, 
  setFilters, 
  categories, 
  entities, 
  assets, 
  inventory,
  allTags 
}) {
  const removeTag = (tag) => {
    setFilters(prev => ({
      ...prev,
      selectedTags: prev.selectedTags.filter(t => t !== tag)
    }));
  };

  const addTag = (tag) => {
    if (!filters.selectedTags.includes(tag)) {
      setFilters(prev => ({
        ...prev,
        selectedTags: [...prev.selectedTags, tag]
      }));
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Search className="w-5 h-5 text-gray-500" />
        <h3 className="font-semibold text-gray-900">Advanced Search & Filters</h3>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <Label>Search Description</Label>
          <Input
            placeholder="Search transactions..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          />
        </div>

        <div>
          <Label>Category</Label>
          <Select 
            value={filters.category} 
            onValueChange={(v) => setFilters(prev => ({ ...prev, category: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Entity</Label>
          <Select 
            value={filters.entity} 
            onValueChange={(v) => setFilters(prev => ({ ...prev, entity: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Entities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              {entities.map(ent => (
                <SelectItem key={ent.id} value={ent.id}>{ent.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Type</Label>
          <Select 
            value={filters.type} 
            onValueChange={(v) => setFilters(prev => ({ ...prev, type: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Amount Range (Min)</Label>
          <Input
            type="number"
            step="0.01"
            placeholder="Min amount"
            value={filters.minAmount}
            onChange={(e) => setFilters(prev => ({ ...prev, minAmount: e.target.value }))}
          />
        </div>

        <div>
          <Label>Amount Range (Max)</Label>
          <Input
            type="number"
            step="0.01"
            placeholder="Max amount"
            value={filters.maxAmount}
            onChange={(e) => setFilters(prev => ({ ...prev, maxAmount: e.target.value }))}
          />
        </div>

        <div>
          <Label>Start Date</Label>
          <Input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
          />
        </div>

        <div>
          <Label>End Date</Label>
          <Input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
          />
        </div>

        <div>
          <Label>Linked Asset</Label>
          <Select 
            value={filters.linkedAsset} 
            onValueChange={(v) => setFilters(prev => ({ ...prev, linkedAsset: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Assets" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assets</SelectItem>
              {assets.map(asset => (
                <SelectItem key={asset.id} value={asset.id}>{asset.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Linked Inventory</Label>
          <Select 
            value={filters.linkedInventory} 
            onValueChange={(v) => setFilters(prev => ({ ...prev, linkedInventory: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Inventory" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Inventory</SelectItem>
              {inventory.map(item => (
                <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {allTags.length > 0 && (
        <div>
          <Label className="mb-2 block">AI Tags</Label>
          <div className="flex flex-wrap gap-2">
            {allTags.map(tag => (
              <Badge
                key={tag}
                variant={filters.selectedTags.includes(tag) ? "default" : "outline"}
                className={`cursor-pointer ${
                  filters.selectedTags.includes(tag) 
                    ? 'bg-blue-800 text-white' 
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => addTag(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {filters.selectedTags.length > 0 && (
        <div>
          <Label className="mb-2 block">Active Tag Filters</Label>
          <div className="flex flex-wrap gap-2">
            {filters.selectedTags.map(tag => (
              <Badge
                key={tag}
                className="bg-blue-800 text-white pr-1"
              >
                {tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="ml-2 hover:bg-blue-900 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}