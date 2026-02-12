import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Plus, Shield, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

export default function Groups() {
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [showMemberDialog, setShowMemberDialog] = useState(false);
  const [showAccessDialog, setShowAccessDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupForm, setGroupForm] = useState({ name: '', description: '' });
  const [memberForm, setMemberForm] = useState({ user_email: '', role: 'member' });
  const [accessForm, setAccessForm] = useState({ entity_id: '', access_level: 'read' });

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: () => base44.entities.Group.filter({ is_active: true }),
  });

  const { data: entities = [] } = useQuery({
    queryKey: ['entities'],
    queryFn: () => base44.entities.Entity.list(),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['group-members', selectedGroup?.id],
    queryFn: async () => {
      if (!selectedGroup) return [];
      return await base44.entities.GroupMember.filter({ group_id: selectedGroup.id });
    },
    enabled: !!selectedGroup,
  });

  const { data: access = [] } = useQuery({
    queryKey: ['group-access', selectedGroup?.id],
    queryFn: async () => {
      if (!selectedGroup) return [];
      return await base44.entities.GroupEntityAccess.filter({ group_id: selectedGroup.id });
    },
    enabled: !!selectedGroup,
  });

  const createGroupMutation = useMutation({
    mutationFn: (data) => base44.entities.Group.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setShowGroupDialog(false);
      setGroupForm({ name: '', description: '' });
      toast.success('Group created');
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: (data) => base44.entities.GroupMember.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members'] });
      setShowMemberDialog(false);
      setMemberForm({ user_email: '', role: 'member' });
      toast.success('Member added');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (id) => base44.entities.GroupMember.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members'] });
      toast.success('Member removed');
    },
  });

  const addAccessMutation = useMutation({
    mutationFn: (data) => base44.entities.GroupEntityAccess.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-access'] });
      setShowAccessDialog(false);
      setAccessForm({ entity_id: '', access_level: 'read' });
      toast.success('Access granted');
    },
  });

  const removeAccessMutation = useMutation({
    mutationFn: (id) => base44.entities.GroupEntityAccess.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-access'] });
      toast.success('Access removed');
    },
  });

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Admin access required</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Groups & Access Control</h1>
            <p className="text-gray-500 mt-1">Manage user groups and entity access permissions</p>
          </div>
          <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
            <DialogTrigger asChild>
              <Button className="bg-blue-800 hover:bg-blue-900">
                <Plus className="w-4 h-4 mr-2" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Group</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                createGroupMutation.mutate({ ...groupForm, is_active: true });
              }} className="space-y-4">
                <div>
                  <Label>Group Name</Label>
                  <Input
                    value={groupForm.name}
                    onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                    placeholder="e.g., Finance Team"
                    required
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    value={groupForm.description}
                    onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                    placeholder="Optional description"
                  />
                </div>
                <Button type="submit" className="w-full">Create Group</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Groups</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {groups.map(group => (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroup(group)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedGroup?.id === group.id
                      ? 'bg-blue-50 border-blue-300'
                      : 'hover:bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{group.name}</p>
                      {group.description && (
                        <p className="text-xs text-gray-500">{group.description}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
              {groups.length === 0 && (
                <p className="text-center text-gray-500 py-8 text-sm">No groups yet</p>
              )}
            </CardContent>
          </Card>

          {selectedGroup && (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Members</CardTitle>
                    <Dialog open={showMemberDialog} onOpenChange={setShowMemberDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <UserPlus className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Member to {selectedGroup.name}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          addMemberMutation.mutate({ ...memberForm, group_id: selectedGroup.id });
                        }} className="space-y-4">
                          <div>
                            <Label>User Email</Label>
                            <Input
                              type="email"
                              value={memberForm.user_email}
                              onChange={(e) => setMemberForm({ ...memberForm, user_email: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <Label>Role</Label>
                            <Select value={memberForm.role} onValueChange={(v) => setMemberForm({ ...memberForm, role: v })}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="member">Member</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button type="submit" className="w-full">Add Member</Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {members.map(member => (
                    <div key={member.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <p className="text-sm font-medium">{member.user_email}</p>
                        <Badge variant="outline" className="text-xs mt-1">{member.role}</Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeMemberMutation.mutate(member.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  ))}
                  {members.length === 0 && (
                    <p className="text-center text-gray-500 py-4 text-sm">No members</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Entity Access</CardTitle>
                    <Dialog open={showAccessDialog} onOpenChange={setShowAccessDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Grant Entity Access</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          addAccessMutation.mutate({ ...accessForm, group_id: selectedGroup.id });
                        }} className="space-y-4">
                          <div>
                            <Label>Entity</Label>
                            <Select value={accessForm.entity_id} onValueChange={(v) => setAccessForm({ ...accessForm, entity_id: v })}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select entity" />
                              </SelectTrigger>
                              <SelectContent>
                                {entities.map(entity => (
                                  <SelectItem key={entity.id} value={entity.id}>{entity.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Access Level</Label>
                            <Select value={accessForm.access_level} onValueChange={(v) => setAccessForm({ ...accessForm, access_level: v })}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="read">Read</SelectItem>
                                <SelectItem value="write">Write</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button type="submit" className="w-full">Grant Access</Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {access.map(acc => {
                    const entity = entities.find(e => e.id === acc.entity_id);
                    return (
                      <div key={acc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div>
                          <p className="text-sm font-medium">{entity?.name || 'Unknown'}</p>
                          <Badge variant="outline" className="text-xs mt-1 capitalize">{acc.access_level}</Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeAccessMutation.mutate(acc.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    );
                  })}
                  {access.length === 0 && (
                    <p className="text-center text-gray-500 py-4 text-sm">No access granted</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}