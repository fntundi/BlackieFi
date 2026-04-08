import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { Upload, Download, FileText, FileJson, Loader2, Check, AlertTriangle } from "lucide-react";

export default function DataManagementPage() {
  const [tab, setTab] = useState("export");
  const [exportType, setExportType] = useState("transactions");
  const [exportFmt, setExportFmt] = useState("csv");
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importType, setImportType] = useState("transactions");

  const handleExport = async () => {
    setExporting(true);
    try {
      const r = await api.get(`/data/export/${exportType}?fmt=${exportFmt}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${exportType}_export.${exportFmt}`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.response?.data?.detail || "Export failed");
    } finally { setExporting(false); }
  };

  const handleExportAll = async () => {
    setExporting(true);
    try {
      const r = await api.get("/data/export-all?fmt=json", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = "blackiefi_full_export.json";
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.response?.data?.detail || "Export failed");
    } finally { setExporting(false); }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const r = await api.post(`/data/import/csv?data_type=${importType}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImportResult(r.data);
    } catch (err) {
      setImportResult({ error: err.response?.data?.detail || "Import failed" });
    } finally { setImporting(false); e.target.value = ""; }
  };

  return (
    <div className="page-container" data-testid="data-management-page">
      <div className="ai-tabs">
        <button className={`ai-tab ${tab === "export" ? "active" : ""}`} onClick={() => setTab("export")} data-testid="data-tab-export">
          <Download size={16} /> Export
        </button>
        <button className={`ai-tab ${tab === "import" ? "active" : ""}`} onClick={() => setTab("import")} data-testid="data-tab-import">
          <Upload size={16} /> Import
        </button>
      </div>

      {tab === "export" && (
        <div className="data-section" data-testid="export-section">
          <h3>Export Financial Data</h3>
          <p className="text-muted">Download your financial data in CSV or JSON format.</p>
          <div className="form-grid">
            <div className="form-group">
              <label>Data Type</label>
              <select value={exportType} onChange={e => setExportType(e.target.value)} data-testid="export-type-select">
                <option value="transactions">Transactions</option>
                <option value="expenses">Expenses</option>
                <option value="income">Income</option>
                <option value="debts">Debts</option>
                <option value="accounts">Accounts</option>
                <option value="budgets">Budgets</option>
                <option value="investments">Investments</option>
                <option value="savings">Savings</option>
              </select>
            </div>
            <div className="form-group">
              <label>Format</label>
              <select value={exportFmt} onChange={e => setExportFmt(e.target.value)} data-testid="export-format-select">
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button className="btn-primary" onClick={handleExport} disabled={exporting} data-testid="export-btn">
              {exporting ? <><Loader2 size={16} className="spin" /> Exporting...</> : <><Download size={16} /> Export {exportType}</>}
            </button>
            <button className="btn-secondary" onClick={handleExportAll} disabled={exporting} data-testid="export-all-btn">
              <FileJson size={16} /> Export All Data (JSON)
            </button>
          </div>
        </div>
      )}

      {tab === "import" && (
        <div className="data-section" data-testid="import-section">
          <h3>Import Data from CSV</h3>
          <p className="text-muted">Upload a CSV file to import data. Required columns vary by type.</p>
          <div className="import-info">
            <h4>CSV Column Requirements:</h4>
            <ul>
              <li><strong>Transactions:</strong> amount, type, category, description, date</li>
              <li><strong>Expenses:</strong> name, amount, category, frequency, is_recurring</li>
              <li><strong>Income:</strong> name, amount, type, frequency</li>
            </ul>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label>Import Type</label>
              <select value={importType} onChange={e => setImportType(e.target.value)} data-testid="import-type-select">
                <option value="transactions">Transactions</option>
                <option value="expenses">Expenses</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div className="form-group">
              <label>CSV File</label>
              <input type="file" accept=".csv" onChange={handleImport} disabled={importing} data-testid="import-file-input" />
            </div>
          </div>
          {importing && <div className="loading-spinner"><Loader2 size={20} className="spin" /> Importing...</div>}
          {importResult && (
            <div className={`import-result ${importResult.error ? "error" : "success"}`} data-testid="import-result">
              {importResult.error ? (
                <><AlertTriangle size={16} /> {importResult.error}</>
              ) : (
                <>
                  <Check size={16} /> Imported {importResult.imported} of {importResult.total_rows} rows
                  {importResult.errors?.length > 0 && (
                    <div className="import-errors">
                      <p>{importResult.errors.length} errors:</p>
                      <ul>{importResult.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}</ul>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
