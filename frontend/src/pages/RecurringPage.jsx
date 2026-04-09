import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { RefreshCw, Play, Clock, DollarSign, CreditCard, Receipt, CheckCircle, AlertTriangle } from "lucide-react";

export default function RecurringPage() {
  const [status, setStatus] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, settingsRes] = await Promise.all([
        api.get("/recurring/status"),
        api.get("/recurring/settings")
      ]);
      setStatus(statusRes.data);
      setSettings(settingsRes.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleProcess = async () => {
    if (!window.confirm("Process all due recurring transactions now?")) return;
    setProcessing(true);
    setResult(null);
    try {
      const res = await api.post("/recurring/process");
      setResult(res.data);
      fetchData(); // Refresh status
    } catch (e) {
      alert(e.response?.data?.detail || "Error processing transactions");
    }
    setProcessing(false);
  };

  const handleUpdateSettings = async (autoProcess, notifyDays) => {
    try {
      await api.put(`/recurring/settings?auto_process=${autoProcess}&notify_before_days=${notifyDays}`);
      setSettings({ ...settings, auto_process: autoProcess, notify_before_days: notifyDays });
    } catch (e) {
      alert("Error updating settings");
    }
  };

  const totalDue = status?.total_due || 0;
  const hasItemsDue = totalDue > 0;

  return (
    <div className="page-content" data-testid="recurring-page">
      <div className="page-header">
        <h2><Clock size={24} /> Recurring Transactions</h2>
        <button className="btn-icon" onClick={fetchData} data-testid="refresh-recurring">
          <RefreshCw size={16} />
        </button>
      </div>

      {loading ? (
        <div className="loading-state">Loading recurring status...</div>
      ) : (
        <>
          {/* Status Overview */}
          <div className="recurring-status-card" data-testid="recurring-status">
            <div className="status-header">
              <div className={`status-indicator ${hasItemsDue ? 'warning' : 'success'}`}>
                {hasItemsDue ? <AlertTriangle size={24} /> : <CheckCircle size={24} />}
              </div>
              <div className="status-text">
                <h3>{hasItemsDue ? `${totalDue} Items Due` : 'All Caught Up!'}</h3>
                <p>{hasItemsDue ? 'You have recurring transactions ready to process' : 'No recurring transactions are due today'}</p>
              </div>
            </div>
            {hasItemsDue && (
              <button
                className="btn-primary btn-lg"
                onClick={handleProcess}
                disabled={processing}
                data-testid="process-all-btn"
              >
                {processing ? (
                  <><RefreshCw size={18} className="spin" /> Processing...</>
                ) : (
                  <><Play size={18} /> Process All Due ({totalDue})</>
                )}
              </button>
            )}
          </div>

          {/* Process Result */}
          {result && (
            <div className="result-card success" data-testid="process-result">
              <CheckCircle size={20} />
              <div className="result-content">
                <strong>Processed {result.total_processed} transactions</strong>
                {result.processed?.income?.length > 0 && (
                  <p>Income: {result.processed.income.join(", ")}</p>
                )}
                {result.processed?.expenses?.length > 0 && (
                  <p>Expenses: {result.processed.expenses.join(", ")}</p>
                )}
                {result.processed?.debts?.length > 0 && (
                  <p>Debt Payments: {result.processed.debts.join(", ")}</p>
                )}
              </div>
              <button className="btn-icon" onClick={() => setResult(null)}>&times;</button>
            </div>
          )}

          {/* Due Items Grid */}
          <div className="recurring-grid">
            {/* Due Income */}
            <div className="recurring-section" data-testid="due-income-section">
              <div className="section-header">
                <DollarSign size={18} className="text-green" />
                <h3>Income Due ({status?.due_income?.length || 0})</h3>
              </div>
              {status?.due_income?.length > 0 ? (
                <div className="due-items-list">
                  {status.due_income.map((item) => (
                    <div key={item.id} className="due-item income">
                      <div className="item-info">
                        <span className="item-name">{item.name}</span>
                        <span className="item-date">{item.date || 'Due today'}</span>
                      </div>
                      <span className="item-amount positive">+${item.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-section">No income due</div>
              )}
            </div>

            {/* Due Expenses */}
            <div className="recurring-section" data-testid="due-expenses-section">
              <div className="section-header">
                <Receipt size={18} className="text-red" />
                <h3>Expenses Due ({status?.due_expenses?.length || 0})</h3>
              </div>
              {status?.due_expenses?.length > 0 ? (
                <div className="due-items-list">
                  {status.due_expenses.map((item) => (
                    <div key={item.id} className="due-item expense">
                      <div className="item-info">
                        <span className="item-name">{item.name}</span>
                        <span className="item-date">{item.date || 'Due today'}</span>
                      </div>
                      <span className="item-amount negative">-${item.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-section">No expenses due</div>
              )}
            </div>

            {/* Due Debt Payments */}
            <div className="recurring-section" data-testid="due-debts-section">
              <div className="section-header">
                <CreditCard size={18} className="text-amber" />
                <h3>Debt Payments Due ({status?.due_debts?.length || 0})</h3>
              </div>
              {status?.due_debts?.length > 0 ? (
                <div className="due-items-list">
                  {status.due_debts.map((item) => (
                    <div key={item.id} className="due-item debt">
                      <div className="item-info">
                        <span className="item-name">{item.name}</span>
                        <span className="item-date">{item.date || 'Due today'}</span>
                      </div>
                      <span className="item-amount negative">-${item.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-section">No debt payments due</div>
              )}
            </div>
          </div>

          {/* Settings */}
          <div className="recurring-settings" data-testid="recurring-settings">
            <h3>Settings</h3>
            <div className="settings-row">
              <label>
                <input
                  type="checkbox"
                  checked={settings?.auto_process || false}
                  onChange={(e) => handleUpdateSettings(e.target.checked, settings?.notify_before_days || 3)}
                />
                Enable auto-processing at midnight UTC
              </label>
            </div>
            <div className="settings-row">
              <label>Notify me</label>
              <select
                value={settings?.notify_before_days || 3}
                onChange={(e) => handleUpdateSettings(settings?.auto_process || false, parseInt(e.target.value))}
              >
                <option value={1}>1 day before</option>
                <option value={2}>2 days before</option>
                <option value={3}>3 days before</option>
                <option value={5}>5 days before</option>
                <option value={7}>7 days before</option>
              </select>
              <span>before due date</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
