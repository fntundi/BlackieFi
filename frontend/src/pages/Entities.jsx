import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Plus, Building2, X, User, Briefcase } from 'lucide-react';

export default function Entities() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'personal',
  });

  const { data: entities = [], isLoading } = useQuery({
    queryKey: ['entities'],
    queryFn: () => api.getEntities(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.createEntity(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['entities']);
      toast.success('Entity created');
      setShowForm(false);
      setFormData({ name: '', type: 'personal' });
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteEntity(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['entities']);
      toast.success('Entity deleted');
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const personalEntities = entities.filter(e => e.type === 'personal');
  const businessEntities = entities.filter(e => e.type === 'business');

  return (
    <div className="page-container animate-fade-in" data-testid="entities-page">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Entities</h1>
            <p className="text-slate-400 mt-1">Manage your personal and business entities</p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn btn-primary" data-testid="add-entity-btn">
            <Plus className="w-5 h-5" />
            Add Entity
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-cyan-500" />
              Personal Entities
            </h2>
            <div className="space-y-4" data-testid="personal-entities">
              {personalEntities.map((entity) => (
                <div key={entity.id} className="card group" data-testid={`entity-${entity.id}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-cyan-500/10 rounded-lg">
                        <User className="w-6 h-6 text-cyan-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{entity.name}</p>
                        <p className="text-sm text-slate-500">Personal finances</p>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteMutation.mutate(entity.id)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {personalEntities.length === 0 && (
                <p className="text-slate-500 text-center py-4">No personal entities</p>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-emerald-500" />
              Business Entities
            </h2>
            <div className="space-y-4" data-testid="business-entities">
              {businessEntities.map((entity) => (
                <div key={entity.id} className="card group" data-testid={`entity-${entity.id}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-emerald-500/10 rounded-lg">
                        <Briefcase className="w-6 h-6 text-emerald-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{entity.name}</p>
                        <p className="text-sm text-slate-500">Business finances</p>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteMutation.mutate(entity.id)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {businessEntities.length === 0 && (
                <p className="text-slate-500 text-center py-4">No business entities</p>
              )}
            </div>
          </div>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="card w-full max-w-md" data-testid="add-entity-modal">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Add Entity</h2>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Entity Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    placeholder="e.g., Personal Finances"
                    required
                    data-testid="entity-name-input"
                  />
                </div>
                <div>
                  <label className="label">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="input"
                    data-testid="entity-type-select"
                  >
                    <option value="personal">Personal</option>
                    <option value="business">Business</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary flex-1">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary flex-1" data-testid="submit-entity-btn">
                    {createMutation.isPending ? 'Saving...' : 'Create Entity'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
