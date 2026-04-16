import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3, RefreshCw } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, BarChart, Bar, Legend
} from "recharts";

const COLORS = ["#f59e0b", "#3b82f6", "#22c55e", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

export default function PortfolioAnalyticsPage() {
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [allocation, setAllocation] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState(12);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, histRes, allocRes, perfRes] = await Promise.all([
        api.get("/portfolio-analytics/summary"),
        api.get(`/portfolio-analytics/history?months=${months}`),
        api.get("/portfolio-analytics/allocation"),
        api.get(`/portfolio-analytics/monthly-performance?months=${months}`)
      ]);
      setSummary(sumRes.data);
      setHistory(histRes.data.history || []);
      setAllocation(allocRes.data.allocation || []);
      setPerformance(perfRes.data.performance || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [months]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (val) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
    return `$${val.toFixed(0)}`;
  };

  return (
    <div className="page-content" data-testid="portfolio-analytics-page">
      <div className="page-header">
        <h2>Portfolio Analytics</h2>
        <div className="header-actions">
          <select
            value={months}
            onChange={(e) => setMonths(parseInt(e.target.value))}
            className="select-sm"
          >
            <option value={6}>6 Months</option>
            <option value={12}>12 Months</option>
            <option value={24}>24 Months</option>
          </select>
          <button className="btn-icon" onClick={fetchData} data-testid="refresh-analytics">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Loading analytics...</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="analytics-summary-grid">
            <div className="stat-card" data-testid="net-worth-card">
              <div className="stat-icon">
                <DollarSign size={20} />
              </div>
              <div className="stat-content">
                <span className="stat-label">Net Worth</span>
                <span className={`stat-value ${summary?.net_worth >= 0 ? 'positive' : 'negative'}`}>
                  {formatCurrency(summary?.net_worth || 0)}
                </span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon cash">
                <DollarSign size={20} />
              </div>
              <div className="stat-content">
                <span className="stat-label">Total Cash</span>
                <span className="stat-value">{formatCurrency(summary?.total_cash || 0)}</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon investments">
                <TrendingUp size={20} />
              </div>
              <div className="stat-content">
                <span className="stat-label">Investments</span>
                <span className="stat-value">{formatCurrency(summary?.total_investments || 0)}</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon gain">
                {summary?.investment_gain >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
              </div>
              <div className="stat-content">
                <span className="stat-label">Investment Gain</span>
                <span className={`stat-value ${summary?.investment_gain >= 0 ? 'positive' : 'negative'}`}>
                  {summary?.investment_gain >= 0 ? '+' : ''}{formatCurrency(summary?.investment_gain || 0)}
                  <small> ({(summary?.investment_gain_pct || 0).toFixed(1)}%)</small>
                </span>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="analytics-charts-grid">
            {/* Net Worth Over Time - Line Chart */}
            <div className="chart-card large" data-testid="networth-chart">
              <div className="chart-header">
                <h3><TrendingUp size={18} /> Net Worth Over Time</h3>
              </div>
              <div className="chart-body">
                {history.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={history}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={formatCurrency} />
                      <Tooltip
                        contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                        formatter={(value) => [`$${value.toLocaleString()}`, '']}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="net_worth" name="Net Worth" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b' }} />
                      <Line type="monotone" dataKey="investments" name="Investments" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                      <Line type="monotone" dataKey="cash_flow" name="Cash Flow" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e' }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-chart">No historical data available</div>
                )}
              </div>
            </div>

            {/* Asset Allocation - Pie Chart */}
            <div className="chart-card" data-testid="allocation-chart">
              <div className="chart-header">
                <h3><PieChart size={18} /> Asset Allocation</h3>
              </div>
              <div className="chart-body">
                {allocation.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <RechartsPie>
                      <Pie
                        data={allocation}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        label={({ name, percentage }) => `${name} (${percentage}%)`}
                        labelLine={false}
                      >
                        {allocation.map((entry, index) => (
                          <Cell key={entry.name} fill={entry.color || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                        formatter={(value) => [`$${value.toLocaleString()}`, '']}
                      />
                    </RechartsPie>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-chart">No allocation data</div>
                )}
              </div>
              {allocation.length > 0 && (
                <div className="allocation-legend">
                  {allocation.map((item, i) => (
                    <div key={item.name} className="legend-item">
                      <span className="legend-dot" style={{ backgroundColor: item.color || COLORS[i % COLORS.length] }} />
                      <span>{item.name}: {formatCurrency(item.value)} ({item.percentage}%)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Monthly Income vs Expenses - Bar Chart */}
            <div className="chart-card large" data-testid="performance-chart">
              <div className="chart-header">
                <h3><BarChart3 size={18} /> Monthly Income vs Expenses</h3>
              </div>
              <div className="chart-body">
                {performance.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={performance}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={formatCurrency} />
                      <Tooltip
                        contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                        formatter={(value) => [`$${value.toLocaleString()}`, '']}
                      />
                      <Legend />
                      <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-chart">No performance data available</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
