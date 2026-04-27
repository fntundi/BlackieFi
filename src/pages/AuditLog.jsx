import React, { useMemo, useState } from "react";
import { appApi } from "@/lib/app-api";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { History, RefreshCw } from "lucide-react";

export default function AuditLog() {
  const [filters, setFilters] = useState({ action: "", resourceType: "", start: "", end: "", offset: 0 });
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.action) params.set("action", filters.action);
    if (filters.resourceType) params.set("resource_type", filters.resourceType);
    if (filters.start) params.set("start_date", filters.start);
    if (filters.end) params.set("end_date", filters.end);
    params.set("limit", "25");
    params.set("offset", String(filters.offset));
    return params.toString();
  }, [filters]);

  const logs = useQuery({ queryKey: ["audit-logs", queryString], queryFn: () => appApi.get(`/api/audit?${queryString}`) });
  const actions = useQuery({ queryKey: ["audit-actions"], queryFn: () => appApi.get("/api/audit/actions") });
  const resourceTypes = useQuery({ queryKey: ["audit-resource-types"], queryFn: () => appApi.get("/api/audit/resource-types") });
  const rows = logs.data?.logs ?? [];
  const total = logs.data?.total ?? 0;
  const currentPage = Math.floor(filters.offset / 25) + 1;
  const totalPages = Math.max(1, Math.ceil(total / 25));

  const badgeVariant = (action) => {
    if (String(action).includes("delete")) return "destructive";
    if (String(action).includes("create")) return "secondary";
    return "outline";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Audit Log</h1>
            <p className="text-gray-500 mt-1">Resource-level change tracking imported from `latest-changes`.</p>
          </div>
          <Button variant="outline" onClick={() => logs.refetch()}><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><History className="w-5 h-5 text-blue-700" />Filters</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <select className="h-10 rounded-md border border-gray-300 px-3 text-sm" value={filters.action} onChange={(event) => setFilters((current) => ({ ...current, action: event.target.value, offset: 0 }))}>
              <option value="">All actions</option>
              {(actions.data?.actions ?? []).map((action) => <option key={action} value={action}>{action}</option>)}
            </select>
            <select className="h-10 rounded-md border border-gray-300 px-3 text-sm" value={filters.resourceType} onChange={(event) => setFilters((current) => ({ ...current, resourceType: event.target.value, offset: 0 }))}>
              <option value="">All resource types</option>
              {(resourceTypes.data?.resource_types ?? []).map((resourceType) => <option key={resourceType} value={resourceType}>{resourceType}</option>)}
            </select>
            <Input type="date" value={filters.start} onChange={(event) => setFilters((current) => ({ ...current, start: event.target.value, offset: 0 }))} />
            <Input type="date" value={filters.end} onChange={(event) => setFilters((current) => ({ ...current, end: event.target.value, offset: 0 }))} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Entries</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {rows.map((row) => (
              <div key={row.id} className="rounded-lg border p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={badgeVariant(row.action)}>{row.action}</Badge>
                      <span className="font-medium text-gray-900">{row.resource_type}</span>
                      <span className="text-xs text-gray-400">{String(row.resource_id).slice(0, 8)}</span>
                    </div>
                    <p className="text-sm text-gray-600">{row.user_name || row.user_email || "Unknown user"}</p>
                    <p className="text-xs text-gray-400">{new Date(row.created_date || row.created_at || Date.now()).toLocaleString()}</p>
                  </div>
                  <pre className="max-w-2xl overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">{JSON.stringify(row.details ?? {}, null, 2)}</pre>
                </div>
              </div>
            ))}
            {!rows.length && <p className="py-8 text-center text-gray-500">No audit entries matched the current filters.</p>}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Page {currentPage} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" disabled={filters.offset === 0} onClick={() => setFilters((current) => ({ ...current, offset: Math.max(0, current.offset - 25) }))}>Previous</Button>
            <Button variant="outline" disabled={currentPage >= totalPages} onClick={() => setFilters((current) => ({ ...current, offset: current.offset + 25 }))}>Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
