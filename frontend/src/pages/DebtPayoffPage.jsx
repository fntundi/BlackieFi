import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { Calculator, TrendingDown, Clock, DollarSign, ArrowRight, Info } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend
} from "recharts";

export default function DebtPayoffPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [strategy, setStrategy] = useState("avalanche");
  const [extraMonthly, setExtraMonthly] = useState(0);
  const [selectedDebt, setSelectedDebt] = useState(null);

  const calculate = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.post("/debts/payoff-estimate", { strategy, extra_monthly: parseFloat(extraMonthly) || 0 });
      setData(r.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [strategy, extraMonthly]);

  useEffect(() => { calculate(); }, [calculate]);

  if (loading && !data) return <div className="page-loading">Calculating payoff schedule...</div>;
  if (!data || !data.debts?.length) return (
    <div className="page-content" data-testid="payoff-page">
      <div className="page-header"><h2>Debt Payoff Estimator</h2></div>
      <div className="empty-state">No active debts found. Add debts first to see payoff estimates.</div>
    </div>
  );

  const s = data.summary || {};
  const compChart = data.debts.map(d => ({
    name: d.name.length > 12 ? d.name.slice(0, 12) + ".." : d.name,
    original: d.months_to_payoff,
    accelerated: d.accelerated?.months_to_payoff || d.months_to_payoff,
  }));

  const selectedData = selectedDebt ? data.debts.find(d => d.id === selectedDebt) : null;

  return (
    <div className="page-content" data-testid="payoff-page">
      <div className="page-header">
        <h2>Debt Payoff Estimator</h2>
      </div>

      {/* Controls */}
      <div className="payoff-controls" data-testid="payoff-controls">
        <div className="payoff-control-group">
          <label>Strategy</label>
          <div className="strategy-toggle">
            <button className={strategy === "avalanche" ? "active" : ""} onClick={() => setStrategy("avalanche")}
                    data-testid="strategy-avalanche">
              <TrendingDown size={14} /> Avalanche
              <span className="strategy-hint">Highest rate first</span>
            </button>
            <button className={strategy === "snowball" ? "active" : ""} onClick={() => setStrategy("snowball")}
                    data-testid="strategy-snowball">
              <DollarSign size={14} /> Snowball
              <span className="strategy-hint">Lowest balance first</span>
            </button>
          </div>
        </div>
        <div className="payoff-control-group">
          <label>Extra Monthly Payment</label>
          <div className="extra-input-row">
            <span className="input-prefix">$</span>
            <input type="number" value={extraMonthly} onChange={e => setExtraMonthly(e.target.value)}
                   min="0" step="25" className="extra-input" data-testid="extra-monthly-input" />
          </div>
          <div className="quick-amounts">
            {[0, 50, 100, 200, 500].map(amt => (
              <button key={amt} className={`quick-btn ${parseFloat(extraMonthly) === amt ? 'active' : ''}`}
                      onClick={() => setExtraMonthly(amt)} data-testid={`quick-${amt}`}>
                ${amt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="payoff-summary" data-testid="payoff-summary">
        <div className="payoff-stat-card">
          <div className="payoff-stat-icon"><Clock size={20} /></div>
          <div>
            <span className="payoff-stat-label">Original Timeline</span>
            <span className="payoff-stat-val">{s.original_total_months} months</span>
          </div>
          <ArrowRight size={16} className="text-muted" />
          <div>
            <span className="payoff-stat-label">Accelerated</span>
            <span className="payoff-stat-val text-green">{s.accelerated_total_months} months</span>
          </div>
          {s.total_months_saved > 0 && (
            <span className="payoff-saved-badge">{s.total_months_saved} mo saved</span>
          )}
        </div>
        <div className="payoff-stat-card">
          <div className="payoff-stat-icon"><DollarSign size={20} /></div>
          <div>
            <span className="payoff-stat-label">Original Interest</span>
            <span className="payoff-stat-val">${s.original_total_interest?.toLocaleString()}</span>
          </div>
          <ArrowRight size={16} className="text-muted" />
          <div>
            <span className="payoff-stat-label">With Extra Payments</span>
            <span className="payoff-stat-val text-green">${s.accelerated_total_interest?.toLocaleString()}</span>
          </div>
          {s.total_interest_saved > 0 && (
            <span className="payoff-saved-badge">${s.total_interest_saved?.toLocaleString()} saved</span>
          )}
        </div>
      </div>

      {/* Comparison chart */}
      {compChart.length > 0 && (
        <div className="dash-card" data-testid="payoff-comparison-chart">
          <h3><Calculator size={16} /> Months to Payoff Comparison</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={compChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f8fafc' }} />
              <Bar dataKey="original" fill="#475569" radius={[4, 4, 0, 0]} name="Original" />
              <Bar dataKey="accelerated" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Accelerated" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Per-debt details */}
      <div className="payoff-debts-list" data-testid="payoff-debts">
        <h3>Debt Details</h3>
        {data.debts.map(d => {
          const accel = d.accelerated || {};
          const isSelected = selectedDebt === d.id;
          return (
            <div key={d.id} className={`payoff-debt-card ${isSelected ? 'expanded' : ''}`}
                 data-testid={`payoff-debt-${d.id}`}>
              <div className="payoff-debt-header" onClick={() => setSelectedDebt(isSelected ? null : d.id)}>
                <div className="payoff-debt-info">
                  <h4>{d.name}</h4>
                  <span className="badge-sm">{d.debt_type}</span>
                </div>
                <div className="payoff-debt-nums">
                  <div className="payoff-debt-col">
                    <span className="payoff-mini-label">Balance</span>
                    <span className="payoff-mini-val">${d.current_balance?.toLocaleString()}</span>
                  </div>
                  <div className="payoff-debt-col">
                    <span className="payoff-mini-label">Rate</span>
                    <span className="payoff-mini-val">{d.interest_rate}%</span>
                  </div>
                  <div className="payoff-debt-col">
                    <span className="payoff-mini-label">Original</span>
                    <span className="payoff-mini-val">{d.months_to_payoff} mo</span>
                  </div>
                  <div className="payoff-debt-col">
                    <span className="payoff-mini-label">Accelerated</span>
                    <span className="payoff-mini-val text-green">{accel.months_to_payoff} mo</span>
                  </div>
                  {accel.interest_saved > 0 && (
                    <div className="payoff-debt-col">
                      <span className="payoff-mini-label">Saved</span>
                      <span className="payoff-mini-val text-amber">${accel.interest_saved?.toLocaleString()}</span>
                    </div>
                  )}
                </div>
                <Info size={16} className="text-muted" />
              </div>

              {isSelected && accel.schedule && (
                <div className="payoff-schedule" data-testid={`schedule-${d.id}`}>
                  <h4>Amortization Schedule (Accelerated)</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={accel.schedule} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f8fafc' }} />
                      <Legend />
                      <Line type="monotone" dataKey="balance" stroke="#ef4444" strokeWidth={2} dot={false} name="Balance" />
                      <Line type="monotone" dataKey="payment" stroke="#22c55e" strokeWidth={1} dot={false} name="Payment" />
                      <Line type="monotone" dataKey="interest" stroke="#f97316" strokeWidth={1} dot={false} name="Interest" />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="schedule-table-wrap">
                    <table className="schedule-table">
                      <thead>
                        <tr><th>Month</th><th>Payment</th><th>Principal</th><th>Interest</th><th>Balance</th></tr>
                      </thead>
                      <tbody>
                        {accel.schedule.slice(0, 24).map(row => (
                          <tr key={row.month}>
                            <td>{row.month}</td>
                            <td>${row.payment?.toLocaleString()}</td>
                            <td>${row.principal?.toLocaleString()}</td>
                            <td className="text-red">${row.interest?.toLocaleString()}</td>
                            <td>${row.balance?.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
