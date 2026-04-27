import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DebtRepaymentAnalysis from "@/components/DebtRepaymentAnalysis";

export default function DebtPayoff() {
  const [entityId, setEntityId] = useState("");
  const { data: entities = [] } = useQuery({ queryKey: ["entities"], queryFn: () => base44.entities.Entity.list() });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Debt Payoff</h1>
            <p className="text-gray-500 mt-1">Avalanche and snowball planning integrated from the `latest-changes` feature set.</p>
          </div>
          <Select value={entityId} onValueChange={setEntityId}>
            <SelectTrigger className="w-60"><SelectValue placeholder="Select entity" /></SelectTrigger>
            <SelectContent>{entities.map((entity) => <SelectItem key={entity.id} value={entity.id}>{entity.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {entityId ? (
          <DebtRepaymentAnalysis entityId={entityId} />
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            Pick an entity to generate debt payoff scenarios.
          </div>
        )}
      </div>
    </div>
  );
}
