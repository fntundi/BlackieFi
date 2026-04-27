import React, { useState } from "react";
import { appApi } from "@/lib/app-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, FileDown, FileText, TrendingUp } from "lucide-react";

function ExportCard({ icon: Icon, title, description, onDownload, loading, children }) {
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Icon className="w-5 h-5 text-blue-700" />{title}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">{description}</p>
        {children}
        <Button onClick={onDownload} disabled={loading} className="w-full">
          <Download className="w-4 h-4 mr-2" />
          {loading ? "Generating..." : "Download PDF"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function PDFExport() {
  const [loading, setLoading] = useState("");
  const [dates, setDates] = useState({ start: "", end: "" });

  const download = async (type) => {
    setLoading(type);
    const params = new URLSearchParams();
    if (type === "transactions") {
      if (dates.start) params.set("start_date", dates.start);
      if (dates.end) params.set("end_date", dates.end);
    }
    const blob = await appApi.get(`/api/pdf/${type}${params.toString() ? `?${params.toString()}` : ""}`, { responseType: "blob" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `blackiefi-${type}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
    setLoading("");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">PDF Export</h1>
          <p className="text-gray-500 mt-1">Generate the branch’s export reports using the self-hosted API.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <ExportCard icon={FileDown} title="Dashboard Report" description="High-level financial overview with totals and net worth." onDownload={() => download("dashboard")} loading={loading === "dashboard"} />
          <ExportCard icon={FileText} title="Transaction Report" description="Detailed transaction export with optional date range." onDownload={() => download("transactions")} loading={loading === "transactions"}>
            <div className="grid gap-3 md:grid-cols-2">
              <Input type="date" value={dates.start} onChange={(event) => setDates((current) => ({ ...current, start: event.target.value }))} />
              <Input type="date" value={dates.end} onChange={(event) => setDates((current) => ({ ...current, end: event.target.value }))} />
            </div>
          </ExportCard>
          <ExportCard icon={TrendingUp} title="Portfolio Report" description="Holdings snapshot and portfolio inventory." onDownload={() => download("portfolio")} loading={loading === "portfolio"} />
        </div>
      </div>
    </div>
  );
}
