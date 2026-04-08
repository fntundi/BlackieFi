import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { Plus, Trash2, Edit2, Check, X, DollarSign } from "lucide-react";

export default function IncomePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get("/income/"); setItems(r.data); } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this income source?")) return;
    await api.delete(`/income/${id}`); fetch();
  };

  const handleReceive = async (id) => {
    try { await api.post(`/income/${id}/receive`); fetch(); alert("Income received!"); }
    catch (e) { alert(e.response?.data?.detail || "Error"); }
  };

  const handleSave = async (data) => {
    try {
      if (editing) { await api.put(`/income/${editing.id}`, data); }
      else { await api.post("/income/", data); }
      setShowForm(false); setEditing(null); fetch();
    } catch (e) { alert(e.response?.data?.detail || "Error"); }
  };

  return (
    <div className="page-content" data-testid="income-page">
      <div className="page-header">
        <h2>Income Sources</h2>
        <button className="btn-primary" onClick={() => { setEditing(null); setShowForm(true); }} data-testid="add-income-btn">
          <Plus size={16} /> Add Income
        </button>
      </div>
      {loading ? <div className="page-loading">Loading...</div> : items.length === 0 ? (
        <div className="empty-state" data-testid="income-empty">No income sources yet. Add your first income!</div>
      ) : (
        <div className="items-list">
          {items.map(item => (
            <div key={item.id} className="item-card" data-testid={`income-${item.id}`}>
              <div className="item-info">
                <h3>{item.name}</h3>
                <p>Type: {item.income_type} | Freq: {item.frequency}</p>
                <p className="balance">${item.amount?.toLocaleString()}{item.is_variable ? " (variable)" : ""}</p>
                {item.next_pay_date && <p className="text-muted">Next: {item.next_pay_date?.slice(0, 10)}</p>}
              </div>
              <div className="item-actions">
                <button className="btn-sm btn-success" onClick={() => handleReceive(item.id)} title="Mark as received" data-testid={`receive-${item.id}`}>
                  <DollarSign size={14} /> Receive
                </button>
                <button className="btn-sm" onClick={() => { setEditing(item); setShowForm(true); }} data-testid={`edit-income-${item.id}`}>
                  <Edit2 size={14} />
                </button>
                <button className="btn-sm btn-danger" onClick={() => handleDelete(item.id)} data-testid={`delete-income-${item.id}`}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {showForm && <IncomeForm initial={editing} onSave={handleSave} onClose={() => { setShowForm(false); setEditing(null); }} />}
    </div>
  );
}

function IncomeForm({ initial, onSave, onClose }) {
  const [name, setName] = useState(initial?.name || "");
  const [incomeType, setIncomeType] = useState(initial?.income_type || "salary");
  const [amount, setAmount] = useState(initial?.amount || "");
  const [frequency, setFrequency] = useState(initial?.frequency || "monthly");
  const [nextPayDate, setNextPayDate] = useState(initial?.next_pay_date?.slice(0, 10) || "");
  const [isVariable, setIsVariable] = useState(initial?.is_variable || false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ name, income_type: incomeType, amount: parseFloat(amount) || 0, frequency,
             next_pay_date: nextPayDate ? new Date(nextPayDate).toISOString() : null, is_variable: isVariable });
  };

  return (
    <div className="modal-overlay" onClick={onClose} data-testid="income-modal">
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{initial ? "Edit Income" : "Add Income"}</h2>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form" data-testid="income-form">
          <input type="text" placeholder="Income Name" value={name} onChange={e => setName(e.target.value)} required data-testid="income-name-input" />
          <select value={incomeType} onChange={e => setIncomeType(e.target.value)} data-testid="income-type-select">
            <option value="salary">Salary</option>
            <option value="freelance">Freelance</option>
            <option value="rental">Rental</option>
            <option value="other">Other</option>
          </select>
          <input type="number" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} step="0.01" required data-testid="income-amount-input" />
          <select value={frequency} onChange={e => setFrequency(e.target.value)} data-testid="income-freq-select">
            <option value="weekly">Weekly</option>
            <option value="biweekly">Bi-weekly</option>
            <option value="semimonthly">Semi-monthly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
          <input type="date" placeholder="Next Pay Date" value={nextPayDate} onChange={e => setNextPayDate(e.target.value)} data-testid="income-date-input" />
          <label className="checkbox-label">
            <input type="checkbox" checked={isVariable} onChange={e => setIsVariable(e.target.checked)} /> Variable amount
          </label>
          <div className="form-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit" data-testid="income-submit-btn">{initial ? "Update" : "Create"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
