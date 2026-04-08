import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { Plus, Trash2, Edit2, X, Receipt } from "lucide-react";

export default function ExpensesPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [expRes, catRes] = await Promise.all([api.get("/expenses/"), api.get("/categories/")]);
      setItems(expRes.data); setCategories(catRes.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this expense?")) return;
    await api.delete(`/expenses/${id}`); fetchData();
  };

  const handlePay = async (id) => {
    try { await api.post(`/expenses/${id}/pay`); fetchData(); alert("Expense paid!"); }
    catch (e) { alert(e.response?.data?.detail || "Error"); }
  };

  const handleSave = async (data) => {
    try {
      if (editing) await api.put(`/expenses/${editing.id}`, data);
      else await api.post("/expenses/", data);
      setShowForm(false); setEditing(null); fetchData();
    } catch (e) { alert(e.response?.data?.detail || "Error"); }
  };

  const catName = (id) => categories.find(c => c.id === id)?.name || "";
  const totalMonthly = items.filter(i => i.is_recurring).reduce((s, i) => s + (i.amount || 0), 0);

  return (
    <div className="page-content" data-testid="expenses-page">
      <div className="page-header">
        <h2>Expenses</h2>
        <div className="header-stats">
          <span className="badge-red">Monthly: ${totalMonthly.toLocaleString()}</span>
        </div>
        <button className="btn-primary" onClick={() => { setEditing(null); setShowForm(true); }} data-testid="add-expense-btn">
          <Plus size={16} /> Add Expense
        </button>
      </div>
      {loading ? <div className="page-loading">Loading...</div> : items.length === 0 ? (
        <div className="empty-state" data-testid="expenses-empty">No expenses yet. Track your first expense!</div>
      ) : (
        <div className="items-list">
          {items.map(item => (
            <div key={item.id} className="item-card" data-testid={`expense-${item.id}`}>
              <div className="item-info">
                <div className="item-title-row">
                  <h3>{item.name}</h3>
                  {item.is_recurring && <span className="badge-sm">Recurring</span>}
                </div>
                <p>{catName(item.category_id)}{item.frequency ? ` | ${item.frequency}` : ""}</p>
                <p className="balance text-red">${item.amount?.toLocaleString()}</p>
                {item.next_due_date && <p className="text-muted">Next due: {item.next_due_date?.slice(0, 10)}</p>}
              </div>
              <div className="item-actions">
                <button className="btn-sm btn-warning" onClick={() => handlePay(item.id)} title="Mark as paid" data-testid={`pay-${item.id}`}>
                  <Receipt size={14} /> Pay
                </button>
                <button className="btn-sm" onClick={() => { setEditing(item); setShowForm(true); }}>
                  <Edit2 size={14} />
                </button>
                <button className="btn-sm btn-danger" onClick={() => handleDelete(item.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {showForm && <ExpenseForm initial={editing} categories={categories} onSave={handleSave} onClose={() => { setShowForm(false); setEditing(null); }} />}
    </div>
  );
}

function ExpenseForm({ initial, categories, onSave, onClose }) {
  const [name, setName] = useState(initial?.name || "");
  const [amount, setAmount] = useState(initial?.amount || "");
  const [isRecurring, setIsRecurring] = useState(initial?.is_recurring ?? true);
  const [frequency, setFrequency] = useState(initial?.frequency || "monthly");
  const [nextDueDate, setNextDueDate] = useState(initial?.next_due_date?.slice(0, 10) || "");
  const [categoryId, setCategoryId] = useState(initial?.category_id || "");
  const [description, setDescription] = useState(initial?.description || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ name, amount: parseFloat(amount) || 0, is_recurring: isRecurring, frequency: isRecurring ? frequency : null,
             next_due_date: nextDueDate ? new Date(nextDueDate).toISOString() : null,
             category_id: categoryId || null, description: description || null });
  };

  return (
    <div className="modal-overlay" onClick={onClose} data-testid="expense-modal">
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{initial ? "Edit Expense" : "Add Expense"}</h2>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form" data-testid="expense-form">
          <input type="text" placeholder="Expense Name" value={name} onChange={e => setName(e.target.value)} required />
          <input type="number" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} step="0.01" required />
          <select value={categoryId} onChange={e => setCategoryId(e.target.value)}>
            <option value="">Select Category</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <label className="checkbox-label">
            <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} /> Recurring expense
          </label>
          {isRecurring && (
            <select value={frequency} onChange={e => setFrequency(e.target.value)}>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          )}
          <input type="date" placeholder="Next Due Date" value={nextDueDate} onChange={e => setNextDueDate(e.target.value)} />
          <input type="text" placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} />
          <div className="form-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit" data-testid="expense-submit-btn">{initial ? "Update" : "Create"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
