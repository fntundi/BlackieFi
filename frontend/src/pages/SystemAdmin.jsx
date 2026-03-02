import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { 
  Shield, Database, Clock, AlertTriangle, 
  Download, Trash2, RefreshCw, Search,
  CheckCircle, XCircle, ChevronDown, ChevronUp,
  Activity, FileText, HardDrive, Users, Loader2
} from 'lucide-react';
import { tileStyles, headerStyles, inputStyles, buttonStyles, GoldAccentLine } from '../styles/tileStyles';

const SystemAdmin = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('audit');
  const [expandedLog, setExpandedLog] = useState(null);
  const [filters, setFilters] = useState({
    action: '',
    severity: '',
  });

  const isAdmin = user?.role === 'admin';

  // Audit queries - always call hooks but disable when not admin
  const { data: auditLogs = [], isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: () => api.getAuditLogs({ limit: 50, ...filters }),
    enabled: isAdmin && activeTab === 'audit',
    select: (data) => data.logs || [],
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
    select: (data) => data.events || [],
  });

  // Backup queries
  const { data: backups = [], isLoading: backupsLoading, refetch: refetchBackups } = useQuery({
    queryKey: ['backups'],
    queryFn: () => api.listBackups(),
    enabled: isAdmin && activeTab === 'backup',
    select: (data) => data.backups || [],
  });

  const { data: dbStats } = useQuery({
    queryKey: ['db-stats'],
    queryFn: () => api.getDatabaseStats(),
    enabled: isAdmin && activeTab === 'backup',
  });

  // Mutations
  const createBackupMutation = useMutation({
    mutationFn: (backupType) => api.createBackup(backupType, true, true),
    onSuccess: (data) => {
      toast.success(`Backup created: ${data.backup_name}`);
      queryClient.invalidateQueries(['backups']);
    },
    onError: () => toast.error('Failed to create backup'),
  });

  const deleteBackupMutation = useMutation({
    mutationFn: (backupName) => api.deleteBackup(backupName),
    onSuccess: () => {
      toast.success('Backup deleted');
      queryClient.invalidateQueries(['backups']);
    },
    onError: () => toast.error('Failed to delete backup'),
  });

  const cleanupMutation = useMutation({
    mutationFn: () => api.cleanupBackups(30, 5),
    onSuccess: (data) => {
      toast.success(`Cleaned up ${data.deleted?.length || 0} backups`);
      queryClient.invalidateQueries(['backups']);
    },
    onError: () => toast.error('Failed to cleanup backups'),
  });

  // Backup schedule queries and mutations
  const { data: backupSchedule } = useQuery({
    queryKey: ['backup-schedule'],
    queryFn: () => api.getBackupSchedule(),
    enabled: isAdmin && activeTab === 'backup',
  });

  const updateScheduleMutation = useMutation({
    mutationFn: (settings) => api.updateBackupSchedule(settings),
    onSuccess: () => {
      toast.success('Backup schedule updated');
      queryClient.invalidateQueries(['backup-schedule']);
    },
    onError: () => toast.error('Failed to update schedule'),
  });

  // Check if user is admin - now after all hooks
  if (!isAdmin) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <Shield style={{ width: 64, height: 64, color: '#D4AF37', margin: '0 auto 1rem' }} />
        <h2 style={{ color: '#fff', marginBottom: '0.5rem' }}>Access Denied</h2>
        <p style={{ color: '#666' }}>This page is only accessible to administrators.</p>
      </div>
    );
  }

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString();
  };

  const getSeverityStyle = (severity) => {
    switch (severity) {
      case 'critical': return { color: '#ef4444', background: 'rgba(239, 68, 68, 0.15)' };
      case 'error': return { color: '#ef4444', background: 'rgba(239, 68, 68, 0.15)' };
      case 'warning': return { color: '#eab308', background: 'rgba(234, 179, 8, 0.15)' };
      default: return { color: '#3b82f6', background: 'rgba(59, 130, 246, 0.15)' };
    }
  };

  const renderAuditTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        <div style={tileStyles.stat}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.2)' }}>
              <Activity style={{ width: 20, height: 20, color: '#3b82f6' }} />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#666' }}>Total Events (7d)</p>
              <p style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff' }}>{auditStats?.total_events || 0}</p>
            </div>
          </div>
        </div>

        <div style={tileStyles.statRed}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.2)' }}>
              <AlertTriangle style={{ width: 20, height: 20, color: '#ef4444' }} />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#666' }}>Failed Events</p>
              <p style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff' }}>{auditStats?.failed_events || 0}</p>
            </div>
          </div>
        </div>

        <div style={tileStyles.statGold}>
          <GoldAccentLine />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(212, 175, 55, 0.2)' }}>
              <Users style={{ width: 20, height: 20, color: '#D4AF37' }} />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#666' }}>Unique Users</p>
              <p style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff' }}>{auditStats?.unique_users || 0}</p>
            </div>
          </div>
        </div>

        <div style={tileStyles.stat}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(249, 115, 22, 0.2)' }}>
              <Shield style={{ width: 20, height: 20, color: '#f97316' }} />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#666' }}>Security Events (24h)</p>
              <p style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff' }}>{securityEvents.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Security Events Alert */}
      {securityEvents.length > 0 && (
        <div style={tileStyles.content}>
          <div style={{ ...headerStyles.section, marginBottom: '1rem' }}>
            <AlertTriangle style={{ width: 20, height: 20, color: '#f97316' }} />
            <span>Recent Security Events</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {securityEvents.slice(0, 5).map((event) => (
              <div key={event.id} style={{ ...tileStyles.inner, padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ ...getSeverityStyle(event.severity), padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '600' }}>
                    {event.severity}
                  </span>
                  <span style={{ color: '#fff', fontWeight: '500' }}>{event.action}</span>
                </div>
                <span style={{ color: '#666', fontSize: '0.8rem' }}>{formatDate(event.timestamp)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ ...tileStyles.content, padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Filter by action..."
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            style={{ ...inputStyles.text, flex: 1, minWidth: '200px' }}
          />
          <select
            value={filters.severity}
            onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
            style={inputStyles.select}
          >
            <option value="">All Severities</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
            <option value="critical">Critical</option>
          </select>
          <button onClick={() => refetchLogs()} style={buttonStyles.secondary}>
            <Search style={{ width: 16, height: 16 }} />
            Search
          </button>
          <button 
            onClick={() => setFilters({ action: '', severity: '' })} 
            style={{ ...buttonStyles.ghost, color: '#666' }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div style={tileStyles.content}>
        <div style={{ ...headerStyles.section, marginBottom: '1rem', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText style={{ width: 20, height: 20, color: '#D4AF37' }} />
            <span>Audit Logs</span>
          </div>
          <button onClick={() => refetchLogs()} style={buttonStyles.ghost}>
            <RefreshCw style={{ width: 16, height: 16, animation: logsLoading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>

        {logsLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Loader2 style={{ width: 32, height: 32, color: '#D4AF37', margin: '0 auto', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : auditLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
            <Shield style={{ width: 48, height: 48, margin: '0 auto 1rem', opacity: 0.5 }} />
            <p>No audit logs found</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {auditLogs.map((log) => (
              <div key={log.id} style={tileStyles.inner}>
                <div 
                  style={{ padding: '0.75rem 1rem', cursor: 'pointer' }}
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {log.success ? (
                        <CheckCircle style={{ width: 16, height: 16, color: '#22c55e' }} />
                      ) : (
                        <XCircle style={{ width: 16, height: 16, color: '#ef4444' }} />
                      )}
                      <span style={{ ...getSeverityStyle(log.severity), padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '600' }}>
                        {log.severity}
                      </span>
                      <span style={{ color: '#fff', fontWeight: '500' }}>{log.action}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ color: '#666', fontSize: '0.8rem' }}>{formatDate(log.timestamp)}</span>
                      {expandedLog === log.id ? (
                        <ChevronUp style={{ width: 16, height: 16, color: '#666' }} />
                      ) : (
                        <ChevronDown style={{ width: 16, height: 16, color: '#666' }} />
                      )}
                    </div>
                  </div>
                  {log.user_email && (
                    <p style={{ color: '#666', fontSize: '0.8rem', marginTop: '0.25rem' }}>User: {log.user_email}</p>
                  )}
                </div>
                {expandedLog === log.id && (
                  <div style={{ padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem' }}>
                      {log.resource_type && (
                        <div>
                          <p style={{ color: '#666' }}>Resource Type</p>
                          <p style={{ color: '#fff' }}>{log.resource_type}</p>
                        </div>
                      )}
                      {log.resource_id && (
                        <div>
                          <p style={{ color: '#666' }}>Resource ID</p>
                          <p style={{ color: '#fff', fontFamily: 'monospace', fontSize: '0.75rem' }}>{log.resource_id}</p>
                        </div>
                      )}
                      {log.ip_address && (
                        <div>
                          <p style={{ color: '#666' }}>IP Address</p>
                          <p style={{ color: '#fff' }}>{log.ip_address}</p>
                        </div>
                      )}
                      {log.details && Object.keys(log.details).length > 0 && (
                        <div style={{ gridColumn: 'span 2' }}>
                          <p style={{ color: '#666', marginBottom: '0.5rem' }}>Details</p>
                          <pre style={{ color: '#fff', background: 'rgba(0,0,0,0.4)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.75rem', overflow: 'auto' }}>
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.error_message && (
                        <div style={{ gridColumn: 'span 2' }}>
                          <p style={{ color: '#666' }}>Error</p>
                          <p style={{ color: '#ef4444' }}>{log.error_message}</p>
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
  );

  const renderBackupTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Database Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        <div style={tileStyles.statGold}>
          <GoldAccentLine />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(212, 175, 55, 0.2)' }}>
              <Database style={{ width: 20, height: 20, color: '#D4AF37' }} />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#666' }}>Total Documents</p>
              <p style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff' }}>{dbStats?.total_documents?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>

        <div style={tileStyles.stat}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.2)' }}>
              <HardDrive style={{ width: 20, height: 20, color: '#3b82f6' }} />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#666' }}>Estimated Size</p>
              <p style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff' }}>{formatBytes(dbStats?.total_size_estimate)}</p>
            </div>
          </div>
        </div>

        <div style={tileStyles.statGreen}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.2)' }}>
              <FileText style={{ width: 20, height: 20, color: '#22c55e' }} />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#666' }}>Available Backups</p>
              <p style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff' }}>{backups.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Backup Actions */}
      <div style={tileStyles.content}>
        <div style={{ ...headerStyles.section, marginBottom: '1rem' }}>
          <span>Backup Actions</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => createBackupMutation.mutate('full')}
            disabled={createBackupMutation.isPending}
            style={buttonStyles.primary}
          >
            {createBackupMutation.isPending ? (
              <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
            ) : (
              <Database style={{ width: 16, height: 16 }} />
            )}
            Full Backup
          </button>
          <button
            onClick={() => createBackupMutation.mutate('critical')}
            disabled={createBackupMutation.isPending}
            style={buttonStyles.secondary}
          >
            <Shield style={{ width: 16, height: 16 }} />
            Critical Data Only
          </button>
          <button
            onClick={() => {
              if (window.confirm('Clean up backups older than 30 days?')) {
                cleanupMutation.mutate();
              }
            }}
            disabled={cleanupMutation.isPending}
            style={{ ...buttonStyles.ghost, color: '#666' }}
          >
            <Trash2 style={{ width: 16, height: 16 }} />
            Cleanup Old
          </button>
          <button onClick={() => refetchBackups()} style={buttonStyles.ghost}>
            <RefreshCw style={{ width: 16, height: 16, animation: backupsLoading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {/* Backups List */}
      <div style={tileStyles.content}>
        <div style={{ ...headerStyles.section, marginBottom: '1rem' }}>
          <HardDrive style={{ width: 20, height: 20, color: '#D4AF37' }} />
          <span>Available Backups</span>
        </div>

        {backupsLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Loader2 style={{ width: 32, height: 32, color: '#D4AF37', margin: '0 auto', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : backups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
            <Database style={{ width: 48, height: 48, margin: '0 auto 1rem', opacity: 0.5 }} />
            <p>No backups available</p>
            <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Create your first backup to get started</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {backups.map((backup) => (
              <div key={backup.name} style={{ ...tileStyles.inner, padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(212, 175, 55, 0.1)' }}>
                      <Database style={{ width: 20, height: 20, color: '#D4AF37' }} />
                    </div>
                    <div>
                      <p style={{ color: '#fff', fontWeight: '500' }}>{backup.name}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.25rem' }}>
                        <span style={{ color: '#666', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Clock style={{ width: 12, height: 12 }} />
                          {formatDate(backup.created)}
                        </span>
                        <span style={{ color: '#666', fontSize: '0.8rem' }}>{formatBytes(backup.size_bytes)}</span>
                        {backup.type && (
                          <span style={{ 
                            padding: '0.125rem 0.5rem', 
                            borderRadius: '4px', 
                            fontSize: '0.7rem',
                            background: backup.type === 'full' ? 'rgba(212, 175, 55, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                            color: backup.type === 'full' ? '#D4AF37' : '#3b82f6',
                          }}>
                            {backup.type}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      onClick={() => window.open(api.getBackupDownloadUrl(backup.name), '_blank')}
                      style={{ ...buttonStyles.ghost, padding: '0.5rem' }}
                    >
                      <Download style={{ width: 16, height: 16, color: '#3b82f6' }} />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete backup "${backup.name}"?`)) {
                          deleteBackupMutation.mutate(backup.name);
                        }
                      }}
                      style={{ ...buttonStyles.ghost, padding: '0.5rem' }}
                    >
                      <Trash2 style={{ width: 16, height: 16, color: '#ef4444' }} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Collections Breakdown */}
      {dbStats?.collections && Object.keys(dbStats.collections).length > 0 && (
        <div style={tileStyles.content}>
          <div style={{ ...headerStyles.section, marginBottom: '1rem' }}>
            <span>Collections Breakdown</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
            {Object.entries(dbStats.collections)
              .sort((a, b) => (b[1].documents || 0) - (a[1].documents || 0))
              .slice(0, 12)
              .map(([name, stats]) => (
                <div key={name} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                  <p style={{ color: '#666', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
                  <p style={{ color: '#fff', fontWeight: '700' }}>{(stats.documents || 0).toLocaleString()}</p>
                  <p style={{ color: '#666', fontSize: '0.7rem' }}>{formatBytes(stats.estimated_size_bytes)}</p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div data-testid="system-admin-page">
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ ...headerStyles.page, marginBottom: '0.25rem' }}>System Administration</h1>
        <p style={{ color: '#666' }}>Audit logs, backups, and system monitoring</p>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setActiveTab('audit')}
          style={activeTab === 'audit' ? buttonStyles.primary : { ...buttonStyles.ghost, color: '#666' }}
          data-testid="tab-audit"
        >
          <Shield style={{ width: 16, height: 16 }} />
          Audit Logs
        </button>
        <button
          onClick={() => setActiveTab('backup')}
          style={activeTab === 'backup' ? buttonStyles.primary : { ...buttonStyles.ghost, color: '#666' }}
          data-testid="tab-backup"
        >
          <Database style={{ width: 16, height: 16 }} />
          Backup & Recovery
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'audit' && renderAuditTab()}
      {activeTab === 'backup' && renderBackupTab()}

      {/* CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default SystemAdmin;
