import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, DollarSign } from "lucide-react";
import { toast } from "sonner";

const EMPTY_FORM = {
  entity_id: "",
  name: "",
  income_type: "salary",
  amount: "",
  frequency: "monthly"
};

export default function Income() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: entities = [] } = useQuery({
    queryKey: ["entities"],
    queryFn: () => base44.entities.Entity.list()
  });

  const { data: incomes = [] } = useQuery({
    queryKey: ["income-sources"],
    queryFn: () => base44.entities.IncomeSource.list("-created_date")
  });

  const createIncome = useMutation({
    mutationFn: (payload) => base44.entities.IncomeSource.create(payload),
    onSuccess: () => {
      toast.success("Income source added");
      setOpen(false);
      setForm(EMPTY_FORM);
      queryClient.invalidateQueries({ queryKey: ["income-sources"] });
    }
  });

  const total = incomes.reduce((sum, income) => sum + Number(income.amount ?? 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Income</h1>
            <p className="text-gray-500 mt-1">Capture salaries, contract revenue, and other recurring inflows.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Income
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Income Source</DialogTitle></DialogHeader>
              <form className="space-y-4" onSubmit={(event) => {
                event.preventDefault();
                createIncome.mutate({ ...form, amount: Number(form.amount || 0), is_active: true });
              }}>
                <div>
                  <Label>Entity</Label>
                  <Select value={form.entity_id} onValueChange={(value) => setForm((current) => ({ ...current, entity_id: value }))}>
                    <SelectTrigger><SelectValue placeholder="Select entity" /></SelectTrigger>
                    <SelectContent>
                      {entities.map((entity) => <SelectItem key={entity.id} value={entity.id}>{entity.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Type</Label>
                    <Select value={form.income_type} onValueChange={(value) => setForm((current) => ({ ...current, income_type: value }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="salary">Salary</SelectItem>
                        <SelectItem value="business">Business</SelectItem>
                        <SelectItem value="freelance">Freelance</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Frequency</Label>
                    <Select value={form.frequency} onValueChange={(value) => setForm((current) => ({ ...current, frequency: value }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="biweekly">Biweekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Amount</Label>
                  <Input type="number" step="0.01" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} required />
                </div>
                <Button type="submit" className="w-full" disabled={createIncome.isPending}>
                  {createIncome.isPending ? "Saving..." : "Save Income"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="bg-gradient-to-r from-green-600 to-emerald-500 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm font-medium">Tracked Recurring Income</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-3xl font-bold">${total.toFixed(2)}</div>
            <DollarSign className="w-8 h-8 opacity-80" />
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {incomes.map((income) => (
            <Card key={income.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{income.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-2xl font-bold text-green-700">${Number(income.amount ?? 0).toFixed(2)}</p>
                <p className="text-sm text-gray-500 capitalize">{income.income_type} • {income.frequency}</p>
                <p className="text-sm text-gray-500">{entities.find((entity) => entity.id === income.entity_id)?.name || "Unassigned entity"}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
