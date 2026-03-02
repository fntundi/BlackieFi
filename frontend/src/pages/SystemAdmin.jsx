import React, { useState, useEffect } from 'react';
import { 
  Shield, Database, Clock, AlertTriangle, 
  Download, Trash2, RefreshCw, Search, Filter,
  CheckCircle, XCircle, ChevronDown, ChevronUp,
  Activity, FileText, HardDrive, Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { api } from '../api/client';
import { toast } from 'sonner';

const SystemAdmin = () => {
  const [activeTab, setActiveTab] = useState('audit');
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditStats, setAuditStats] = useState(null);
  const [securityEvents, setSecurityEvents] = useState([]);
  const [backups, setBackups] = useState([]);
  const [dbStats, setDbStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    action: '',
    severity: '',
    startDate: '',
    endDate: '',
  });
  const [expandedLog, setExpandedLog] = useState(null);

  useEffect(() => {
    if (activeTab === 'audit') {
      loadAuditData();
    } else if (activeTab === 'backup') {
      loadBackupData();
    }
  }, [activeTab]);

  const loadAuditData = async () => {
    setLoading(true);
    try {
      const [logsRes, statsRes, eventsRes] = await Promise.all([
        api.getAuditLogs({ limit: 50, ...filters }),
        api.getAuditStatistics(7),
        api.getSecurityEvents(24, 20),
      ]);
      setAuditLogs(logsRes.logs || []);
      setAuditStats(statsRes);
      setSecurityEvents(eventsRes.events || []);
    } catch (error) {
      toast.error('Failed to load audit data');
    } finally {
      setLoading(false);
    }
  };

  const loadBackupData = async () => {
    setLoading(true);
    try {
      const [backupsRes, statsRes] = await Promise.all([
        api.listBackups(),
        api.getDatabaseStats(),
      ]);
      setBackups(backupsRes.backups || []);
      setDbStats(statsRes);
    } catch (error) {
      toast.error('Failed to load backup data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async (type) => {
    setLoading(true);
    try {
      const result = await api.createBackup(type, true, true);
      toast.success(`Backup created: ${result.backup_name}`);
      loadBackupData();
    } catch (error) {
      toast.error('Failed to create backup');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBackup = async (backupName) => {
    if (!window.confirm(`Delete backup "${backupName}"?`)) return;
    
    try {
      await api.deleteBackup(backupName);
      toast.success('Backup deleted');
      loadBackupData();
    } catch (error) {
      toast.error('Failed to delete backup');
    }
  };

  const handleCleanup = async () => {
    if (!window.confirm('Clean up backups older than 30 days?')) return;
    
    try {
      const result = await api.cleanupBackups(30, 5);
      toast.success(`Cleaned up ${result.deleted?.length || 0} backups`);
      loadBackupData();
    } catch (error) {
      toast.error('Failed to cleanup backups');
    }
  };

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

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-500/20';
      case 'error': return 'text-red-400 bg-red-500/20';
      case 'warning': return 'text-yellow-400 bg-yellow-500/20';
      default: return 'text-blue-400 bg-blue-500/20';
    }
  };

  const renderAuditTab = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-[#0a0a0a] border-[#1a1a1a]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Activity className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Events (7d)</p>
                <p className="text-xl font-bold text-white">{auditStats?.total_events || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0a0a0a] border-[#1a1a1a]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Failed Events</p>
                <p className="text-xl font-bold text-white">{auditStats?.failed_events || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0a0a0a] border-[#1a1a1a]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#D4AF37]/20">
                <Users className="h-5 w-5 text-[#D4AF37]" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Unique Users</p>
                <p className="text-xl font-bold text-white">{auditStats?.unique_users || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0a0a0a] border-[#1a1a1a]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <Shield className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Security Events (24h)</p>
                <p className="text-xl font-bold text-white">{securityEvents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Events */}
      {securityEvents.length > 0 && (
        <Card className="bg-[#0a0a0a] border-[#1a1a1a]">
          <CardHeader className="border-b border-[#1a1a1a]">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-400" />
              Recent Security Events
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-[#1a1a1a]">
              {securityEvents.slice(0, 5).map((event) => (
                <div key={event.id} className="p-4 hover:bg-[#111]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded text-xs ${getSeverityColor(event.severity)}`}>
                        {event.severity}
                      </span>
                      <span className="text-white font-medium">{event.action}</span>
                    </div>
                    <span className="text-gray-500 text-sm">{formatDate(event.timestamp)}</span>
                  </div>
                  {event.ip_address && (
                    <p className="text-gray-500 text-sm mt-1">IP: {event.ip_address}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="bg-[#0a0a0a] border-[#1a1a1a]">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Filter by action..."
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                className="bg-[#111] border-[#222] text-white"
              />
            </div>
            <select
              value={filters.severity}
              onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
              className="bg-[#111] border border-[#222] text-white rounded-md px-3 py-2"
            >
              <option value="">All Severities</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
              <option value="critical">Critical</option>
            </select>
            <Button
              onClick={loadAuditData}
              variant="outline"
              className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10"
            >
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button
              onClick={() => setFilters({ action: '', severity: '', startDate: '', endDate: '' })}
              variant="ghost"
              className="text-gray-400"
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card className="bg-[#0a0a0a] border-[#1a1a1a]">
        <CardHeader className="border-b border-[#1a1a1a]">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#D4AF37]" />
              Audit Logs
            </CardTitle>
            <Button
              onClick={loadAuditData}
              variant="ghost"
              size="sm"
              className="text-gray-400"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {auditLogs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No audit logs found</p>
            </div>
          ) : (
            <div className="divide-y divide-[#1a1a1a]">
              {auditLogs.map((log) => (
                <div key={log.id} className="hover:bg-[#111]">
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {log.success ? (
                          <CheckCircle className="h-4 w-4 text-green-400" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-400" />
                        )}
                        <span className={`px-2 py-1 rounded text-xs ${getSeverityColor(log.severity)}`}>
                          {log.severity}
                        </span>
                        <span className="text-white font-medium">{log.action}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-gray-500 text-sm">{formatDate(log.timestamp)}</span>
                        {expandedLog === log.id ? (
                          <ChevronUp className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        )}
                      </div>
                    </div>
                    {log.user_email && (
                      <p className="text-gray-500 text-sm mt-1">User: {log.user_email}</p>
                    )}
                  </div>
                  {expandedLog === log.id && (
                    <div className="px-4 pb-4 bg-[#080808]">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {log.resource_type && (
                          <div>
                            <p className="text-gray-500">Resource Type</p>
                            <p className="text-white">{log.resource_type}</p>
                          </div>
                        )}
                        {log.resource_id && (
                          <div>
                            <p className="text-gray-500">Resource ID</p>
                            <p className="text-white font-mono text-xs">{log.resource_id}</p>
                          </div>
                        )}
                        {log.ip_address && (
                          <div>
                            <p className="text-gray-500">IP Address</p>
                            <p className="text-white">{log.ip_address}</p>
                          </div>
                        )}
                        {log.request_id && (
                          <div>
                            <p className="text-gray-500">Request ID</p>
                            <p className="text-white font-mono text-xs">{log.request_id}</p>
                          </div>
                        )}
                        {log.details && Object.keys(log.details).length > 0 && (
                          <div className="col-span-2">
                            <p className="text-gray-500 mb-1">Details</p>
                            <pre className="text-white bg-[#0a0a0a] p-2 rounded text-xs overflow-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </div>
                        )}
                        {log.error_message && (
                          <div className="col-span-2">
                            <p className="text-gray-500">Error</p>
                            <p className="text-red-400">{log.error_message}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderBackupTab = () => (
    <div className="space-y-6">
      {/* Database Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[#0a0a0a] border-[#1a1a1a]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#D4AF37]/20">
                <Database className="h-5 w-5 text-[#D4AF37]" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Documents</p>
                <p className="text-xl font-bold text-white">{dbStats?.total_documents?.toLocaleString() || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0a0a0a] border-[#1a1a1a]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <HardDrive className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Estimated Size</p>
                <p className="text-xl font-bold text-white">{formatBytes(dbStats?.total_size_estimate)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0a0a0a] border-[#1a1a1a]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <FileText className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Available Backups</p>
                <p className="text-xl font-bold text-white">{backups.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Backup Actions */}
      <Card className="bg-[#0a0a0a] border-[#1a1a1a]">
        <CardHeader className="border-b border-[#1a1a1a]">
          <CardTitle className="text-lg text-white">Backup Actions</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={() => handleCreateBackup('full')}
              disabled={loading}
              className="bg-[#D4AF37] hover:bg-[#C4A030] text-black"
            >
              <Database className="h-4 w-4 mr-2" />
              Full Backup
            </Button>
            <Button
              onClick={() => handleCreateBackup('critical')}
              disabled={loading}
              variant="outline"
              className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10"
            >
              <Shield className="h-4 w-4 mr-2" />
              Critical Data Only
            </Button>
            <Button
              onClick={handleCleanup}
              disabled={loading}
              variant="outline"
              className="border-gray-600 text-gray-400 hover:bg-gray-800"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Cleanup Old
            </Button>
            <Button
              onClick={loadBackupData}
              variant="ghost"
              className="text-gray-400"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Backups List */}
      <Card className="bg-[#0a0a0a] border-[#1a1a1a]">
        <CardHeader className="border-b border-[#1a1a1a]">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-[#D4AF37]" />
            Available Backups
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {backups.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No backups available</p>
              <p className="text-sm mt-2">Create your first backup to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-[#1a1a1a]">
              {backups.map((backup) => (
                <div key={backup.name} className="p-4 hover:bg-[#111]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-[#111]">
                        {backup.compressed ? (
                          <Database className="h-5 w-5 text-[#D4AF37]" />
                        ) : (
                          <FileText className="h-5 w-5 text-blue-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-white font-medium">{backup.name}</p>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-gray-500 text-sm flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(backup.created)}
                          </span>
                          <span className="text-gray-500 text-sm">
                            {formatBytes(backup.size_bytes)}
                          </span>
                          {backup.type && (
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              backup.type === 'full' 
                                ? 'bg-[#D4AF37]/20 text-[#D4AF37]'
                                : 'bg-blue-500/20 text-blue-400'
                            }`}>
                              {backup.type}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => window.open(api.getBackupDownloadUrl(backup.name), '_blank')}
                        variant="ghost"
                        size="sm"
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => handleDeleteBackup(backup.name)}
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Collections Breakdown */}
      {dbStats?.collections && Object.keys(dbStats.collections).length > 0 && (
        <Card className="bg-[#0a0a0a] border-[#1a1a1a]">
          <CardHeader className="border-b border-[#1a1a1a]">
            <CardTitle className="text-lg text-white">Collections Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(dbStats.collections)
                .sort((a, b) => b[1].documents - a[1].documents)
                .slice(0, 12)
                .map(([name, stats]) => (
                  <div key={name} className="p-3 bg-[#111] rounded-lg">
                    <p className="text-gray-400 text-xs truncate">{name}</p>
                    <p className="text-white font-bold">{stats.documents?.toLocaleString() || 0}</p>
                    <p className="text-gray-500 text-xs">{formatBytes(stats.estimated_size_bytes)}</p>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="space-y-6" data-testid="system-admin-page">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">System Administration</h1>
          <p className="text-gray-500">Audit logs, backups, and system monitoring</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-[#1a1a1a] pb-2">
        <Button
          onClick={() => setActiveTab('audit')}
          variant={activeTab === 'audit' ? 'default' : 'ghost'}
          className={activeTab === 'audit' 
            ? 'bg-[#D4AF37] text-black hover:bg-[#C4A030]' 
            : 'text-gray-400 hover:text-white'}
          data-testid="tab-audit"
        >
          <Shield className="h-4 w-4 mr-2" />
          Audit Logs
        </Button>
        <Button
          onClick={() => setActiveTab('backup')}
          variant={activeTab === 'backup' ? 'default' : 'ghost'}
          className={activeTab === 'backup' 
            ? 'bg-[#D4AF37] text-black hover:bg-[#C4A030]' 
            : 'text-gray-400 hover:text-white'}
          data-testid="tab-backup"
        >
          <Database className="h-4 w-4 mr-2" />
          Backup & Recovery
        </Button>
      </div>

      {/* Tab Content */}
      {activeTab === 'audit' && renderAuditTab()}
      {activeTab === 'backup' && renderBackupTab()}
    </div>
  );
};

export default SystemAdmin;
