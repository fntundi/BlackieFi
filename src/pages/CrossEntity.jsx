import React from "react";
import { appApi } from "@/lib/app-api";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ArrowRightLeft, Building2, RefreshCw } from "lucide-react";

export default function CrossEntity() {
  const summary = useQuery({ queryKey: ["cross-entity-summary"], queryFn: () => appApi.get("/api/multitenancy/cross-entity-summary") });
  const comparison = useQuery({ queryKey: ["entity-comparison"], queryFn: () => appApi.get("/api/multitenancy/entity-comparison") });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Multi-Entity Overview</h1>
            <p className="text-gray-500 mt-1">Cross-entity summary and comparison from the `latest-changes` branch.</p>
          </div>
          <Button variant="outline" onClick={() => { summary.refetch(); comparison.refetch(); }}><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
        </div>

        <Card className="bg-gradient-to-r from-slate-900 to-blue-900 text-white">
          <CardHeader><CardTitle className="text-white">Combined Net Worth</CardTitle></CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">${Number(summary.data?.total_net_worth ?? 0).toFixed(2)}</div>
            <p className="text-sm text-blue-100 mt-2">Across {summary.data?.entity_count ?? 0} accessible entities</p>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(summary.data?.entities ?? []).map((entity) => (
            <Card key={entity.entity_id}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-blue-700" />{entity.entity_name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between"><span className="text-gray-500">Cash</span><span className="font-medium">${Number(entity.total_cash).toFixed(2)}</span></div>
                <div className="flex items-center justify-between"><span className="text-gray-500">Investments</span><span className="font-medium">${Number(entity.total_investments).toFixed(2)}</span></div>
                <div className="flex items-center justify-between"><span className="text-gray-500">Debt</span><span className="font-medium text-red-600">${Number(entity.total_debt).toFixed(2)}</span></div>
                <div className="flex items-center justify-between border-t pt-2"><span className="text-gray-500">Net Worth</span><span className={`font-semibold ${Number(entity.net_worth) >= 0 ? "text-green-700" : "text-red-600"}`}>${Number(entity.net_worth).toFixed(2)}</span></div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ArrowRightLeft className="w-5 h-5 text-blue-700" />Monthly Income vs Expenses</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer className="h-[320px] w-full" config={{ monthly_income: { label: "Income", color: "#22c55e" }, monthly_expenses: { label: "Expenses", color: "#ef4444" } }}>
              <BarChart data={comparison.data?.comparisons ?? []} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tickFormatter={(value) => `$${Number(value).toFixed(0)}`} />
                <YAxis type="category" dataKey="entity_name" width={140} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="monthly_income" fill="var(--color-monthly_income)" radius={[0, 4, 4, 0]} />
                <Bar dataKey="monthly_expenses" fill="var(--color-monthly_expenses)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
