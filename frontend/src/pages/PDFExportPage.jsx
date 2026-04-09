import { useState } from "react";
import { api, BACKEND_URL } from "@/lib/api";
import { FileDown, FileText, TrendingUp, LayoutDashboard, Download, Loader2 } from "lucide-react";

export default function PDFExportPage() {
  const [loading, setLoading] = useState({});
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const downloadPDF = async (type, filename) => {
    setLoading({ ...loading, [type]: true });
    try {
      const token = localStorage.getItem("token");
      const entityId = localStorage.getItem("currentEntityId");
      
      let url = `${BACKEND_URL}/api/pdf/${type}`;
      const params = new URLSearchParams();
      if (entityId) params.append("entity_id", entityId);
      if (type === "transactions") {
        if (startDate) params.append("start_date", startDate);
        if (endDate) params.append("end_date", endDate);
      }
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error("Failed to generate PDF");
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (e) {
      console.error(e);
      alert("Error generating PDF: " + e.message);
    }
    setLoading({ ...loading, [type]: false });
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="page-content" data-testid="pdf-export-page">
      <div className="page-header">
        <h2><FileDown size={24} /> PDF Export</h2>
      </div>

      <p className="page-description">
        Generate professional PDF reports with charts and detailed financial data.
      </p>

      <div className="export-cards-grid">
        {/* Dashboard Report */}
        <div className="export-card" data-testid="dashboard-export">
          <div className="export-icon dashboard">
            <LayoutDashboard size={32} />
          </div>
          <div className="export-content">
            <h3>Dashboard Report</h3>
            <p>Complete financial overview including net worth, account balances, and asset allocation chart.</p>
            <ul className="export-features">
              <li>Net worth summary</li>
              <li>Account breakdown</li>
              <li>Asset allocation pie chart</li>
            </ul>
          </div>
          <button
            className="btn-primary"
            onClick={() => downloadPDF("dashboard", `blackiefi_dashboard_${today}.pdf`)}
            disabled={loading.dashboard}
            data-testid="download-dashboard-pdf"
          >
            {loading.dashboard ? (
              <><Loader2 size={16} className="spin" /> Generating...</>
            ) : (
              <><Download size={16} /> Download</>
            )}
          </button>
        </div>

        {/* Transactions Report */}
        <div className="export-card" data-testid="transactions-export">
          <div className="export-icon transactions">
            <FileText size={32} />
          </div>
          <div className="export-content">
            <h3>Transaction Report</h3>
            <p>Detailed list of all transactions with income/expense summary.</p>
            <div className="date-range-inputs">
              <div className="input-group">
                <label>From</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>To</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>
          <button
            className="btn-primary"
            onClick={() => downloadPDF("transactions", `blackiefi_transactions_${today}.pdf`)}
            disabled={loading.transactions}
            data-testid="download-transactions-pdf"
          >
            {loading.transactions ? (
              <><Loader2 size={16} className="spin" /> Generating...</>
            ) : (
              <><Download size={16} /> Download</>
            )}
          </button>
        </div>

        {/* Portfolio Report */}
        <div className="export-card" data-testid="portfolio-export">
          <div className="export-icon portfolio">
            <TrendingUp size={32} />
          </div>
          <div className="export-content">
            <h3>Portfolio Report</h3>
            <p>Investment portfolio analysis with holdings breakdown and performance charts.</p>
            <ul className="export-features">
              <li>Total portfolio value</li>
              <li>Gain/loss analysis</li>
              <li>Holdings by vehicle chart</li>
              <li>Individual holdings table</li>
            </ul>
          </div>
          <button
            className="btn-primary"
            onClick={() => downloadPDF("portfolio", `blackiefi_portfolio_${today}.pdf`)}
            disabled={loading.portfolio}
            data-testid="download-portfolio-pdf"
          >
            {loading.portfolio ? (
              <><Loader2 size={16} className="spin" /> Generating...</>
            ) : (
              <><Download size={16} /> Download</>
            )}
          </button>
        </div>
      </div>

      <div className="export-info">
        <h4>About PDF Reports</h4>
        <ul>
          <li>Reports are generated in real-time with your latest data</li>
          <li>Charts and graphs are included where applicable</li>
          <li>PDFs are formatted for easy printing on letter-size paper</li>
          <li>All amounts are shown in your base currency</li>
        </ul>
      </div>
    </div>
  );
}
