import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import {
  Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, Download, X,
  ArrowUpRight, ArrowDownRight, RefreshCw, Trash2
} from "lucide-react";

const TX_TYPES = [
  { value: "", label: "All Types" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
  { value: "debt_payment", label: "Debt Payment" },
  { value: "transfer", label: "Transfer" },
];

const TX_COLORS = {
  income: { bg: "rgba(34,197,94,0.12)", text: "#22c55e", prefix: "+" },
  expense: { bg: "rgba(239,68,68,0.12)", text: "#ef4444", prefix: "-" },
  debt_payment: { bg: "rgba(249,115,22,0.12)", text: "#f97316", prefix: "-" },
  transfer: { bg: "rgba(99,102,241,0.12)", text: "#6366f1", prefix: "" },
};

export default function TransactionsPage() {
  const [data, setData] = useState({ items: [], total: 0, page: 1, page_size: 25, total_pages: 0, summary: {} });
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  const [search, setSearch] = useState("");
  const [txType, setTxType] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  const fetchCategories = useCallback(async () => {
    try { const r = await api.get("/categories/"); setCategories(r.data); } catch (e) { console.error("Failed to load categories:", e.message); }
  }, []);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: PAGE_SIZE, sort_by: sortBy, sort_order: sortOrder };
      if (search) params.search = search;
      if (txType) params.transaction_type = txType;
      if (categoryId) params.category_id = categoryId;
      if (startDate) params.start_date = new Date(startDate).toISOString();
      if (endDate) params.end_date = new Date(endDate + "T23:59:59").toISOString();
      if (minAmount) params.min_amount = parseFloat(minAmount);
      if (maxAmount) params.max_amount = parseFloat(maxAmount);
      const r = await api.get("/transactions/search", { params });
      setData(r.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [search, txType, categoryId, startDate, endDate, minAmount, maxAmount, sortBy, sortOrder, page]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const handleSort = (field) => {
    if (sortBy === field) setSortOrder(o => o === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortOrder("desc"); }
    setPage(1);
  };

  const clearFilters = () => {
    setSearch(""); setTxType(""); setCategoryId(""); setStartDate(""); setEndDate("");
    setMinAmount(""); setMaxAmount(""); setPage(1);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this transaction?")) return;
    try { await api.delete(`/transactions/${id}`); fetchTransactions(); } catch (e) { alert(e.response?.data?.detail || "Error"); }
  };

  const handleExport = () => {
    const rows = [["Date", "Type", "Description", "Amount", "Category"]];
    data.items.forEach(t => {
      const cat = categories.find(c => c.id === t.category_id);
      rows.push([t.date?.slice(0, 10), t.transaction_type, t.description, t.amount, cat?.name || ""]);
    });
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "transactions.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const s = data.summary || {};
  const catName = (id) => categories.find(c => c.id === id)?.name || "";
  const activeFilters = [txType, categoryId, startDate, endDate, minAmount, maxAmount].filter(Boolean).length;

  return (
    <div className="page-content" data-testid="transactions-page">
      <div className="page-header">
        <h2>Transactions</h2>
        <button className="btn-sm" onClick={handleExport} data-testid="export-csv-btn"><Download size={14} /> Export CSV</button>
      </div>

      {/* Summary cards */}
      <div className="tx-summary-bar" data-testid="tx-summary">
        <div className="tx-stat">
          <span className="tx-stat-label">Total Income</span>
          <span className="tx-stat-val text-green">${(s.total_income || 0).toLocaleString()}</span>
        </div>
        <div className="tx-stat">
          <span className="tx-stat-label">Total Expenses</span>
          <span className="tx-stat-val text-red">${(s.total_expenses || 0).toLocaleString()}</span>
        </div>
        <div className="tx-stat">
          <span className="tx-stat-label">Net</span>
          <span className={`tx-stat-val ${(s.net || 0) >= 0 ? 'text-green' : 'text-red'}`}>${(s.net || 0).toLocaleString()}</span>
        </div>
        <div className="tx-stat">
          <span className="tx-stat-label">Count</span>
          <span className="tx-stat-val">{data.total || 0}</span>
        </div>
      </div>

      {/* Search & Filter bar */}
      <div className="tx-toolbar" data-testid="tx-toolbar">
        <div className="tx-search-wrap">
          <Search size={16} className="tx-search-icon" />
          <input type="text" placeholder="Search transactions..." value={search}
                 onChange={e => { setSearch(e.target.value); setPage(1); }} className="tx-search" data-testid="tx-search-input" />
        </div>
        <select value={txType} onChange={e => { setTxType(e.target.value); setPage(1); }} className="tx-filter-select" data-testid="tx-type-filter">
          {TX_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <button className={`btn-sm ${showFilters ? 'active' : ''}`} onClick={() => setShowFilters(!showFilters)} data-testid="toggle-filters-btn">
          <Filter size={14} /> Filters {activeFilters > 0 && <span className="filter-count">{activeFilters}</span>}
        </button>
        {activeFilters > 0 && (
          <button className="btn-sm" onClick={clearFilters} data-testid="clear-filters-btn"><RefreshCw size={14} /> Clear</button>
        )}
      </div>

      {showFilters && (
        <div className="tx-filter-panel" data-testid="tx-filter-panel">
          <div className="filter-row">
            <div className="filter-group">
              <label>Category</label>
              <select value={categoryId} onChange={e => { setCategoryId(e.target.value); setPage(1); }}>
                <option value="">All</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <label>Start Date</label>
              <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }} />
            </div>
            <div className="filter-group">
              <label>End Date</label>
              <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }} />
            </div>
            <div className="filter-group">
              <label>Min Amount</label>
              <input type="number" placeholder="0" value={minAmount} onChange={e => { setMinAmount(e.target.value); setPage(1); }} step="0.01" />
            </div>
            <div className="filter-group">
              <label>Max Amount</label>
              <input type="number" placeholder="Any" value={maxAmount} onChange={e => { setMaxAmount(e.target.value); setPage(1); }} step="0.01" />
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? <div className="page-loading">Loading transactions...</div> : data.items.length === 0 ? (
        <div className="empty-state" data-testid="tx-empty">No transactions found matching your criteria.</div>
      ) : (
        <>
          <div className="tx-table-wrap" data-testid="tx-table">
            <table className="tx-table">
              <thead>
                <tr>
                  <th className="sortable" onClick={() => handleSort("date")} data-testid="sort-date">
                    Date <ArrowUpDown size={12} className={sortBy === "date" ? "sort-active" : ""} />
                  </th>
                  <th>Type</th>
                  <th className="sortable" onClick={() => handleSort("description")} data-testid="sort-desc">
                    Description <ArrowUpDown size={12} className={sortBy === "description" ? "sort-active" : ""} />
                  </th>
                  <th>Category</th>
                  <th className="sortable" onClick={() => handleSort("amount")} data-testid="sort-amount">
                    Amount <ArrowUpDown size={12} className={sortBy === "amount" ? "sort-active" : ""} />
                  </th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map(tx => {
                  const colors = TX_COLORS[tx.transaction_type] || TX_COLORS.transfer;
                  return (
                    <tr key={tx.id} data-testid={`tx-row-${tx.id}`}>
                      <td className="tx-date">{tx.date?.slice(0, 10)}</td>
                      <td>
                        <span className="tx-type-badge" style={{ background: colors.bg, color: colors.text }}>
                          {tx.transaction_type === "income" ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                          {tx.transaction_type}
                        </span>
                      </td>
                      <td className="tx-desc-cell">{tx.description}</td>
                      <td className="tx-cat-cell">{catName(tx.category_id)}</td>
                      <td className="tx-amount" style={{ color: colors.text }}>
                        {colors.prefix}${tx.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td>
                        <button className="btn-icon btn-danger-icon" onClick={() => handleDelete(tx.id)} title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="tx-pagination" data-testid="tx-pagination">
            <span className="tx-page-info">
              Showing {((page - 1) * PAGE_SIZE) + 1}-{Math.min(page * PAGE_SIZE, data.total)} of {data.total}
            </span>
            <div className="tx-page-btns">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} data-testid="prev-page">
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(data.total_pages, 5) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, data.total_pages - 4));
                const p = start + i;
                if (p > data.total_pages) return null;
                return (
                  <button key={p} className={p === page ? "active" : ""} onClick={() => setPage(p)} data-testid={`page-${p}`}>
                    {p}
                  </button>
                );
              })}
              <button disabled={page >= data.total_pages} onClick={() => setPage(p => p + 1)} data-testid="next-page">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
