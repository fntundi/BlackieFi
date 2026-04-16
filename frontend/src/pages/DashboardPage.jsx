import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import {
  TrendingUp, TrendingDown, DollarSign, CreditCard, PiggyBank, Calendar,
  ArrowUpRight, ArrowDownRight
} from "lucide-react";

const COLORS = ["#f59e0b", "#3b82f6", "#22c55e", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

export default function DashboardPage({ entityId, entities }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("unified");

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      if (view === "unified") {
        const res = await api.get("/dashboard/unified");
        setData(res.data);
      } else {
        const res = await api.get(`/dashboard/entity/${entityId}`);
        setData(res.data);
      }
    } catch (err) {
      console.error("Dashboard error:", err);
    }
    setLoading(false);
  }, [view, entityId]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  if (loading || !data) return <div className="page-loading" data-testid="dashboard-loading">Loading dashboard...</div>;

  const budgetData = (data.budget_summary || []).map(b => ({
    name: b.category_name || "Other",
    planned: b.planned,
    actual: b.actual,
  }));

  const debtData = (data.debts_list || []).map(d => ({
    name: d.name,
    value: d.balance,
  }));

  return (
    <div className="page-content" data-testid="dashboard-page">
      <div className="page-header">
        <h2>Dashboard</h2>
        <div className="view-toggle">
          <button className={view === "unified" ? "active" : ""} onClick={() => setView("unified")}
                  data-testid="unified-view-btn">Unified</button>
          <button className={view === "entity" ? "active" : ""} onClick={() => setView("entity")}
                  data-testid="entity-view-btn">Current Entity</button>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard icon={<DollarSign size={20} />} label="Net Worth" value={data.net_worth ?? (data.total_balance + data.total_investments - data.total_debt)} accent />
        <StatCard icon={<TrendingUp size={20} />} label="Total Balance" value={data.total_balance} positive />
        <StatCard icon={<CreditCard size={20} />} label="Total Debt" value={data.total_debt} negative />
        <StatCard icon={<PiggyBank size={20} />} label="Investments" value={data.total_investments} positive />
      </div>

      <div className="dashboard-grid">
        <div className="dash-card" data-testid="income-expense-card">
          <h3>Income vs Expenses (Monthly)</h3>
          <div className="ie-summary">
            <div className="ie-item">
              <ArrowUpRight size={16} className="text-green" />
              <span>Income: ${(data.monthly_income || 0).toLocaleString()}</span>
            </div>
            <div className="ie-item">
              <ArrowDownRight size={16} className="text-red" />
              <span>Expenses: ${(data.monthly_expenses || 0).toLocaleString()}</span>
            </div>
          </div>
          <div className="ie-bar">
            <div className="ie-bar-income" style={{width: `${Math.min(100, ((data.actual_income_this_month || data.actual_income || 0) / Math.max(1, data.monthly_income)) * 100)}%`}} />
          </div>
          <p className="ie-label">Actual income this month: ${(data.actual_income_this_month || data.actual_income || 0).toLocaleString()}</p>
        </div>

        {data.upcoming_income && data.upcoming_income.length > 0 && (
          <div className="dash-card" data-testid="upcoming-income-card">
            <h3><Calendar size={16} /> Upcoming Paydays</h3>
            <ul className="upcoming-list">
              {data.upcoming_income.map((item) => (
                <li key={item.id || `${item.name}-${item.date}`}>
                  <span>{item.name}</span>
                  <span className="text-green">${item.amount?.toLocaleString()}</span>
                  <span className="text-muted">{item.date?.slice(0, 10)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.upcoming_expenses && data.upcoming_expenses.length > 0 && (
          <div className="dash-card" data-testid="upcoming-expenses-card">
            <h3><Calendar size={16} /> Upcoming Bills</h3>
            <ul className="upcoming-list">
              {data.upcoming_expenses.map((item) => (
                <li key={item.id || `${item.name}-${item.date}`}>
                  <span>{item.name}</span>
                  <span className="text-red">${item.amount?.toLocaleString()}</span>
                  <span className="text-muted">{item.date?.slice(0, 10)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {budgetData.length > 0 && (
          <div className="dash-card wide" data-testid="budget-chart-card">
            <h3>Budget Utilization</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={budgetData} margin={{top: 10, right: 10, left: 0, bottom: 0}}>
                <XAxis dataKey="name" tick={{fill: '#94a3b8', fontSize: 11}} />
                <YAxis tick={{fill: '#94a3b8', fontSize: 11}} />
                <Tooltip contentStyle={{background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f8fafc'}} />
                <Bar dataKey="planned" fill="#334155" radius={[4,4,0,0]} name="Planned" />
                <Bar dataKey="actual" fill="#f59e0b" radius={[4,4,0,0]} name="Actual" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {debtData.length > 0 && (
          <div className="dash-card" data-testid="debt-chart-card">
            <h3>Debt Breakdown</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={debtData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                     innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {debtData.map((entry, i) => <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f8fafc'}} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pie-legend">
              {debtData.map((d, i) => (
                <span key={d.name}><span className="dot" style={{background: COLORS[i % COLORS.length]}} />{d.name}: ${d.value.toLocaleString()}</span>
              ))}
            </div>
          </div>
        )}

        {data.recent_transactions && data.recent_transactions.length > 0 && (
          <div className="dash-card wide" data-testid="recent-txns-card">
            <h3>Recent Transactions</h3>
            <div className="txn-list">
              {data.recent_transactions.slice(0, 7).map((t, i) => (
                <div key={i} className="txn-row">
                  <span className="txn-desc">{t.description}</span>
                  <span className={t.transaction_type === "income" ? "text-green" : "text-red"}>
                    {t.transaction_type === "income" ? "+" : "-"}${t.amount?.toLocaleString()}
                  </span>
                  <span className="text-muted">{t.date?.slice(0, 10)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, positive, negative, accent }) {
  const cls = accent ? "stat-card accent" : positive ? "stat-card positive" : negative ? "stat-card negative" : "stat-card";
  return (
    <div className={cls} data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="stat-icon">{icon}</div>
      <h3>{label}</h3>
      <p className="stat-value">${(value || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
    </div>
  );
}
