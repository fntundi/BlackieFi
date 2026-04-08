import { useState } from "react";
import { api } from "@/lib/api";
import { ArrowRight, ArrowLeft, Check, Plus, X, DollarSign, Receipt, CreditCard, Building2 } from "lucide-react";

const STEPS = [
  { key: "welcome", title: "Welcome to BlackieFi", icon: <DollarSign size={24} /> },
  { key: "income", title: "Add Income Sources", icon: <DollarSign size={24} /> },
  { key: "expenses", title: "Add Recurring Expenses", icon: <Receipt size={24} /> },
  { key: "debts", title: "Track Your Debts", icon: <CreditCard size={24} /> },
  { key: "business", title: "Add a Business (Optional)", icon: <Building2 size={24} /> },
];

export default function OnboardingPage({ onComplete }) {
  const [step, setStep] = useState(0);
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [debts, setDebts] = useState([]);
  const [businessName, setBusinessName] = useState("");
  const [saving, setSaving] = useState(false);

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStep(s => Math.max(s - 1, 0));

  const handleFinish = async () => {
    setSaving(true);
    try {
      for (const inc of incomes) {
        await api.post("/income/", { name: inc.name, income_type: inc.type, amount: parseFloat(inc.amount) || 0, frequency: inc.frequency });
      }
      for (const exp of expenses) {
        await api.post("/expenses/", { name: exp.name, amount: parseFloat(exp.amount) || 0, is_recurring: true, frequency: exp.frequency });
      }
      for (const d of debts) {
        await api.post("/debts/", { name: d.name, debt_type: d.type, original_amount: parseFloat(d.amount) || 0,
          current_balance: parseFloat(d.balance) || 0 });
      }
      if (businessName.trim()) {
        await api.post("/entities/", { name: businessName, entity_type: "business", business_type: "llc" });
      }
      await api.post("/onboarding/complete");
      onComplete();
    } catch (e) { alert(e.response?.data?.detail || "Error saving data"); }
    setSaving(false);
  };

  return (
    <div className="onboarding-overlay" data-testid="onboarding">
      <div className="onboarding-card">
        <div className="onboarding-progress">
          {STEPS.map((s, i) => (
            <div key={i} className={`progress-step ${i <= step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
              <span className="step-num">{i < step ? <Check size={14} /> : i + 1}</span>
            </div>
          ))}
        </div>

        <div className="onboarding-content">
          {step === 0 && (
            <div className="step-content" data-testid="onboarding-welcome">
              <h2>Welcome to BlackieFi</h2>
              <p>Let's set up your finances in a few quick steps. You can skip any step and add data later.</p>
            </div>
          )}

          {step === 1 && (
            <div className="step-content" data-testid="onboarding-income">
              <h2>Income Sources</h2>
              <p className="text-muted">Add your regular income sources (salary, freelance, etc.)</p>
              {incomes.map((inc, i) => (
                <div key={i} className="onboarding-item">
                  <input type="text" placeholder="Name" value={inc.name} onChange={e => { const n = [...incomes]; n[i].name = e.target.value; setIncomes(n); }} />
                  <input type="number" placeholder="Amount" value={inc.amount} onChange={e => { const n = [...incomes]; n[i].amount = e.target.value; setIncomes(n); }} />
                  <select value={inc.frequency} onChange={e => { const n = [...incomes]; n[i].frequency = e.target.value; setIncomes(n); }}>
                    <option value="monthly">Monthly</option><option value="biweekly">Bi-weekly</option><option value="weekly">Weekly</option>
                  </select>
                  <button className="btn-icon btn-danger-icon" onClick={() => setIncomes(incomes.filter((_, j) => j !== i))}><X size={14} /></button>
                </div>
              ))}
              <button className="btn-sm" onClick={() => setIncomes([...incomes, { name: "", type: "salary", amount: "", frequency: "monthly" }])}>
                <Plus size={14} /> Add Income
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="step-content" data-testid="onboarding-expenses">
              <h2>Recurring Expenses</h2>
              <p className="text-muted">Add bills and regular expenses (rent, subscriptions, etc.)</p>
              {expenses.map((exp, i) => (
                <div key={i} className="onboarding-item">
                  <input type="text" placeholder="Name" value={exp.name} onChange={e => { const n = [...expenses]; n[i].name = e.target.value; setExpenses(n); }} />
                  <input type="number" placeholder="Amount" value={exp.amount} onChange={e => { const n = [...expenses]; n[i].amount = e.target.value; setExpenses(n); }} />
                  <select value={exp.frequency} onChange={e => { const n = [...expenses]; n[i].frequency = e.target.value; setExpenses(n); }}>
                    <option value="monthly">Monthly</option><option value="biweekly">Bi-weekly</option><option value="weekly">Weekly</option>
                  </select>
                  <button className="btn-icon btn-danger-icon" onClick={() => setExpenses(expenses.filter((_, j) => j !== i))}><X size={14} /></button>
                </div>
              ))}
              <button className="btn-sm" onClick={() => setExpenses([...expenses, { name: "", amount: "", frequency: "monthly" }])}>
                <Plus size={14} /> Add Expense
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="step-content" data-testid="onboarding-debts">
              <h2>Your Debts</h2>
              <p className="text-muted">Track loans, credit cards, and other debts</p>
              {debts.map((d, i) => (
                <div key={i} className="onboarding-item">
                  <input type="text" placeholder="Name" value={d.name} onChange={e => { const n = [...debts]; n[i].name = e.target.value; setDebts(n); }} />
                  <select value={d.type} onChange={e => { const n = [...debts]; n[i].type = e.target.value; setDebts(n); }}>
                    <option value="loan">Loan</option><option value="credit_card">Credit Card</option><option value="other">Other</option>
                  </select>
                  <input type="number" placeholder="Original" value={d.amount} onChange={e => { const n = [...debts]; n[i].amount = e.target.value; setDebts(n); }} />
                  <input type="number" placeholder="Balance" value={d.balance} onChange={e => { const n = [...debts]; n[i].balance = e.target.value; setDebts(n); }} />
                  <button className="btn-icon btn-danger-icon" onClick={() => setDebts(debts.filter((_, j) => j !== i))}><X size={14} /></button>
                </div>
              ))}
              <button className="btn-sm" onClick={() => setDebts([...debts, { name: "", type: "loan", amount: "", balance: "" }])}>
                <Plus size={14} /> Add Debt
              </button>
            </div>
          )}

          {step === 4 && (
            <div className="step-content" data-testid="onboarding-business">
              <h2>Add a Business (Optional)</h2>
              <p className="text-muted">If you have a business, add it to track finances separately</p>
              <input type="text" placeholder="Business Name (leave empty to skip)" value={businessName}
                     onChange={e => setBusinessName(e.target.value)} data-testid="business-name-input" />
            </div>
          )}
        </div>

        <div className="onboarding-actions">
          {step > 0 && <button className="btn-secondary" onClick={prev}><ArrowLeft size={16} /> Back</button>}
          {step < STEPS.length - 1 ? (
            <button className="btn-primary" onClick={next} data-testid="onboarding-next">Next <ArrowRight size={16} /></button>
          ) : (
            <button className="btn-primary" onClick={handleFinish} disabled={saving} data-testid="onboarding-finish">
              {saving ? "Saving..." : "Finish Setup"} <Check size={16} />
            </button>
          )}
          <button className="btn-text" onClick={() => { api.post("/onboarding/complete"); onComplete(); }} data-testid="skip-onboarding">
            Skip Setup
          </button>
        </div>
      </div>
    </div>
  );
}
