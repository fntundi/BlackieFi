import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import {
  Users,
  Plus,
  Trash2,
  Edit,
  Shield,
  Building2,
  Mail,
  ChevronDown,
  ChevronUp,
  UserPlus,
  Key
} from 'lucide-react';

export default function Groups() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [newGroup, setNewGroup] = useState({ name: '', description: '' });
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('');

  const isAdmin = user?.role === 'admin';

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => api.getGroups(),
    enabled: isAdmin,
  });

  const { data: entities = [] } = useQuery({
    queryKey: ['entities'],
    queryFn: () => api.getEntities(),
  });

  const createGroupMutation = useMutation({
    mutationFn: (data) => api.createGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['groups']);
      toast.success('Group created');
      setShowCreateModal(false);
      setNewGroup({ name: '', description: '' });
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (id) => api.deleteGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['groups']);
      toast.success('Group deleted');
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: ({ groupId, email }) => api.addGroupMember(groupId, email, 'member'),
    onSuccess: () => {
      queryClient.invalidateQueries(['group-members']);
      toast.success('Member added');
      setNewMemberEmail('');
    },
    onError: (err) => toast.error(err.message),
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({ groupId, memberId }) => api.removeGroupMember(groupId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries(['group-members']);
      toast.success('Member removed');
    },
  });

  const grantAccessMutation = useMutation({
    mutationFn: ({ groupId, entityId, accessLevel }) => api.grantGroupAccess(groupId, entityId, accessLevel),
    onSuccess: () => {
      queryClient.invalidateQueries(['group-access']);
      toast.success('Access granted');
      setSelectedEntity('');
    },
  });

  const revokeAccessMutation = useMutation({
    mutationFn: ({ groupId, accessId }) => api.revokeGroupAccess(groupId, accessId),
    onSuccess: () => {
      queryClient.invalidateQueries(['group-access']);
      toast.success('Access revoked');
    },
  });

  if (!isAdmin) {
    return (
      <div style={{ padding: '2rem', background: '#050505', minHeight: '100%' }} data-testid="groups-page">
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', padding: '4rem' }}>
          <Shield style={{ width: '64px', height: '64px', color: '#DC2626', margin: '0 auto 1.5rem' }} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#F5F5F5', marginBottom: '0.5rem' }}>Access Denied</h1>
          <p style={{ color: '#525252' }}>You need admin privileges to manage groups.</p>
        </div>
      </div>
    );
  }

  const cardStyle = {
    padding: '1.5rem',
    borderRadius: '16px',
    background: '#0A0A0A',
    border: '1px solid rgba(212, 175, 55, 0.1)'
  };

  const inputStyle = {
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    background: '#0F0F0F',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#F5F5F5',
    width: '100%'
  };

  return (
    <div style={{ padding: '2rem', background: '#050505', minHeight: '100%' }} data-testid="groups-page">
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#D4AF37', marginBottom: '0.5rem' }}>Administration</p>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '700', color: '#F5F5F5', margin: 0 }}>Groups</h1>
            <p style={{ marginTop: '0.5rem', color: '#525252' }}>Manage user groups and entity access permissions</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '10px',
              fontWeight: '600',
              background: 'linear-gradient(135deg, #C4A030 0%, #D4AF37 50%, #C4A030 100%)',
              color: '#000',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            data-testid="create-group-btn"
          >
            <Plus style={{ width: '18px', height: '18px' }} />
            Create Group
          </button>
        </div>

        {/* Groups List */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: '#737373' }}>Loading groups...</p>
          </div>
        ) : groups.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: 'center', padding: '4rem' }}>
            <Users style={{ width: '48px', height: '48px', color: '#525252', margin: '0 auto 1rem' }} />
            <p style={{ color: '#737373' }}>No groups yet. Create your first group to manage team access.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {groups.map(group => (
              <GroupCard
                key={group.id}
                group={group}
                entities={entities}
                expanded={expandedGroup === group.id}
                onToggle={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}
                onDelete={() => deleteGroupMutation.mutate(group.id)}
                onAddMember={(email) => addMemberMutation.mutate({ groupId: group.id, email })}
                onRemoveMember={(memberId) => removeMemberMutation.mutate({ groupId: group.id, memberId })}
                onGrantAccess={(entityId, accessLevel) => grantAccessMutation.mutate({ groupId: group.id, entityId, accessLevel })}
                onRevokeAccess={(accessId) => revokeAccessMutation.mutate({ groupId: group.id, accessId })}
              />
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowCreateModal(false)}>
            <div style={{ ...cardStyle, width: '100%', maxWidth: '450px', margin: '1rem' }} onClick={e => e.stopPropagation()}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#F5F5F5', marginBottom: '1.5rem' }}>Create Group</h2>
              
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Group Name</label>
                  <input
                    type="text"
                    value={newGroup.name}
                    onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                    style={inputStyle}
                    placeholder="e.g., Finance Team"
                    data-testid="group-name-input"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Description</label>
                  <textarea
                    value={newGroup.description}
                    onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                    style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                    placeholder="Optional description..."
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#A3A3A3', cursor: 'pointer', fontWeight: '500' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => createGroupMutation.mutate(newGroup)}
                    disabled={!newGroup.name}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      borderRadius: '10px',
                      fontWeight: '600',
                      background: newGroup.name ? 'linear-gradient(135deg, #C4A030 0%, #D4AF37 50%, #C4A030 100%)' : 'rgba(255, 255, 255, 0.05)',
                      color: newGroup.name ? '#000' : '#525252',
                      border: 'none',
                      cursor: newGroup.name ? 'pointer' : 'not-allowed'
                    }}
                    data-testid="confirm-create-group"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        select option { background: #0A0A0A; }
      `}</style>
    </div>
  );
}

function GroupCard({ group, entities, expanded, onToggle, onDelete, onAddMember, onRemoveMember, onGrantAccess, onRevokeAccess }) {
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('');
  const [accessLevel, setAccessLevel] = useState('read');

  const { data: members = [] } = useQuery({
    queryKey: ['group-members', group.id],
    queryFn: () => api.getGroupMembers(group.id),
    enabled: expanded,
  });

  const { data: access = [] } = useQuery({
    queryKey: ['group-access', group.id],
    queryFn: () => api.getGroupAccess(group.id),
    enabled: expanded,
  });

  const cardStyle = {
    padding: '1.5rem',
    borderRadius: '16px',
    background: '#0A0A0A',
    border: '1px solid rgba(212, 175, 55, 0.1)'
  };

  const inputStyle = {
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    background: '#0F0F0F',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#F5F5F5',
    width: '100%'
  };

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={onToggle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(212, 175, 55, 0.1)' }}>
            <Users style={{ width: '24px', height: '24px', color: '#D4AF37' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>{group.name}</h3>
            {group.description && <p style={{ fontSize: '0.875rem', color: '#525252', margin: 0, marginTop: '0.125rem' }}>{group.description}</p>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={(e) => { e.stopPropagation(); if (window.confirm('Delete this group?')) onDelete(); }} style={{ padding: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <Trash2 style={{ width: '18px', height: '18px', color: '#DC2626' }} />
          </button>
          {expanded ? <ChevronUp style={{ width: '20px', height: '20px', color: '#525252' }} /> : <ChevronDown style={{ width: '20px', height: '20px', color: '#525252' }} />}
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
          {/* Members Section */}
          <div style={{ marginBottom: '2rem' }}>
            <h4 style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#D4AF37', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserPlus style={{ width: '14px', height: '14px' }} />
              Members ({members.length})
            </h4>

            {/* Add Member */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input
                type="email"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
                placeholder="Enter email address..."
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={(e) => { e.stopPropagation(); if (newMemberEmail) { onAddMember(newMemberEmail); setNewMemberEmail(''); } }}
                disabled={!newMemberEmail}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  fontWeight: '600',
                  background: newMemberEmail ? 'linear-gradient(135deg, #C4A030 0%, #D4AF37 50%, #C4A030 100%)' : 'rgba(255, 255, 255, 0.05)',
                  color: newMemberEmail ? '#000' : '#525252',
                  border: 'none',
                  cursor: newMemberEmail ? 'pointer' : 'not-allowed'
                }}
              >
                Add
              </button>
            </div>

            {/* Member List */}
            {members.length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: '#525252' }}>No members yet</p>
            ) : (
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {members.map(member => (
                  <div key={member.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Mail style={{ width: '16px', height: '16px', color: '#525252' }} />
                      <span style={{ color: '#F5F5F5' }}>{member.user_email}</span>
                      <span style={{ fontSize: '0.625rem', padding: '0.125rem 0.375rem', borderRadius: '4px', background: member.role === 'admin' ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255, 255, 255, 0.1)', color: member.role === 'admin' ? '#D4AF37' : '#737373', textTransform: 'uppercase' }}>{member.role}</span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); onRemoveMember(member.id); }} style={{ padding: '0.25rem', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                      <Trash2 style={{ width: '14px', height: '14px', color: '#DC2626' }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Entity Access Section */}
          <div>
            <h4 style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#D4AF37', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Key style={{ width: '14px', height: '14px' }} />
              Entity Access ({access.length})
            </h4>

            {/* Grant Access */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <select
                value={selectedEntity}
                onChange={(e) => setSelectedEntity(e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
                onClick={(e) => e.stopPropagation()}
              >
                <option value="">Select entity...</option>
                {entities.filter(e => !access.find(a => a.entity_id === e.id)).map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
              <select
                value={accessLevel}
                onChange={(e) => setAccessLevel(e.target.value)}
                style={{ ...inputStyle, width: '120px' }}
                onClick={(e) => e.stopPropagation()}
              >
                <option value="read">Read</option>
                <option value="write">Write</option>
              </select>
              <button
                onClick={(e) => { e.stopPropagation(); if (selectedEntity) { onGrantAccess(selectedEntity, accessLevel); setSelectedEntity(''); } }}
                disabled={!selectedEntity}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  fontWeight: '600',
                  background: selectedEntity ? 'linear-gradient(135deg, #C4A030 0%, #D4AF37 50%, #C4A030 100%)' : 'rgba(255, 255, 255, 0.05)',
                  color: selectedEntity ? '#000' : '#525252',
                  border: 'none',
                  cursor: selectedEntity ? 'pointer' : 'not-allowed'
                }}
              >
                Grant
              </button>
            </div>

            {/* Access List */}
            {access.length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: '#525252' }}>No entity access granted</p>
            ) : (
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {access.map(a => {
                  const entity = entities.find(e => e.id === a.entity_id);
                  return (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.02)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Building2 style={{ width: '16px', height: '16px', color: '#525252' }} />
                        <span style={{ color: '#F5F5F5' }}>{entity?.name || a.entity_id}</span>
                        <span style={{ fontSize: '0.625rem', padding: '0.125rem 0.375rem', borderRadius: '4px', background: a.access_level === 'write' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(5, 150, 105, 0.2)', color: a.access_level === 'write' ? '#3B82F6' : '#059669', textTransform: 'uppercase' }}>{a.access_level}</span>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); onRevokeAccess(a.id); }} style={{ padding: '0.25rem', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                        <Trash2 style={{ width: '14px', height: '14px', color: '#DC2626' }} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
