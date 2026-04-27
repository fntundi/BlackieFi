import React, { useState } from "react";
import { appApi } from "@/lib/app-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Download, Upload } from "lucide-react";

export default function DataManagement() {
  const [tab, setTab] = useState("export");
  const [exportType, setExportType] = useState("transactions");
  const [exportFormat, setExportFormat] = useState("csv");
  const [importType, setImportType] = useState("transactions");
  const [result, setResult] = useState(null);

  const handleExport = async (all = false) => {
    const path = all ? "/api/data/export-all" : `/api/data/export/${exportType}?fmt=${exportFormat}`;
    const blob = await appApi.get(path, { responseType: "blob" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = all ? "blackiefi-export.json" : `${exportType}.${exportFormat}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    const response = await appApi.post(`/api/data/import/csv?data_type=${importType}`, formData);
    setResult(response);
    event.target.value = "";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Import / Export</h1>
          <p className="text-gray-500 mt-1">The branch’s data-management utilities, carried into the self-hosted stack.</p>
        </div>

        <div className="flex gap-2">
          <Button variant={tab === "export" ? "default" : "outline"} onClick={() => setTab("export")}><Download className="w-4 h-4 mr-2" />Export</Button>
          <Button variant={tab === "import" ? "default" : "outline"} onClick={() => setTab("import")}><Upload className="w-4 h-4 mr-2" />Import</Button>
        </div>

        {tab === "export" && (
          <Card>
            <CardHeader><CardTitle>Export Data</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <select className="h-10 rounded-md border border-gray-300 px-3 text-sm" value={exportType} onChange={(event) => setExportType(event.target.value)}>
                  <option value="transactions">Transactions</option>
                  <option value="expenses">Expenses</option>
                  <option value="income">Income</option>
                  <option value="debts">Debts</option>
                  <option value="accounts">Accounts</option>
                  <option value="budgets">Budgets</option>
                  <option value="investments">Investments</option>
                  <option value="savings">Savings</option>
                </select>
                <select className="h-10 rounded-md border border-gray-300 px-3 text-sm" value={exportFormat} onChange={(event) => setExportFormat(event.target.value)}>
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => handleExport(false)}><Download className="w-4 h-4 mr-2" />Export {exportType}</Button>
                <Button variant="outline" onClick={() => handleExport(true)}>Full JSON Export</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {tab === "import" && (
          <Card>
            <CardHeader><CardTitle>Import CSV</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <select className="h-10 rounded-md border border-gray-300 px-3 text-sm" value={importType} onChange={(event) => setImportType(event.target.value)}>
                <option value="transactions">Transactions</option>
                <option value="expenses">Expenses</option>
                <option value="income">Income</option>
              </select>
              <Input type="file" accept=".csv" onChange={handleImport} />
              {result && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 mt-0.5" />
                  <div>
                    Imported {result.imported} of {result.total_rows} rows.
                    {result.errors?.length > 0 && <p className="mt-2 text-amber-700">{result.errors.length} row(s) need attention.</p>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
