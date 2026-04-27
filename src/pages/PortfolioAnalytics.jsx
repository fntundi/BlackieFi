import React, { useState } from "react";
import { appApi } from "@/lib/app-api";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart as RechartsBarChart, Bar, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { RefreshCw, TrendingDown, TrendingUp, Wallet } from "lucide-react";

const COLORS = ["#f59e0b", "#2563eb", "#22c55e", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function PortfolioAnalytics() {
  const [months, setMonths] = useState(12);
  const summary = useQuery({ queryKey: ["portfolio-summary"], queryFn: () => appApi.get("/api/portfolio-analytics/summary") });
  const allocation = useQuery({ queryKey: ["portfolio-allocation"], queryFn: () => appApi.get("/api/portfolio-analytics/allocation") });
  const history = useQuery({ queryKey: ["portfolio-history", months], queryFn: () => appApi.get(`/api/portfolio-analytics/history?months=${months}`) });
  const performance = useQuery({ queryKey: ["portfolio-performance", months], queryFn: () => appApi.get(`/api/portfolio-analytics/monthly-performance?months=${months}`) });

  const refresh = () => {
    summary.refetch();
    allocation.refetch();
    history.refetch();
    performance.refetch();
  };

  const snapshot = summary.data ?? { net_worth: 0, total_cash: 0, total_investments: 0, investment_gain: 0, investment_gain_pct: 0 };
  const allocationRows = allocation.data?.allocation ?? [];
  const historyRows = history.data?.history ?? [];
  const performanceRows = performance.data?.performance ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Portfolio Analytics</h1>
            <p className="text-gray-500 mt-1">Branch feature integrated into the current dashboard shell.</p>
          </div>
          <div className="flex items-center gap-3">
            <select value={months} onChange={(event) => setMonths(Number(event.target.value))} className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm">
              <option value={6}>6 months</option>
              <option value={12}>12 months</option>
              <option value={24}>24 months</option>
            </select>
            <Button variant="outline" onClick={refresh}><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-gray-600">Net Worth</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">${Number(snapshot.net_worth).toFixed(2)}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-gray-600">Total Cash</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">${Number(snapshot.total_cash).toFixed(2)}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-gray-600">Investments</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">${Number(snapshot.total_investments).toFixed(2)}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-gray-600">Gain / Loss</CardTitle></CardHeader><CardContent><div className={`text-2xl font-bold ${Number(snapshot.investment_gain) >= 0 ? "text-green-700" : "text-red-600"}`}>{Number(snapshot.investment_gain) >= 0 ? "+" : ""}${Number(snapshot.investment_gain).toFixed(2)} <span className="text-sm">({Number(snapshot.investment_gain_pct).toFixed(1)}%)</span></div></CardContent></Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-700" />Net Worth Over Time</CardTitle></CardHeader>
            <CardContent>
              <ChartContainer className="h-[320px] w-full" config={{ net_worth: { label: "Net Worth", color: "#f59e0b" }, investments: { label: "Investments", color: "#2563eb" }, cash_flow: { label: "Cash", color: "#22c55e" } }}>
                <LineChart data={historyRows}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `$${Number(value).toFixed(0)}`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="net_worth" stroke="var(--color-net_worth)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="investments" stroke="var(--color-investments)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="cash_flow" stroke="var(--color-cash_flow)" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Wallet className="w-5 h-5 text-blue-700" />Allocation</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={allocationRows} dataKey="value" nameKey="name" innerRadius={50} outerRadius={82} paddingAngle={3}>
                    {allocationRows.map((row, index) => <Cell key={row.name} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {allocationRows.map((row, index) => (
                  <div key={row.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span>{row.name}</span>
                    </div>
                    <span className="text-gray-600">{row.percentage}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><TrendingDown className="w-5 h-5 text-blue-700" />Monthly Income vs Expenses</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer className="h-[320px] w-full" config={{ income: { label: "Income", color: "#22c55e" }, expenses: { label: "Expenses", color: "#ef4444" } }}>
              <RechartsBarChart data={performanceRows}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `$${Number(value).toFixed(0)}`} />
                <Legend />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="var(--color-expenses)" radius={[4, 4, 0, 0]} />
              </RechartsBarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
