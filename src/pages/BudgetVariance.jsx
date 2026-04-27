import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart3 } from "lucide-react";

export default function BudgetVariance() {
  const [entityId, setEntityId] = useState("all");
  const currentMonth = new Date().toISOString().slice(0, 7);

  const { data: entities = [] } = useQuery({ queryKey: ["entities"], queryFn: () => base44.entities.Entity.list() });
  const { data: budgets = [] } = useQuery({ queryKey: ["budgets"], queryFn: () => base44.entities.Budget.list() });
  const { data: transactions = [] } = useQuery({ queryKey: ["transactions"], queryFn: () => base44.entities.Transaction.list() });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: () => base44.entities.Category.list() });

  const varianceRows = useMemo(() => {
    const scopedBudgets = budgets.filter((budget) => (entityId === "all" || budget.entity_id === entityId) && String(budget.month ?? currentMonth) === currentMonth);
    return scopedBudgets.map((budget) => {
      const categoryTransactions = transactions.filter((transaction) =>
        transaction.entity_id === budget.entity_id &&
        transaction.category_id === budget.category_id &&
        transaction.type === "expense" &&
        String(transaction.date ?? "").startsWith(currentMonth)
      );
      const actual = categoryTransactions.reduce((sum, transaction) => sum + Number(transaction.amount ?? 0), 0);
      const budgeted = Number(budget.amount ?? 0);
      return {
        id: budget.id,
        categoryName: categories.find((category) => category.id === budget.category_id)?.name || "Uncategorized",
        budgeted,
        actual,
        variance: budgeted - actual
      };
    });
  }, [budgets, categories, currentMonth, entityId, transactions]);

  const totals = varianceRows.reduce((accumulator, row) => ({
    budgeted: accumulator.budgeted + row.budgeted,
    actual: accumulator.actual + row.actual,
    variance: accumulator.variance + row.variance
  }), { budgeted: 0, actual: 0, variance: 0 });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Budget Variance</h1>
            <p className="text-gray-500 mt-1">Surface the branch’s budget-vs-actual workflow without changing the current shell.</p>
          </div>
          <Select value={entityId} onValueChange={setEntityId}>
            <SelectTrigger className="w-60"><SelectValue placeholder="All entities" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All entities</SelectItem>
              {entities.map((entity) => <SelectItem key={entity.id} value={entity.id}>{entity.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-gray-600">Budgeted</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">${totals.budgeted.toFixed(2)}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-gray-600">Actual</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">${totals.actual.toFixed(2)}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-gray-600">Variance</CardTitle></CardHeader><CardContent><div className={`text-2xl font-bold ${totals.variance >= 0 ? "text-green-700" : "text-red-600"}`}>{totals.variance >= 0 ? "+" : ""}${totals.variance.toFixed(2)}</div></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-blue-700" />Category Variance - {currentMonth}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {varianceRows.map((row) => (
              <div key={row.id} className="rounded-lg border p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{row.categoryName}</p>
                    <p className="text-sm text-gray-500">Budget ${row.budgeted.toFixed(2)} • Actual ${row.actual.toFixed(2)}</p>
                  </div>
                  <Badge variant={row.variance >= 0 ? "secondary" : "destructive"} className="w-fit">
                    {row.variance >= 0 ? "Under Budget" : "Over Budget"}
                  </Badge>
                </div>
                <div className="mt-3 h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-full ${row.actual <= row.budgeted ? "bg-green-500" : "bg-red-500"}`} style={{ width: `${Math.min(100, row.budgeted > 0 ? (row.actual / row.budgeted) * 100 : 100)}%` }} />
                </div>
                <p className={`mt-2 text-sm font-medium ${row.variance >= 0 ? "text-green-700" : "text-red-600"}`}>
                  {row.variance >= 0 ? "Remaining cushion" : "Overrun"}: ${Math.abs(row.variance).toFixed(2)}
                </p>
              </div>
            ))}
            {!varianceRows.length && <p className="text-center py-8 text-gray-500">No budgets found for {currentMonth}.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
