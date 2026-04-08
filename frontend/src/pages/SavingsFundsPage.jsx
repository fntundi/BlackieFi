import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { Plus, Trash2, Edit2, X, Target } from "lucide-react";

export default function SavingsFundsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [contributeModal, setContributeModal] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get("/savings-funds/"); setItems(r.data); } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this fund?")) return;
    await api.delete(`/savings-funds/${id}`); fetch();
  };

  const handleSave = async (data) => {
    try {
      if (editing) await api.put(`/savings-funds/${editing.id}`, data);
      else await api.post("/savings-funds/", data);
      setShowForm(false); setEditing(null); fetch();
    } catch (e) { alert(e.response?.data?.detail || "Error"); }
  };

  const handleContribute = async (id, amount) => {
    try {
      await api.post(`/savings-funds/${id}/contribute?amount=${amount}`);
      setContributeModal(null); fetch(); alert("Contribution recorded!");
    } catch (e) { alert(e.response?.data?.detail || "Error"); }
  };

  return (
    <div className="page-content" data-testid="savings-page">
      <div className="page-header">
        <h2>Savings Goals</h2>
        <button className="btn-primary" onClick={() => { setEditing(null); setShowForm(true); }} data-testid="add-fund-btn">
          <Plus size={16} /> New Fund
        </button>
      </div>
      {loading ? <div className="page-loading">Loading...</div> : items.length === 0 ? (
        <div className="empty-state" data-testid="savings-empty">No savings goals yet. Start saving for something!</div>
      ) : (
        <div className="savings-grid">
          {items.map(item => {
            const pct = item.target_amount > 0 ? (item.current_amount / item.target_amount) * 100 : 0;
            return (
              <div key={item.id} className="savings-card" data-testid={`fund-${item.id}`}>
                <div className="savings-header">
                  <Target size={20} className="text-amber" />
                  <h3>{item.name}</h3>
                </div>
                <div className="savings-progress">
                  <div className="progress-bar-container large">
                    <div className="progress-bar" style={{width: `${Math.min(100, pct)}%`}} />
                  </div>
                  <div className="savings-amounts">
                    <span>${item.current_amount?.toLocaleString()}</span>
                    <span className="text-muted">of ${item.target_amount?.toLocaleString()}</span>
                  </div>
                  <span className="savings-pct">{pct.toFixed(0)}%</span>
                </div>
                {item.target_date && <p className="text-muted">Target: {item.target_date?.slice(0, 10)}</p>}
                <div className="item-actions">
                  <button className="btn-sm btn-success" onClick={() => setContributeModal(item)} data-testid={`contribute-${item.id}`}>
                    + Contribute
                  </button>
                  <button className="btn-sm" onClick={() => { setEditing(item); setShowForm(true); }}><Edit2 size={14} /></button>
                  <button className="btn-sm btn-danger" onClick={() => handleDelete(item.id)}><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && <FundForm initial={editing} onSave={handleSave} onClose={() => { setShowForm(false); setEditing(null); }} />}
      {contributeModal && <ContributeModal fund={contributeModal} onContribute={handleContribute} onClose={() => setContributeModal(null)} />}
    </div>
  );
}

function FundForm({ initial, onSave, onClose }) {
  const [name, setName] = useState(initial?.name || "");
  const [targetAmount, setTargetAmount] = useState(initial?.target_amount || "");
  const [currentAmount, setCurrentAmount] = useState(initial?.current_amount || "");
  const [targetDate, setTargetDate] = useState(initial?.target_date?.slice(0, 10) || "");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{initial ? "Edit Fund" : "New Savings Fund"}</h2>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave({ name, target_amount: parseFloat(targetAmount) || 0,
          current_amount: parseFloat(currentAmount) || 0, target_date: targetDate ? new Date(targetDate).toISOString() : null }); }}
              className="modal-form" data-testid="fund-form">
          <input type="text" placeholder="Fund Name" value={name} onChange={e => setName(e.target.value)} required />
          <input type="number" placeholder="Target Amount" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} step="0.01" required />
          <input type="number" placeholder="Current Amount" value={currentAmount} onChange={e => setCurrentAmount(e.target.value)} step="0.01" />
          <input type="date" placeholder="Target Date" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
          <div className="form-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit" data-testid="fund-submit-btn">{initial ? "Update" : "Create"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ContributeModal({ fund, onContribute, onClose }) {
  const [amount, setAmount] = useState("");
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Contribute to {fund.name}</h2>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-form">
          <p className="text-muted">Current: ${fund.current_amount?.toLocaleString()} / ${fund.target_amount?.toLocaleString()}</p>
          <input type="number" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} step="0.01" data-testid="contribute-amount" />
          <div className="form-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="button" onClick={() => onContribute(fund.id, parseFloat(amount) || 0)} data-testid="contribute-submit">Contribute</button>
          </div>
        </div>
      </div>
    </div>
  );
}
