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
import { Plus, Wallet, Landmark, Trash2 } from "lucide-react";
import { toast } from "sonner";

const EMPTY_FORM = {
  name: "",
  account_type: "checking",
  institution: "",
  balance: "",
  currency: "USD",
  entity_id: ""
};

export default function Accounts() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => base44.entities.Account.list("-created_date")
  });

  const { data: entities = [] } = useQuery({
    queryKey: ["entities"],
    queryFn: () => base44.entities.Entity.list()
  });

  const totals = useMemo(() => ({
    total: accounts.reduce((sum, account) => sum + Number(account.balance ?? 0), 0),
    positive: accounts.filter((account) => Number(account.balance ?? 0) >= 0).length
  }), [accounts]);

  const createAccount = useMutation({
    mutationFn: (payload) => base44.entities.Account.create(payload),
    onSuccess: () => {
      toast.success("Account added");
      setForm(EMPTY_FORM);
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    }
  });

  const deleteAccount = useMutation({
    mutationFn: (id) => base44.entities.Account.delete(id),
    onSuccess: () => {
      toast.success("Account removed");
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    }
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    createAccount.mutate({
      ...form,
      balance: Number(form.balance || 0),
      is_active: true
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Accounts</h1>
            <p className="text-gray-500 mt-1">Track cash, credit, and operating balances across entities.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Account</DialogTitle>
              </DialogHeader>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
                </div>
                <div>
                  <Label>Entity</Label>
                  <Select value={form.entity_id} onValueChange={(value) => setForm((current) => ({ ...current, entity_id: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select entity" />
                    </SelectTrigger>
                    <SelectContent>
                      {entities.map((entity) => (
                        <SelectItem key={entity.id} value={entity.id}>{entity.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Type</Label>
                    <Select value={form.account_type} onValueChange={(value) => setForm((current) => ({ ...current, account_type: value }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="checking">Checking</SelectItem>
                        <SelectItem value="savings">Savings</SelectItem>
                        <SelectItem value="credit_card">Credit Card</SelectItem>
                        <SelectItem value="investment">Investment</SelectItem>
                        <SelectItem value="loan">Loan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Balance</Label>
                    <Input type="number" step="0.01" value={form.balance} onChange={(event) => setForm((current) => ({ ...current, balance: event.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label>Institution</Label>
                  <Input value={form.institution} onChange={(event) => setForm((current) => ({ ...current, institution: event.target.value }))} />
                </div>
                <Button type="submit" className="w-full" disabled={createAccount.isPending}>
                  {createAccount.isPending ? "Saving..." : "Save Account"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Total Accounts</CardTitle>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{accounts.length}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Positive Balances</CardTitle>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold text-green-700">{totals.positive}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">Net Balance</CardTitle>
            </CardHeader>
            <CardContent><div className={`text-2xl font-bold ${totals.total >= 0 ? "text-blue-800" : "text-red-600"}`}>${totals.total.toFixed(2)}</div></CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                      {account.account_type === "credit_card" ? <Wallet className="w-5 h-5 text-blue-700" /> : <Landmark className="w-5 h-5 text-blue-700" />}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{account.name}</CardTitle>
                      <p className="text-sm text-gray-500">{account.institution || "No institution"}</p>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => deleteAccount.mutate(account.id)}>
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="capitalize">{String(account.account_type).replaceAll("_", " ")}</Badge>
                  <span className={`text-xl font-semibold ${Number(account.balance ?? 0) >= 0 ? "text-green-700" : "text-red-600"}`}>
                    {account.currency || "USD"} {Number(account.balance ?? 0).toFixed(2)}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  {entities.find((entity) => entity.id === account.entity_id)?.name || "Unassigned entity"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
