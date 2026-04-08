import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { Plus, Trash2, Copy, X, ChevronLeft, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function BudgetPage() {
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, cRes] = await Promise.all([api.get(`/budgets/?year=${year}`), api.get("/categories/")]);
      setBudgets(bRes.data); setCategories(cRes.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async (data) => {
    try {
      if (editing) await api.put(`/budgets/${editing.id}`, data);
      else await api.post("/budgets/", data);
      setShowForm(false); setEditing(null); fetchData();
    } catch (e) { alert(e.response?.data?.detail || "Error"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this budget?")) return;
    await api.delete(`/budgets/${id}`); fetchData();
  };

  const handleCopy = async (bid) => {
    const targetMonth = prompt("Copy to month (1-12):");
    const targetYear = prompt("Copy to year:", String(year));
    if (!targetMonth || !targetYear) return;
    try {
      await api.post(`/budgets/${bid}/copy?target_month=${targetMonth}&target_year=${targetYear}`);
      fetchData(); alert("Budget copied!");
    } catch (e) { alert(e.response?.data?.detail || "Error"); }
  };

  const currentBudget = budgets.find(b => b.month === selectedMonth && b.year === year);
  const chartData = currentBudget?.items?.map(item => ({
    name: item.category_name || "Other",
    planned: item.planned_amount || 0,
  })) || [];

  return (
    <div className="page-content" data-testid="budget-page">
      <div className="page-header">
        <h2>Budgets</h2>
        <button className="btn-primary" onClick={() => { setEditing(null); setShowForm(true); }} data-testid="add-budget-btn">
          <Plus size={16} /> New Budget
        </button>
      </div>

      <div className="year-nav">
        <button onClick={() => setYear(y => y - 1)} data-testid="prev-year"><ChevronLeft size={18} /></button>
        <span className="year-label">{year}</span>
        <button onClick={() => setYear(y => y + 1)} data-testid="next-year"><ChevronRight size={18} /></button>
      </div>

      <div className="months-grid">
        {MONTHS.map((m, i) => {
          const budget = budgets.find(b => b.month === i + 1);
          return (
            <button key={i} className={`month-btn ${selectedMonth === i + 1 ? 'active' : ''} ${budget ? 'has-budget' : ''}`}
                    onClick={() => setSelectedMonth(i + 1)} data-testid={`month-${i + 1}`}>
              {m}
              {budget && <span className="month-dot" />}
            </button>
          );
        })}
      </div>

      {loading ? <div className="page-loading">Loading...</div> : currentBudget ? (
        <div className="budget-detail" data-testid="budget-detail">
          <div className="budget-header-row">
            <h3>{MONTHS[selectedMonth - 1]} {year} Budget</h3>
            <div className="item-actions">
              <button className="btn-sm" onClick={() => { setEditing(currentBudget); setShowForm(true); }}>Edit</button>
              <button className="btn-sm" onClick={() => handleCopy(currentBudget.id)}><Copy size={14} /> Copy</button>
              <button className="btn-sm btn-danger" onClick={() => handleDelete(currentBudget.id)}><Trash2 size={14} /></button>
            </div>
          </div>

          {chartData.length > 0 && (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData} margin={{top: 10, right: 10, left: 0, bottom: 0}}>
                <XAxis dataKey="name" tick={{fill: '#94a3b8', fontSize: 11}} angle={-30} textAnchor="end" height={60} />
                <YAxis tick={{fill: '#94a3b8', fontSize: 11}} />
                <Tooltip contentStyle={{background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f8fafc'}} />
                <Bar dataKey="planned" fill="#f59e0b" radius={[4,4,0,0]} name="Planned" />
              </BarChart>
            </ResponsiveContainer>
          )}

          <div className="budget-items-list">
            {currentBudget.items?.map((item, i) => (
              <div key={i} className="budget-item-row">
                <span>{item.category_name || "Other"}</span>
                <span className="budget-amount">${(item.planned_amount || 0).toLocaleString()}</span>
              </div>
            ))}
            <div className="budget-item-row total">
              <span>Total</span>
              <span className="budget-amount">${currentBudget.items?.reduce((s, i) => s + (i.planned_amount || 0), 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="empty-state">No budget for {MONTHS[selectedMonth - 1]} {year}. Create one!</div>
      )}

      {showForm && <BudgetForm initial={editing} month={selectedMonth} year={year} categories={categories}
                               onSave={handleSave} onClose={() => { setShowForm(false); setEditing(null); }} />}
    </div>
  );
}

function BudgetForm({ initial, month, year, categories, onSave, onClose }) {
  const [m, setM] = useState(initial?.month || month);
  const [y, setY] = useState(initial?.year || year);
  const [items, setItems] = useState(
    initial?.items?.length > 0
      ? initial.items.map(i => ({ category_id: i.category_id, category_name: i.category_name, planned_amount: i.planned_amount }))
      : categories.slice(0, 6).map(c => ({ category_id: c.id, category_name: c.name, planned_amount: 0 }))
  );

  const updateItem = (idx, field, value) => {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: field === "planned_amount" ? parseFloat(value) || 0 : value };
    setItems(next);
  };

  const addItem = () => setItems([...items, { category_id: "", category_name: "", planned_amount: 0 }]);
  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{initial ? "Edit Budget" : "New Budget"}</h2>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave({ month: m, year: y, items }); }} className="modal-form" data-testid="budget-form">
          <div className="form-row">
            <select value={m} onChange={e => setM(parseInt(e.target.value))}>
              {MONTHS.map((mn, i) => <option key={i} value={i + 1}>{mn}</option>)}
            </select>
            <input type="number" value={y} onChange={e => setY(parseInt(e.target.value))} />
          </div>
          <div className="budget-items-edit">
            {items.map((item, i) => (
              <div key={i} className="form-row">
                <select value={item.category_id} onChange={e => {
                  const cat = categories.find(c => c.id === e.target.value);
                  updateItem(i, "category_id", e.target.value);
                  if (cat) updateItem(i, "category_name", cat.name);
                }}>
                  <option value="">Select Category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input type="number" placeholder="Amount" value={item.planned_amount} onChange={e => updateItem(i, "planned_amount", e.target.value)} step="0.01" />
                <button type="button" className="btn-icon btn-danger-icon" onClick={() => removeItem(i)}><Trash2 size={14} /></button>
              </div>
            ))}
            <button type="button" className="btn-sm" onClick={addItem}><Plus size={14} /> Add Category</button>
          </div>
          <div className="form-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit" data-testid="budget-submit-btn">{initial ? "Update" : "Create"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
