import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { Plus, Trash2, Edit2, X } from "lucide-react";

export default function AccountsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get("/accounts/"); setItems(r.data); } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this account?")) return;
    await api.delete(`/accounts/${id}`); fetch();
  };

  const handleSave = async (data) => {
    try {
      if (editing) await api.put(`/accounts/${editing.id}`, data);
      else await api.post("/accounts/", data);
      setShowForm(false); setEditing(null); fetch();
    } catch (e) { alert(e.response?.data?.detail || "Error"); }
  };

  const total = items.reduce((s, a) => s + (a.balance || 0), 0);

  return (
    <div className="page-content" data-testid="accounts-page">
      <div className="page-header">
        <h2>Accounts</h2>
        <div className="header-stats">
          <span className={total >= 0 ? "badge-green" : "badge-red"}>Total: ${total.toLocaleString()}</span>
        </div>
        <button className="btn-primary" onClick={() => { setEditing(null); setShowForm(true); }} data-testid="add-account-btn">
          <Plus size={16} /> Add Account
        </button>
      </div>
      {loading ? <div className="page-loading">Loading...</div> : items.length === 0 ? (
        <div className="empty-state" data-testid="accounts-empty">No accounts yet.</div>
      ) : (
        <div className="items-list">
          {items.map(item => (
            <div key={item.id} className="item-card" data-testid={`account-${item.id}`}>
              <div className="item-info">
                <h3>{item.name}</h3>
                <p>Type: {item.account_type}{item.institution ? ` | ${item.institution}` : ""}</p>
                <p className={`balance ${item.balance >= 0 ? 'text-green' : 'text-red'}`}>
                  {item.currency} {item.balance?.toLocaleString()}
                </p>
              </div>
              <div className="item-actions">
                <button className="btn-sm" onClick={() => { setEditing(item); setShowForm(true); }}><Edit2 size={14} /></button>
                <button className="btn-sm btn-danger" onClick={() => handleDelete(item.id)}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {showForm && <AccountForm initial={editing} onSave={handleSave} onClose={() => { setShowForm(false); setEditing(null); }} />}
    </div>
  );
}

function AccountForm({ initial, onSave, onClose }) {
  const [name, setName] = useState(initial?.name || "");
  const [accountType, setAccountType] = useState(initial?.account_type || "checking");
  const [institution, setInstitution] = useState(initial?.institution || "");
  const [balance, setBalance] = useState(initial?.balance || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ name, account_type: accountType, institution: institution || null, balance: parseFloat(balance) || 0, currency: "USD" });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{initial ? "Edit Account" : "Add Account"}</h2>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form" data-testid="account-form">
          <input type="text" placeholder="Account Name" value={name} onChange={e => setName(e.target.value)} required data-testid="account-name-input" />
          <select value={accountType} onChange={e => setAccountType(e.target.value)} data-testid="account-type-select">
            <option value="checking">Checking</option>
            <option value="savings">Savings</option>
            <option value="credit_card">Credit Card</option>
            <option value="investment">Investment</option>
            <option value="loan">Loan</option>
            <option value="other">Other</option>
          </select>
          <input type="text" placeholder="Institution (optional)" value={institution} onChange={e => setInstitution(e.target.value)} />
          <input type="number" placeholder="Balance" value={balance} onChange={e => setBalance(e.target.value)} step="0.01" data-testid="account-balance-input" />
          <div className="form-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit" data-testid="account-submit-btn">{initial ? "Update" : "Create"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
