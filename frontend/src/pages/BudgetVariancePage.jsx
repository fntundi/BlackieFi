import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LineChart, Line
} from "recharts";
import { ChevronLeft, ChevronRight, AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";

const STATUS_COLORS = {
  on_track: { bg: "rgba(34,197,94,0.12)", text: "#22c55e", label: "On Track" },
  warning: { bg: "rgba(245,158,11,0.12)", text: "#f59e0b", label: "Warning" },
  over: { bg: "rgba(239,68,68,0.12)", text: "#ef4444", label: "Over Budget" },
  unbudgeted: { bg: "rgba(100,116,139,0.12)", text: "#94a3b8", label: "Unbudgeted" },
};

export default function BudgetVariancePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [monthsBack, setMonthsBack] = useState(6);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get(`/budgets/variance?months_back=${monthsBack}`);
      setData(r.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [monthsBack]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading || !data) return <div className="page-loading">Generating variance report...</div>;

  const reports = data.reports || [];
  const trend = data.trend || {};
  const current = reports[selectedIdx];

  const trendData = (trend.months || []).map((m, i) => ({
    month: m,
    planned: trend.planned?.[i] || 0,
    actual: trend.actual?.[i] || 0,
    income: trend.income?.[i] || 0,
  }));

  const catChartData = (current?.categories || []).map(c => ({
    name: c.category_name?.length > 10 ? c.category_name.slice(0, 10) + ".." : c.category_name,
    planned: c.planned,
    actual: c.actual,
  }));

  const overBudget = (current?.categories || []).filter(c => c.status === "over");
  const onTrack = (current?.categories || []).filter(c => c.status === "on_track");

  return (
    <div className="page-content" data-testid="variance-page">
      <div className="page-header">
        <h2>Budget Variance Report</h2>
        <div className="variance-period-select">
          <select value={monthsBack} onChange={e => setMonthsBack(parseInt(e.target.value))} data-testid="months-back-select">
            <option value="3">Last 3 months</option>
            <option value="6">Last 6 months</option>
            <option value="12">Last 12 months</option>
          </select>
        </div>
      </div>

      {/* Trend chart */}
      {trendData.length > 1 && (
        <div className="dash-card wide" data-testid="trend-chart">
          <h3><TrendingUp size={16} /> Spending Trend</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f8fafc' }} />
              <Legend />
              <Line type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} name="Income" />
              <Line type="monotone" dataKey="planned" stroke="#475569" strokeWidth={2} dot={{ r: 3 }} name="Planned" strokeDasharray="5 5" />
              <Line type="monotone" dataKey="actual" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Actual" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Month selector */}
      <div className="variance-month-selector" data-testid="variance-months">
        {reports.map((r, i) => (
          <button key={`${r.month_name}-${r.year}`} className={`variance-month-btn ${i === selectedIdx ? 'active' : ''}`}
                  onClick={() => setSelectedIdx(i)} data-testid={`variance-month-${i}`}>
            <span className="vm-name">{r.month_name?.slice(0, 3)} {r.year}</span>
            {r.has_budget && (
              <span className={`vm-variance ${r.total_variance >= 0 ? 'positive' : 'negative'}`}>
                {r.total_variance >= 0 ? "+" : ""}{r.total_variance?.toLocaleString()}
              </span>
            )}
            {!r.has_budget && <span className="vm-no-budget">No budget</span>}
          </button>
        ))}
      </div>

      {current && (
        <div className="variance-detail" data-testid="variance-detail">
          {/* Month summary */}
          <div className="variance-summary-row">
            <div className="variance-summary-card">
              <span className="vs-label">Planned</span>
              <span className="vs-value">${current.total_planned?.toLocaleString()}</span>
            </div>
            <div className="variance-summary-card">
              <span className="vs-label">Actual Spending</span>
              <span className="vs-value">${current.total_actual?.toLocaleString()}</span>
            </div>
            <div className={`variance-summary-card ${current.total_variance >= 0 ? 'positive' : 'negative'}`}>
              <span className="vs-label">Variance</span>
              <span className="vs-value">{current.total_variance >= 0 ? "+" : ""}${current.total_variance?.toLocaleString()}</span>
            </div>
            <div className="variance-summary-card">
              <span className="vs-label">Income</span>
              <span className="vs-value text-green">${current.total_income?.toLocaleString()}</span>
            </div>
            <div className="variance-summary-card">
              <span className="vs-label">Savings Rate</span>
              <span className={`vs-value ${current.savings_rate > 0 ? 'text-green' : 'text-red'}`}>
                {current.savings_rate}%
              </span>
            </div>
          </div>

          {/* Alerts */}
          {overBudget.length > 0 && (
            <div className="variance-alert alert-danger" data-testid="over-budget-alert">
              <AlertTriangle size={16} />
              <span>{overBudget.length} categor{overBudget.length === 1 ? 'y' : 'ies'} over budget: {overBudget.map(c => c.category_name).join(", ")}</span>
            </div>
          )}
          {overBudget.length === 0 && current.has_budget && (
            <div className="variance-alert alert-success" data-testid="on-track-alert">
              <CheckCircle size={16} />
              <span>All categories are within budget!</span>
            </div>
          )}

          {/* Category chart */}
          {catChartData.length > 0 && (
            <div className="dash-card" data-testid="category-variance-chart">
              <h3>Planned vs Actual by Category</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={catChartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} angle={-25} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f8fafc' }} />
                  <Legend />
                  <Bar dataKey="planned" fill="#475569" radius={[4, 4, 0, 0]} name="Planned" />
                  <Bar dataKey="actual" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Actual" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Category breakdown table */}
          <div className="variance-categories" data-testid="variance-categories">
            <h3>Category Breakdown</h3>
            <div className="variance-cat-list">
              {(current.categories || []).map((cat) => {
                const st = STATUS_COLORS[cat.status] || STATUS_COLORS.on_track;
                return (
                  <div key={cat.category_name || cat.category_id} className="variance-cat-row" data-testid={`cat-row-${cat.category_name}`}>
                    <div className="vcat-name">
                      <span className="vcat-status-dot" style={{ background: st.text }} />
                      <span>{cat.category_name}</span>
                    </div>
                    <div className="vcat-bar-wrap">
                      <div className="vcat-bar">
                        <div className="vcat-bar-planned" style={{ width: '100%' }} />
                        <div className="vcat-bar-actual" style={{
                          width: `${Math.min(100, cat.utilization_pct)}%`,
                          background: st.text,
                        }} />
                      </div>
                    </div>
                    <div className="vcat-nums">
                      <span className="vcat-actual">${cat.actual?.toLocaleString()}</span>
                      <span className="vcat-planned">/ ${cat.planned?.toLocaleString()}</span>
                    </div>
                    <span className="vcat-pct" style={{ color: st.text }}>{cat.utilization_pct}%</span>
                    <span className="variance-status-badge" style={{ background: st.bg, color: st.text }}>
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
