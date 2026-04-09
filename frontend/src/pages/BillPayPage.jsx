import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import {
  CalendarClock, Plus, Trash2, Play, Power, PowerOff, DollarSign,
  RefreshCw, CheckCircle, XCircle, Pencil, History, CreditCard
} from "lucide-react";

export default function BillPayPage() {
  const [schedules, setSchedules] = useState([]);
  const [history, setHistory] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [tab, setTab] = useState("schedules");
  const [form, setForm] = useState({
    name: "", amount: "", frequency: "monthly", day_of_month: 1,
    account_id: "", category_id: "", source_type: "expense", enabled: true,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [schedRes, histRes, acctRes, catRes] = await Promise.all([
        api.get("/billpay/schedules"),
        api.get("/billpay/history"),
        api.get("/accounts/"),
        api.get("/categories/"),
      ]);
      setSchedules(schedRes.data.schedules || []);
      setHistory(histRes.data.history || []);
      setAccounts(acctRes.data || []);
      setCategories(catRes.data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setForm({ name: "", amount: "", frequency: "monthly", day_of_month: 1, account_id: "", category_id: "", source_type: "expense", enabled: true });
    setEditId(null);
    setShowForm(false);
  };

  const startEdit = (s) => {
    setForm({
      name: s.name, amount: s.amount, frequency: s.frequency,
      day_of_month: s.day_of_month, account_id: s.account_id || "",
      category_id: s.category_id || "", source_type: s.source_type || "expense",
      enabled: s.enabled,
    });
    setEditId(s.id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, amount: parseFloat(form.amount), day_of_month: parseInt(form.day_of_month) };
    try {
      if (editId) {
        await api.put(`/billpay/schedules/${editId}`, payload);
      } else {
        await api.post("/billpay/schedules", payload);
      }
      resetForm();
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || "Error saving schedule");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this bill schedule?")) return;
    try { await api.delete(`/billpay/schedules/${id}`); fetchData(); }
    catch (err) { alert(err.response?.data?.detail || "Error"); }
  };

  const handleToggle = async (id) => {
    try { await api.post(`/billpay/schedules/${id}/toggle`); fetchData(); }
    catch (err) { alert(err.response?.data?.detail || "Error"); }
  };

  const handlePayNow = async (id) => {
    setProcessing(id);
    try {
      const res = await api.post(`/billpay/schedules/${id}/pay-now`);
      alert(res.data.message);
      fetchData();
    } catch (err) { alert(err.response?.data?.detail || "Error"); }
    setProcessing(null);
  };

  const handleProcessDue = async () => {
    if (!window.confirm("Process all due bill payments now?")) return;
    setProcessing("all");
    try {
      const res = await api.post("/billpay/process-due");
      alert(res.data.message);
      fetchData();
    } catch (err) { alert(err.response?.data?.detail || "Error"); }
    setProcessing(null);
  };

  const dueCount = schedules.filter(s => s.enabled && s.next_payment_date <= new Date().toISOString().slice(0, 10)).length;
  const activeCount = schedules.filter(s => s.enabled).length;
  const totalMonthly = schedules.filter(s => s.enabled).reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="page-content" data-testid="billpay-page">
      <div className="page-header">
        <h2><CalendarClock size={24} /> Bill Pay Scheduling</h2>
        <div className="header-actions">
          <button className="btn-icon" onClick={fetchData} data-testid="refresh-billpay"><RefreshCw size={16} /></button>
          <button className="btn-primary btn-sm" onClick={() => { resetForm(); setShowForm(true); }} data-testid="add-schedule-btn">
            <Plus size={14} /> New Schedule
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid" data-testid="billpay-stats">
        <div className="stat-card">
          <div className="stat-label">Active Schedules</div>
          <div className="stat-value">{activeCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Due Now</div>
          <div className="stat-value" style={{ color: dueCount > 0 ? "var(--warning)" : "var(--success)" }}>{dueCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Monthly Total</div>
          <div className="stat-value">${totalMonthly.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Schedules</div>
          <div className="stat-value">{schedules.length}</div>
        </div>
      </div>

      {/* Due Alert */}
      {dueCount > 0 && (
        <div className="billpay-alert" data-testid="due-alert">
          <div className="alert-content">
            <CreditCard size={20} />
            <span><strong>{dueCount} bill(s)</strong> are due for payment</span>
          </div>
          <button className="btn-primary btn-sm" onClick={handleProcessDue} disabled={processing === "all"} data-testid="process-due-btn">
            {processing === "all" ? <><RefreshCw size={14} className="spin" /> Processing...</> : <><Play size={14} /> Pay All Due</>}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="billpay-tabs" data-testid="billpay-tabs">
        <button className={tab === "schedules" ? "active" : ""} onClick={() => setTab("schedules")} data-testid="tab-schedules">
          <CalendarClock size={14} /> Schedules
        </button>
        <button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")} data-testid="tab-history">
          <History size={14} /> Payment History
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="billpay-form-card" data-testid="billpay-form">
          <h3>{editId ? "Edit Schedule" : "New Bill Schedule"}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-grid-2col">
              <div className="form-group">
                <label>Bill Name</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Electric Bill" required data-testid="bill-name-input" />
              </div>
              <div className="form-group">
                <label>Amount ($)</label>
                <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00" step="0.01" min="0.01" required data-testid="bill-amount-input" />
              </div>
              <div className="form-group">
                <label>Frequency</label>
                <select value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })} data-testid="bill-frequency-select">
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annually">Annually</option>
                </select>
              </div>
              <div className="form-group">
                <label>Day of Month</label>
                <input type="number" value={form.day_of_month} onChange={e => setForm({ ...form, day_of_month: e.target.value })}
                  min="1" max="28" data-testid="bill-day-input" />
              </div>
              <div className="form-group">
                <label>Payment Account</label>
                <select value={form.account_id} onChange={e => setForm({ ...form, account_id: e.target.value })} data-testid="bill-account-select">
                  <option value="">No linked account</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.account_type})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Category</label>
                <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} data-testid="bill-category-select">
                  <option value="">No category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Type</label>
                <select value={form.source_type} onChange={e => setForm({ ...form, source_type: e.target.value })} data-testid="bill-type-select">
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                  <option value="debt_payment">Debt Payment</option>
                </select>
              </div>
              <div className="form-group" style={{ display: "flex", alignItems: "end", gap: "0.5rem" }}>
                <label className="checkbox-label">
                  <input type="checkbox" checked={form.enabled} onChange={e => setForm({ ...form, enabled: e.target.checked })} />
                  Auto-pay enabled
                </label>
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary btn-sm" data-testid="save-schedule-btn">
                {editId ? "Update" : "Create"} Schedule
              </button>
              <button type="button" className="btn-sm btn-ghost" onClick={resetForm} data-testid="cancel-schedule-btn">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loading-state">Loading bill schedules...</div>
      ) : (
        <>
          {/* Schedules Tab */}
          {tab === "schedules" && (
            <div className="billpay-list" data-testid="schedules-list">
              {schedules.length === 0 ? (
                <div className="empty-state" data-testid="empty-schedules">
                  <CalendarClock size={48} className="text-muted" />
                  <h3>No Bill Schedules</h3>
                  <p>Create your first automated bill payment schedule</p>
                </div>
              ) : (
                schedules.map(s => {
                  const isDue = s.enabled && s.next_payment_date <= new Date().toISOString().slice(0, 10);
                  return (
                    <div key={s.id} className={`billpay-card ${!s.enabled ? "disabled" : ""} ${isDue ? "due" : ""}`} data-testid={`schedule-${s.id}`}>
                      <div className="billpay-card-main">
                        <div className="billpay-card-left">
                          <div className={`billpay-status-dot ${s.enabled ? (isDue ? "due" : "active") : "inactive"}`} />
                          <div className="billpay-info">
                            <h4>{s.name}</h4>
                            <div className="billpay-meta">
                              <span className="billpay-freq">{s.frequency}</span>
                              <span className="billpay-sep">|</span>
                              <span>Day {s.day_of_month}</span>
                              {s.account_name && <><span className="billpay-sep">|</span><span>{s.account_name}</span></>}
                            </div>
                          </div>
                        </div>
                        <div className="billpay-card-right">
                          <div className="billpay-amount">
                            <DollarSign size={16} />
                            <span>{s.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="billpay-dates">
                            <span className={isDue ? "text-warning" : "text-muted"}>Next: {s.next_payment_date || "N/A"}</span>
                            {s.last_paid_date && <span className="text-muted">Last: {s.last_paid_date}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="billpay-card-actions">
                        <span className="billpay-paid-count">{s.payment_count || 0} payments (${(s.total_paid || 0).toLocaleString()})</span>
                        <div className="billpay-btns">
                          <button className="btn-icon-sm" title="Pay Now" onClick={() => handlePayNow(s.id)}
                            disabled={processing === s.id} data-testid={`paynow-${s.id}`}>
                            {processing === s.id ? <RefreshCw size={14} className="spin" /> : <Play size={14} />}
                          </button>
                          <button className="btn-icon-sm" title={s.enabled ? "Disable" : "Enable"}
                            onClick={() => handleToggle(s.id)} data-testid={`toggle-${s.id}`}>
                            {s.enabled ? <Power size={14} className="text-green" /> : <PowerOff size={14} className="text-muted" />}
                          </button>
                          <button className="btn-icon-sm" title="Edit" onClick={() => startEdit(s)} data-testid={`edit-${s.id}`}>
                            <Pencil size={14} />
                          </button>
                          <button className="btn-icon-sm btn-danger-icon" title="Delete" onClick={() => handleDelete(s.id)} data-testid={`delete-${s.id}`}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* History Tab */}
          {tab === "history" && (
            <div className="billpay-history" data-testid="payment-history">
              {history.length === 0 ? (
                <div className="empty-state">
                  <History size={48} className="text-muted" />
                  <h3>No Payment History</h3>
                  <p>Payments will appear here once bills are processed</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Type</th>
                        <th style={{ textAlign: "right" }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map(tx => (
                        <tr key={tx.id}>
                          <td>{tx.date ? new Date(tx.date).toLocaleDateString() : "N/A"}</td>
                          <td>{tx.description}</td>
                          <td>
                            <span className={`badge-sm ${tx.source_type === "bill_schedule_auto" ? "badge-amber" : "badge-blue"}`}>
                              {tx.source_type === "bill_schedule_auto" ? "Auto" : "Manual"}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }} className={tx.transaction_type === "income" ? "text-green" : "text-red"}>
                            {tx.transaction_type === "income" ? "+" : "-"}${tx.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
