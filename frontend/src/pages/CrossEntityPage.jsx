import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { Building2, TrendingUp, TrendingDown, RefreshCw, ArrowRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const COLORS = ["#f59e0b", "#3b82f6", "#22c55e", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function CrossEntityPage() {
  const [summary, setSummary] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, compRes] = await Promise.all([
        api.get("/multitenancy/cross-entity-summary"),
        api.get("/multitenancy/entity-comparison")
      ]);
      setSummary(sumRes.data);
      setComparison(compRes.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSwitchEntity = async (entityId) => {
    try {
      await api.post(`/multitenancy/switch-entity?entity_id=${entityId}`);
      localStorage.setItem("currentEntityId", entityId);
      window.location.reload();
    } catch (e) {
      alert(e.response?.data?.detail || "Error switching entity");
    }
  };

  const formatCurrency = (val) => {
    if (!val && val !== 0) return "$0";
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
    return `$${val.toFixed(0)}`;
  };

  return (
    <div className="page-content" data-testid="cross-entity-page">
      <div className="page-header">
        <h2><Building2 size={24} /> Multi-Entity Overview</h2>
        <button className="btn-icon" onClick={fetchData} data-testid="refresh-entities">
          <RefreshCw size={16} />
        </button>
      </div>

      {loading ? (
        <div className="loading-state">Loading entity data...</div>
      ) : (
        <>
          {/* Total Summary Card */}
          <div className="total-summary-card" data-testid="total-summary">
            <div className="summary-header">
              <h3>Combined Net Worth</h3>
              <span className={`net-worth ${summary?.total_net_worth >= 0 ? 'positive' : 'negative'}`}>
                {formatCurrency(summary?.total_net_worth || 0)}
              </span>
            </div>
            <p>Across {summary?.entity_count || 0} entities</p>
          </div>

          {/* Entity Cards Grid */}
          <div className="entity-cards-grid" data-testid="entity-cards">
            {summary?.entities?.map((entity, index) => (
              <div
                key={entity.entity_id}
                className={`entity-card ${entity.is_personal ? 'personal' : 'business'}`}
                data-testid={`entity-card-${entity.entity_id}`}
              >
                <div className="entity-header">
                  <div className="entity-badge" style={{ backgroundColor: COLORS[index % COLORS.length] }}>
                    {entity.entity_name?.charAt(0) || 'E'}
                  </div>
                  <div className="entity-info">
                    <h4>{entity.entity_name}</h4>
                    <span className="entity-type">{entity.is_personal ? 'Personal' : entity.entity_type}</span>
                  </div>
                </div>
                <div className="entity-stats">
                  <div className="stat-row">
                    <span className="stat-label">Cash</span>
                    <span className="stat-value positive">{formatCurrency(entity.total_cash)}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Investments</span>
                    <span className="stat-value">{formatCurrency(entity.total_investments)}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Debt</span>
                    <span className="stat-value negative">-{formatCurrency(entity.total_debt)}</span>
                  </div>
                  <div className="stat-row total">
                    <span className="stat-label">Net Worth</span>
                    <span className={`stat-value ${entity.net_worth >= 0 ? 'positive' : 'negative'}`}>
                      {formatCurrency(entity.net_worth)}
                    </span>
                  </div>
                </div>
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => handleSwitchEntity(entity.entity_id)}
                  data-testid={`switch-to-${entity.entity_id}`}
                >
                  Switch to Entity <ArrowRight size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Monthly Comparison Chart */}
          {comparison?.comparisons?.length > 0 && (
            <div className="comparison-section" data-testid="comparison-section">
              <h3>Monthly Performance Comparison ({comparison.month})</h3>
              <div className="comparison-chart">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={comparison.comparisons} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" tickFormatter={formatCurrency} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis dataKey="entity_name" type="category" width={120} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                      formatter={(value) => [`$${value.toLocaleString()}`, '']}
                    />
                    <Bar dataKey="monthly_income" name="Income" fill="#22c55e" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="monthly_expenses" name="Expenses" fill="#ef4444" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Comparison Table */}
              <div className="comparison-table-container">
                <table className="comparison-table">
                  <thead>
                    <tr>
                      <th>Entity</th>
                      <th>Income</th>
                      <th>Expenses</th>
                      <th>Net</th>
                      <th>Transactions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.comparisons.map((comp) => (
                      <tr key={comp.entity_id}>
                        <td>{comp.entity_name}</td>
                        <td className="positive">{formatCurrency(comp.monthly_income)}</td>
                        <td className="negative">{formatCurrency(comp.monthly_expenses)}</td>
                        <td className={comp.monthly_net >= 0 ? 'positive' : 'negative'}>
                          {comp.monthly_net >= 0 ? '+' : ''}{formatCurrency(comp.monthly_net)}
                        </td>
                        <td>{comp.transaction_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
