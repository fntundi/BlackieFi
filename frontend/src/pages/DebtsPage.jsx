import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { Plus, Trash2, Edit2, X, CreditCard } from "lucide-react";

export default function DebtsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [paymentModal, setPaymentModal] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get("/debts/"); setItems(r.data); } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this debt?")) return;
    await api.delete(`/debts/${id}`); fetch();
  };

  const handleSave = async (data) => {
    try {
      if (editing) await api.put(`/debts/${editing.id}`, data);
      else await api.post("/debts/", data);
      setShowForm(false); setEditing(null); fetch();
    } catch (e) { alert(e.response?.data?.detail || "Error"); }
  };

  const handlePayment = async (id, amount) => {
    try { await api.post(`/debts/${id}/payment?amount=${amount}`); setPaymentModal(null); fetch(); alert("Payment recorded!"); }
    catch (e) { alert(e.response?.data?.detail || "Error"); }
  };

  const totalDebt = items.reduce((s, d) => s + (d.current_balance || 0), 0);

  return (
    <div className="page-content" data-testid="debts-page">
      <div className="page-header">
        <h2>Debt Management</h2>
        <div className="header-stats">
          <span className="badge-red">Total: ${totalDebt.toLocaleString()}</span>
        </div>
        <button className="btn-primary" onClick={() => { setEditing(null); setShowForm(true); }} data-testid="add-debt-btn">
          <Plus size={16} /> Add Debt
        </button>
      </div>
      {loading ? <div className="page-loading">Loading...</div> : items.length === 0 ? (
        <div className="empty-state" data-testid="debts-empty">No debts tracked. Add a debt to start managing it!</div>
      ) : (
        <div className="items-list">
          {items.map(item => {
            const progress = item.original_amount > 0 ? ((item.original_amount - item.current_balance) / item.original_amount) * 100 : 0;
            return (
              <div key={item.id} className="item-card" data-testid={`debt-${item.id}`}>
                <div className="item-info" style={{flex: 1}}>
                  <div className="item-title-row">
                    <h3>{item.name}</h3>
                    <span className="badge-sm">{item.debt_type}</span>
                  </div>
                  <p>Rate: {item.interest_rate}% | Min Payment: ${item.minimum_payment?.toLocaleString() || 0}</p>
                  <p className="balance text-red">Balance: ${item.current_balance?.toLocaleString()}</p>
                  <div className="progress-bar-container">
                    <div className="progress-bar" style={{width: `${progress}%`}} />
                    <span className="progress-label">{progress.toFixed(0)}% paid off</span>
                  </div>
                  {item.due_date && <p className="text-muted">Next due: {item.due_date?.slice(0, 10)}</p>}
                </div>
                <div className="item-actions">
                  <button className="btn-sm btn-success" onClick={() => setPaymentModal(item)} data-testid={`pay-debt-${item.id}`}>
                    <CreditCard size={14} /> Pay
                  </button>
                  <button className="btn-sm" onClick={() => { setEditing(item); setShowForm(true); }}>
                    <Edit2 size={14} />
                  </button>
                  <button className="btn-sm btn-danger" onClick={() => handleDelete(item.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {showForm && <DebtForm initial={editing} onSave={handleSave} onClose={() => { setShowForm(false); setEditing(null); }} />}
      {paymentModal && <PaymentModal debt={paymentModal} onPay={handlePayment} onClose={() => setPaymentModal(null)} />}
    </div>
  );
}

function DebtForm({ initial, onSave, onClose }) {
  const [name, setName] = useState(initial?.name || "");
  const [debtType, setDebtType] = useState(initial?.debt_type || "loan");
  const [originalAmount, setOriginalAmount] = useState(initial?.original_amount || "");
  const [currentBalance, setCurrentBalance] = useState(initial?.current_balance || "");
  const [interestRate, setInterestRate] = useState(initial?.interest_rate || "");
  const [minimumPayment, setMinimumPayment] = useState(initial?.minimum_payment || "");
  const [dueDate, setDueDate] = useState(initial?.due_date?.slice(0, 10) || "");
  const [frequency, setFrequency] = useState(initial?.frequency || "monthly");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ name, debt_type: debtType, original_amount: parseFloat(originalAmount) || 0,
             current_balance: parseFloat(currentBalance) || 0, interest_rate: parseFloat(interestRate) || 0,
             minimum_payment: parseFloat(minimumPayment) || null,
             due_date: dueDate ? new Date(dueDate).toISOString() : null, frequency });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{initial ? "Edit Debt" : "Add Debt"}</h2>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form" data-testid="debt-form">
          <input type="text" placeholder="Debt Name" value={name} onChange={e => setName(e.target.value)} required />
          <select value={debtType} onChange={e => setDebtType(e.target.value)}>
            <option value="loan">Loan</option>
            <option value="credit_card">Credit Card</option>
            <option value="line_of_credit">Line of Credit</option>
            <option value="other">Other</option>
          </select>
          <input type="number" placeholder="Original Amount" value={originalAmount} onChange={e => setOriginalAmount(e.target.value)} step="0.01" required />
          <input type="number" placeholder="Current Balance" value={currentBalance} onChange={e => setCurrentBalance(e.target.value)} step="0.01" required />
          <input type="number" placeholder="Interest Rate %" value={interestRate} onChange={e => setInterestRate(e.target.value)} step="0.01" />
          <input type="number" placeholder="Minimum Payment" value={minimumPayment} onChange={e => setMinimumPayment(e.target.value)} step="0.01" />
          <select value={frequency} onChange={e => setFrequency(e.target.value)}>
            <option value="monthly">Monthly</option>
            <option value="biweekly">Bi-weekly</option>
            <option value="weekly">Weekly</option>
          </select>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          <div className="form-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit" data-testid="debt-submit-btn">{initial ? "Update" : "Create"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PaymentModal({ debt, onPay, onClose }) {
  const [amount, setAmount] = useState(debt.minimum_payment || "");
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Make Payment: {debt.name}</h2>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-form">
          <p className="text-muted">Current Balance: ${debt.current_balance?.toLocaleString()}</p>
          <input type="number" placeholder="Payment Amount" value={amount} onChange={e => setAmount(e.target.value)} step="0.01" data-testid="payment-amount-input" />
          <div className="form-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="button" onClick={() => onPay(debt.id, parseFloat(amount) || 0)} data-testid="payment-submit-btn">Record Payment</button>
          </div>
        </div>
      </div>
    </div>
  );
}
