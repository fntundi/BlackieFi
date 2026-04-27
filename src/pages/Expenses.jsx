import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Receipt } from "lucide-react";
import { toast } from "sonner";

const EMPTY_FORM = {
  entity_id: "",
  name: "",
  amount: "",
  frequency: "monthly",
  category_id: ""
};

export default function Expenses() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: entities = [] } = useQuery({ queryKey: ["entities"], queryFn: () => base44.entities.Entity.list() });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: () => base44.entities.Category.list() });
  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list("-created_date")
  });

  const createExpense = useMutation({
    mutationFn: (payload) => base44.entities.Expense.create(payload),
    onSuccess: () => {
      toast.success("Expense added");
      setOpen(false);
      setForm(EMPTY_FORM);
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    }
  });

  const monthlyTotal = useMemo(() => expenses.reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0), [expenses]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Expenses</h1>
            <p className="text-gray-500 mt-1">Track recurring obligations and expected monthly burn.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Expense</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
              <form className="space-y-4" onSubmit={(event) => {
                event.preventDefault();
                createExpense.mutate({
                  ...form,
                  amount: Number(form.amount || 0),
                  is_recurring: true,
                  is_active: true
                });
              }}>
                <div>
                  <Label>Entity</Label>
                  <Select value={form.entity_id} onValueChange={(value) => setForm((current) => ({ ...current, entity_id: value }))}>
                    <SelectTrigger><SelectValue placeholder="Select entity" /></SelectTrigger>
                    <SelectContent>{entities.map((entity) => <SelectItem key={entity.id} value={entity.id}>{entity.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Amount</Label>
                    <Input type="number" step="0.01" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} required />
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
                  <Label>Category</Label>
                  <Select value={form.category_id} onValueChange={(value) => setForm((current) => ({ ...current, category_id: value }))}>
                    <SelectTrigger><SelectValue placeholder="Optional category" /></SelectTrigger>
                    <SelectContent>{categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={createExpense.isPending}>
                  {createExpense.isPending ? "Saving..." : "Save Expense"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="bg-gradient-to-r from-red-600 to-orange-500 text-white">
          <CardHeader className="pb-2"><CardTitle className="text-white text-sm font-medium">Recurring Expense Load</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-3xl font-bold">${monthlyTotal.toFixed(2)}</div>
            <Receipt className="w-8 h-8 opacity-80" />
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {expenses.map((expense) => (
            <Card key={expense.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{expense.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-2xl font-bold text-red-600">${Number(expense.amount ?? 0).toFixed(2)}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">{expense.frequency}</Badge>
                  {expense.category_id && <Badge variant="secondary">{categories.find((category) => category.id === expense.category_id)?.name || "Category"}</Badge>}
                </div>
                <p className="text-sm text-gray-500">{entities.find((entity) => entity.id === expense.entity_id)?.name || "Unassigned entity"}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
