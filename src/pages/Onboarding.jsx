import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { appApi } from "@/lib/app-api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

const steps = [
  { key: "welcome", title: "Welcome" },
  { key: "income", title: "Income" },
  { key: "expenses", title: "Expenses" },
  { key: "debts", title: "Debts" },
  { key: "business", title: "Business" }
];

export default function Onboarding() {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [income, setIncome] = useState([{ name: "", amount: "", frequency: "monthly" }]);
  const [expenses, setExpenses] = useState([{ name: "", amount: "", frequency: "monthly" }]);
  const [debts, setDebts] = useState([{ name: "", original: "", balance: "" }]);
  const [business, setBusiness] = useState("");
  const { data: entities = [] } = useQuery({ queryKey: ["entities"], queryFn: () => base44.entities.Entity.list() });
  const personalEntity = entities.find((entity) => entity.type === "personal") ?? entities[0];

  const finish = async () => {
    if (personalEntity) {
      for (const item of income.filter((row) => row.name)) {
        await base44.entities.IncomeSource.create({ entity_id: personalEntity.id, name: item.name, amount: Number(item.amount || 0), frequency: item.frequency, income_type: "salary", is_active: true });
      }
      for (const item of expenses.filter((row) => row.name)) {
        await base44.entities.Expense.create({ entity_id: personalEntity.id, name: item.name, amount: Number(item.amount || 0), frequency: item.frequency, is_recurring: true, is_active: true });
      }
      for (const item of debts.filter((row) => row.name)) {
        await base44.entities.Debt.create({ entity_id: personalEntity.id, name: item.name, original_amount: Number(item.original || 0), current_balance: Number(item.balance || 0), debt_type: "loan", is_active: true });
      }
    }
    if (business.trim()) {
      await base44.entities.Entity.create({ name: business, type: "business", owner_email: (await base44.auth.me()).email });
    }
    await appApi.post("/api/onboarding/complete", {});
    queryClient.invalidateQueries({ queryKey: ["entities"] });
    setStep(0);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 md:p-10 space-y-6">
        <div className="flex items-center gap-2">
          {steps.map((current, index) => (
            <div key={current.key} className={`h-2 flex-1 rounded-full ${index <= step ? "bg-blue-700" : "bg-slate-200"}`} />
          ))}
        </div>
        <Card>
          <CardHeader><CardTitle>{steps[step].title}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {step === 0 && <p className="text-gray-600">Use the guided onboarding from `latest-changes` to seed your personal finance baseline without touching the existing shell.</p>}
            {step === 1 && income.map((row, index) => (
              <div key={index} className="grid gap-3 md:grid-cols-3">
                <Input placeholder="Income name" value={row.name} onChange={(event) => setIncome((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} />
                <Input type="number" placeholder="Amount" value={row.amount} onChange={(event) => setIncome((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, amount: event.target.value } : item))} />
                <Input placeholder="Frequency" value={row.frequency} onChange={(event) => setIncome((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, frequency: event.target.value } : item))} />
              </div>
            ))}
            {step === 1 && <Button variant="outline" onClick={() => setIncome((current) => [...current, { name: "", amount: "", frequency: "monthly" }])}>Add Income Row</Button>}
            {step === 2 && expenses.map((row, index) => (
              <div key={index} className="grid gap-3 md:grid-cols-3">
                <Input placeholder="Expense name" value={row.name} onChange={(event) => setExpenses((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} />
                <Input type="number" placeholder="Amount" value={row.amount} onChange={(event) => setExpenses((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, amount: event.target.value } : item))} />
                <Input placeholder="Frequency" value={row.frequency} onChange={(event) => setExpenses((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, frequency: event.target.value } : item))} />
              </div>
            ))}
            {step === 2 && <Button variant="outline" onClick={() => setExpenses((current) => [...current, { name: "", amount: "", frequency: "monthly" }])}>Add Expense Row</Button>}
            {step === 3 && debts.map((row, index) => (
              <div key={index} className="grid gap-3 md:grid-cols-3">
                <Input placeholder="Debt name" value={row.name} onChange={(event) => setDebts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} />
                <Input type="number" placeholder="Original amount" value={row.original} onChange={(event) => setDebts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, original: event.target.value } : item))} />
                <Input type="number" placeholder="Current balance" value={row.balance} onChange={(event) => setDebts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, balance: event.target.value } : item))} />
              </div>
            ))}
            {step === 3 && <Button variant="outline" onClick={() => setDebts((current) => [...current, { name: "", original: "", balance: "" }])}>Add Debt Row</Button>}
            {step === 4 && <Input placeholder="Optional business entity name" value={business} onChange={(event) => setBusiness(event.target.value)} />}
          </CardContent>
        </Card>
        <div className="flex items-center justify-between">
          <Button variant="outline" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep((current) => Math.min(steps.length - 1, current + 1))}>Next<ArrowRight className="w-4 h-4 ml-2" /></Button>
          ) : (
            <Button onClick={finish}>Finish Setup<Check className="w-4 h-4 ml-2" /></Button>
          )}
        </div>
      </div>
    </div>
  );
}
