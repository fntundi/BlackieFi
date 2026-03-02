'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  Shield, Database, Clock, AlertTriangle, 
  Download, Trash2, RefreshCw, Search,
  CheckCircle, XCircle, ChevronDown, ChevronUp,
  Activity, FileText, HardDrive, Users, Loader2
} from 'lucide-react';

export default function SystemAdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'audit' | 'backup'>('audit');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [filters, setFilters] = useState({ action: '', severity: '' });

  const isAdmin = user?.role === 'admin';

  // Queries
  const { data: auditLogs = [], isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: () => api.getAuditLogs({ limit: 50, ...filters }),
    enabled: isAdmin && activeTab === 'audit',
    select: (data: any) => data.logs || [],
  });

  const { data: auditStats } = useQuery({
    queryKey: ['audit-stats'],
    queryFn: () => api.getAuditStatistics(7),
    enabled: isAdmin && activeTab === 'audit',
  });

  const { data: securityEvents = [] } = useQuery({
    queryKey: ['security-events'],
    queryFn: () => api.getSecurityEvents(24, 20),
    enabled: isAdmin && activeTab === 'audit',
    select: (data: any) => data.events || [],
  });

  const { data: backups = [], isLoading: backupsLoading, refetch: refetchBackups } = useQuery({
    queryKey: ['backups'],
    queryFn: () => api.listBackups(),
    enabled: isAdmin && activeTab === 'backup',
    select: (data: any) => data.backups || [],
  });

  const { data: dbStats } = useQuery({
    queryKey: ['db-stats'],
    queryFn: () => api.getDatabaseStats(),
    enabled: isAdmin && activeTab === 'backup',
  });

  const { data: backupSchedule } = useQuery({
    queryKey: ['backup-schedule'],
    queryFn: () => api.getBackupSchedule(),
    enabled: isAdmin && activeTab === 'backup',
  });

  // Mutations
  const createBackupMutation = useMutation({
    mutationFn: (backupType: string) => api.createBackup(backupType, true),
    onSuccess: (data: any) => {
      toast.success(`Backup created: ${data.backup_name}`);
      queryClient.invalidateQueries({ queryKey: ['backups'] });
    },
    onError: () => toast.error('Failed to create backup'),
  });

  const updateScheduleMutation = useMutation({
    mutationFn: (settings: any) => api.updateBackupSchedule(settings),
    onSuccess: () => {
      toast.success('Backup schedule updated');
      queryClient.invalidateQueries({ queryKey: ['backup-schedule'] });
    },
    onError: () => toast.error('Failed to update schedule'),
  });

  if (authLoading) {
    return (
      <Sidebar>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
        </div>
      </Sidebar>
    );
  }

  if (!isAdmin) {
    return (
      <Sidebar>
        <div className="text-center py-16">
          <Shield className="w-16 h-16 text-[#D4AF37] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-500">This page is only accessible to administrators.</p>
        </div>
      </Sidebar>
    );
  }

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString();
  };

  const getSeverityClass = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'error':
        return 'badge-error';
      case 'warning':
        return 'badge-warning';
      default:
        return 'badge-info';
    }
  };

  return (
    <Sidebar>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">System Administration</h1>
          <p className="text-gray-500">Audit logs, backups, and system monitoring</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/5 pb-2">
          <button
            onClick={() => setActiveTab('audit')}
            className={activeTab === 'audit' ? 'btn-primary' : 'btn-ghost'}
          >
            <Shield className="w-4 h-4" />
            Audit Logs
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={activeTab === 'backup' ? 'btn-primary' : 'btn-ghost'}
          >
            <Database className="w-4 h-4" />
            Backup & Recovery
          </button>
        </div>

        {/* Audit Tab */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="stat-card">
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-xs text-gray-500">Total Events (7d)</p>
                    <p className="text-xl font-bold text-white">{auditStats?.total_events || 0}</p>
                  </div>
                </div>
              </div>
              <div className="stat-card">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <div>
                    <p className="text-xs text-gray-500">Failed Events</p>
                    <p className="text-xl font-bold text-white">{auditStats?.failed_events || 0}</p>
                  </div>
                </div>
              </div>
              <div className="stat-card-gold">
                <div className="gold-accent" />
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-[#D4AF37]" />
                  <div>
                    <p className="text-xs text-gray-500">Unique Users</p>
                    <p className="text-xl font-bold text-white">{auditStats?.unique_users || 0}</p>
                  </div>
                </div>
              </div>
              <div className="stat-card">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-orange-400" />
                  <div>
                    <p className="text-xs text-gray-500">Security Events</p>
                    <p className="text-xl font-bold text-white">{securityEvents.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Logs List */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#D4AF37]" />
                  Audit Logs
                </h2>
                <button onClick={() => refetchLogs()} className="btn-ghost">
                  <RefreshCw className={`w-4 h-4 ${logsLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              
              {auditLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No audit logs found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {auditLogs.map((log: any) => (
                    <div key={log.id} className="bg-white/5 rounded-lg">
                      <div
                        className="p-4 cursor-pointer hover:bg-white/5"
                        onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {log.success ? (
                              <CheckCircle className="w-4 h-4 text-green-400" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-400" />
                            )}
                            <span className={getSeverityClass(log.severity)}>{log.severity}</span>
                            <span className="text-white font-medium">{log.action}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-gray-500 text-sm">{formatDate(log.timestamp)}</span>
                            {expandedLog === log.id ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                          </div>
                        </div>
                        {log.user_email && (
                          <p className="text-gray-500 text-sm mt-1">User: {log.user_email}</p>
                        )}
                      </div>
                      {expandedLog === log.id && (
                        <div className="px-4 pb-4 bg-black/20 rounded-b-lg">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            {log.resource_type && (
                              <div>
                                <p className="text-gray-500">Resource Type</p>
                                <p className="text-white">{log.resource_type}</p>
                              </div>
                            )}
                            {log.ip_address && (
                              <div>
                                <p className="text-gray-500">IP Address</p>
                                <p className="text-white">{log.ip_address}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Backup Tab */}
        {activeTab === 'backup' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="stat-card-gold">
                <div className="gold-accent" />
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-[#D4AF37]" />
                  <div>
                    <p className="text-xs text-gray-500">Total Documents</p>
                    <p className="text-xl font-bold text-white">{dbStats?.total_documents?.toLocaleString() || 0}</p>
                  </div>
                </div>
              </div>
              <div className="stat-card">
                <div className="flex items-center gap-3">
                  <HardDrive className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-xs text-gray-500">Estimated Size</p>
                    <p className="text-xl font-bold text-white">{formatBytes(dbStats?.total_size_estimate)}</p>
                  </div>
                </div>
              </div>
              <div className="stat-card">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-xs text-gray-500">Available Backups</p>
                    <p className="text-xl font-bold text-white">{backups.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="card">
              <h2 className="text-lg font-semibold text-white mb-4">Backup Actions</h2>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => createBackupMutation.mutate('full')}
                  disabled={createBackupMutation.isPending}
                  className="btn-primary"
                >
                  {createBackupMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                  Full Backup
                </button>
                <button
                  onClick={() => createBackupMutation.mutate('critical')}
                  disabled={createBackupMutation.isPending}
                  className="btn-secondary"
                >
                  <Shield className="w-4 h-4" />
                  Critical Data Only
                </button>
              </div>
            </div>

            {/* Schedule */}
            <div className="card">
              <div className="gold-accent" />
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#D4AF37]" />
                Automated Backup Schedule
              </h2>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="text-sm text-gray-500 block mb-2">Frequency</label>
                  <select
                    value={backupSchedule?.frequency || 'disabled'}
                    onChange={(e) => updateScheduleMutation.mutate({
                      ...backupSchedule,
                      enabled: e.target.value !== 'disabled',
                      frequency: e.target.value,
                    })}
                    className="input w-full"
                  >
                    <option value="disabled">Disabled</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-500 block mb-2">Backup Type</label>
                  <select
                    value={backupSchedule?.backup_type || 'full'}
                    onChange={(e) => updateScheduleMutation.mutate({
                      ...backupSchedule,
                      backup_type: e.target.value,
                    })}
                    className="input w-full"
                    disabled={!backupSchedule?.enabled}
                  >
                    <option value="full">Full Backup</option>
                    <option value="critical">Critical Data Only</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-500 block mb-2">Retention</label>
                  <select
                    value={backupSchedule?.retention_days || 30}
                    onChange={(e) => updateScheduleMutation.mutate({
                      ...backupSchedule,
                      retention_days: parseInt(e.target.value),
                    })}
                    className="input w-full"
                    disabled={!backupSchedule?.enabled}
                  >
                    <option value="7">7 days</option>
                    <option value="14">14 days</option>
                    <option value="30">30 days</option>
                    <option value="60">60 days</option>
                  </select>
                </div>
              </div>
              {backupSchedule?.enabled && (
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-medium">Scheduled backups are enabled</span>
                  </div>
                  {backupSchedule?.next_backup && (
                    <p className="text-sm text-gray-500 mt-1">
                      Next backup: {formatDate(backupSchedule.next_backup)}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Backups List */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-[#D4AF37]" />
                  Available Backups
                </h2>
                <button onClick={() => refetchBackups()} className="btn-ghost">
                  <RefreshCw className={`w-4 h-4 ${backupsLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              
              {backups.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Database className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No backups available</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {backups.map((backup: any) => (
                    <div key={backup.name} className="p-4 bg-white/5 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Database className="w-5 h-5 text-[#D4AF37]" />
                        <div>
                          <p className="text-white font-medium">{backup.name}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(backup.created)}
                            </span>
                            <span>{formatBytes(backup.size_bytes)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="btn-ghost text-blue-400">
                          <Download className="w-4 h-4" />
                        </button>
                        <button className="btn-ghost text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Sidebar>
  );
}
