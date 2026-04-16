import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { History, Filter, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

const AuditFilterPanel = ({ actions, resourceTypes, filters, setFilters, onApply, onClear }) => (
  <div className="audit-filters" data-testid="audit-filters">
    <div className="filter-row">
      <div className="filter-group">
        <label>Action</label>
        <select value={filters.action} onChange={(e) => setFilters(f => ({ ...f, action: e.target.value }))}>
          <option value="">All Actions</option>
          {actions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      <div className="filter-group">
        <label>Resource Type</label>
        <select value={filters.type} onChange={(e) => setFilters(f => ({ ...f, type: e.target.value }))}>
          <option value="">All Types</option>
          {resourceTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="filter-group">
        <label>Start Date</label>
        <input type="date" value={filters.start} onChange={(e) => setFilters(f => ({ ...f, start: e.target.value }))} />
      </div>
      <div className="filter-group">
        <label>End Date</label>
        <input type="date" value={filters.end} onChange={(e) => setFilters(f => ({ ...f, end: e.target.value }))} />
      </div>
      <div className="filter-actions">
        <button className="btn-primary btn-sm" onClick={onApply}><Filter size={14} /> Apply</button>
        <button className="btn-secondary btn-sm" onClick={onClear}>Clear</button>
      </div>
    </div>
  </div>
);

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  try { return new Date(dateStr).toLocaleString(); }
  catch { return dateStr; }
};

const getActionBadgeClass = (action) => {
  if (action?.includes("create") || action?.includes("add")) return "badge-green";
  if (action?.includes("delete") || action?.includes("remove")) return "badge-red";
  if (action?.includes("update") || action?.includes("edit")) return "badge-blue";
  if (action?.includes("auto")) return "badge-amber";
  return "badge-gray";
};

const AuditLogTable = ({ logs }) => (
  <div className="audit-table-container">
    <table className="audit-table" data-testid="audit-table">
      <thead>
        <tr><th>Timestamp</th><th>User</th><th>Action</th><th>Resource</th><th>Details</th></tr>
      </thead>
      <tbody>
        {logs.map((log) => (
          <tr key={log.id} data-testid={`audit-row-${log.id}`}>
            <td className="timestamp">{formatDate(log.created_at)}</td>
            <td className="user">
              <span className="user-name">{log.user_name || "Unknown"}</span>
              <span className="user-email">{log.user_email || ""}</span>
            </td>
            <td><span className={`badge ${getActionBadgeClass(log.action)}`}>{log.action}</span></td>
            <td className="resource">
              <span className="resource-type">{log.resource_type}</span>
              <span className="resource-id">{log.resource_id?.slice(0, 8)}...</span>
            </td>
            <td className="details">
              {log.details && Object.keys(log.details).length > 0 ? (
                <code>{JSON.stringify(log.details).slice(0, 50)}...</code>
              ) : <span className="text-muted">-</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const EMPTY_FILTERS = { action: "", type: "", start: "", end: "" };

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actions, setActions] = useState([]);
  const [resourceTypes, setResourceTypes] = useState([]);
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS });
  const [offset, setOffset] = useState(0);
  const limit = 25;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.action) params.append("action", filters.action);
      if (filters.type) params.append("resource_type", filters.type);
      if (filters.start) params.append("start_date", filters.start);
      if (filters.end) params.append("end_date", filters.end);
      params.append("limit", limit);
      params.append("offset", offset);
      const res = await api.get(`/audit/?${params.toString()}`);
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
    } catch (e) {
      console.error("Failed to load audit logs:", e.message);
    }
    setLoading(false);
  }, [filters, offset]);

  const fetchFilters = useCallback(async () => {
    try {
      const [actRes, typeRes] = await Promise.all([api.get("/audit/actions"), api.get("/audit/resource-types")]);
      setActions(actRes.data.actions || []);
      setResourceTypes(typeRes.data.resource_types || []);
    } catch (e) {
      console.error("Failed to load filter options:", e.message);
    }
  }, []);

  useEffect(() => { fetchFilters(); }, [fetchFilters]);
  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleApply = () => { setOffset(0); fetchLogs(); };
  const handleClear = () => { setFilters({ ...EMPTY_FILTERS }); setOffset(0); };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="page-content" data-testid="audit-log-page">
      <div className="page-header">
        <h2><History size={24} /> Audit Log</h2>
        <button className="btn-icon" onClick={fetchLogs} data-testid="refresh-audit"><RefreshCw size={16} /></button>
      </div>

      <AuditFilterPanel actions={actions} resourceTypes={resourceTypes} filters={filters} setFilters={setFilters} onApply={handleApply} onClear={handleClear} />

      <div className="audit-summary"><span>Showing {logs.length} of {total} entries</span></div>

      {loading ? (
        <div className="loading-state">Loading audit logs...</div>
      ) : logs.length === 0 ? (
        <div className="empty-state">
          <History size={48} /><p>No audit logs found</p>
          {(filters.action || filters.type || filters.start || filters.end) && (
            <button className="btn-secondary" onClick={handleClear}>Clear Filters</button>
          )}
        </div>
      ) : (
        <AuditLogTable logs={logs} />
      )}

      {totalPages > 1 && (
        <div className="pagination" data-testid="audit-pagination">
          <button className="btn-icon" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}><ChevronLeft size={18} /></button>
          <span>Page {currentPage} of {totalPages}</span>
          <button className="btn-icon" disabled={currentPage >= totalPages} onClick={() => setOffset(offset + limit)}><ChevronRight size={18} /></button>
        </div>
      )}
    </div>
  );
}
