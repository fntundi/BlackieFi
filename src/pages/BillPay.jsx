import React, { useMemo, useState } from "react";
import { appApi } from "@/lib/app-api";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Play, Plus, RefreshCw, Trash2 } from "lucide-react";

const EMPTY_FORM = {
  name: "",
  amount: "",
  frequency: "monthly",
  day_of_month: "1",
  source_type: "expense",
  account_id: "",
  category_id: "",
  enabled: true
};

export default function BillPay() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const schedules = useQuery({ queryKey: ["billpay-schedules"], queryFn: () => appApi.get("/api/billpay/schedules") });
  const history = useQuery({ queryKey: ["billpay-history"], queryFn: () => appApi.get("/api/billpay/history") });

  const refresh = () => {
    schedules.refetch();
    history.refetch();
  };

  const scheduleRows = schedules.data?.schedules ?? [];
  const dueCount = useMemo(() => scheduleRows.filter((row) => row.enabled && String(row.next_payment_date ?? "") <= new Date().toISOString().slice(0, 10)).length, [scheduleRows]);

  const saveSchedule = async (event) => {
    event.preventDefault();
    await appApi.post("/api/billpay/schedules", {
      ...form,
      amount: Number(form.amount || 0),
      day_of_month: Number(form.day_of_month || 1)
    });
    setOpen(false);
    setForm(EMPTY_FORM);
    refresh();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bill Pay Scheduling</h1>
            <p className="text-gray-500 mt-1">Automated bill-pay workflow imported from `latest-changes`.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={async () => { await appApi.post("/api/billpay/process-due", {}); refresh(); }}><RefreshCw className="w-4 h-4 mr-2" />Process Due</Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />New Schedule</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Bill Schedule</DialogTitle></DialogHeader>
                <form className="space-y-4" onSubmit={saveSchedule}>
                  <div><Label>Name</Label><Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required /></div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div><Label>Amount</Label><Input type="number" step="0.01" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} required /></div>
                    <div><Label>Frequency</Label><select className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm" value={form.frequency} onChange={(event) => setForm((current) => ({ ...current, frequency: event.target.value }))}><option value="weekly">Weekly</option><option value="biweekly">Biweekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="annually">Annually</option></select></div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div><Label>Day of Month</Label><Input type="number" min="1" max="28" value={form.day_of_month} onChange={(event) => setForm((current) => ({ ...current, day_of_month: event.target.value }))} /></div>
                    <div><Label>Type</Label><select className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm" value={form.source_type} onChange={(event) => setForm((current) => ({ ...current, source_type: event.target.value }))}><option value="expense">Expense</option><option value="income">Income</option><option value="debt_payment">Debt Payment</option></select></div>
                  </div>
                  <Button type="submit" className="w-full">Save Schedule</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-gray-600">Schedules</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{scheduleRows.length}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-gray-600">Due Now</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-amber-600">{dueCount}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-gray-600">Payment History</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{(history.data?.history ?? []).length}</div></CardContent></Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><CalendarClock className="w-5 h-5 text-blue-700" />Schedules</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {scheduleRows.map((schedule) => (
                <div key={schedule.id} className="rounded-lg border p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{schedule.name}</p>
                        <Badge variant={schedule.enabled ? "secondary" : "outline"}>{schedule.enabled ? "Enabled" : "Disabled"}</Badge>
                      </div>
                      <p className="text-sm text-gray-500">{schedule.frequency} • next {schedule.next_payment_date}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">${Number(schedule.amount ?? 0).toFixed(2)}</Badge>
                      <Button size="icon" variant="outline" onClick={async () => { await appApi.post(`/api/billpay/schedules/${schedule.id}/pay-now`, {}); refresh(); }}><Play className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={async () => { await appApi.delete(`/api/billpay/schedules/${schedule.id}`); refresh(); }}><Trash2 className="w-4 h-4 text-red-600" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Recent Payments</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {(history.data?.history ?? []).slice(0, 10).map((item) => (
                <div key={item.id} className="rounded-lg border p-3">
                  <p className="font-medium text-gray-900">{item.description}</p>
                  <p className="text-sm text-gray-500">{item.date}</p>
                  <p className={`text-sm font-semibold ${item.type === "income" ? "text-green-700" : "text-red-600"}`}>{item.type === "income" ? "+" : "-"}${Number(item.amount ?? 0).toFixed(2)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
