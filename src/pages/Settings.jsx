import React, { useState } from "react";
import { Link } from "react-router-dom";
import { appApi } from "@/lib/app-api";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import { Bot, Globe, Lock, Settings2, Sparkles, Tags, Users } from "lucide-react";

export default function Settings() {
  const [saving, setSaving] = useState(false);
  const settings = useQuery({ queryKey: ["ai-settings"], queryFn: () => appApi.get("/api/ai/settings") });
  const [aiEnabled, setAiEnabled] = useState(false);

  React.useEffect(() => {
    if (settings.data) {
      setAiEnabled(Boolean(settings.data.ai_enabled));
    }
  }, [settings.data]);

  const saveAiSettings = async () => {
    setSaving(true);
    await appApi.put("/api/ai/settings", { ai_enabled: aiEnabled, ai_available: settings.data?.ai_available, ai_model: settings.data?.ai_model || "provider-default" });
    setSaving(false);
    settings.refetch();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">A home for the branch’s consolidated settings surface, built on top of the current pages.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Link to={createPageUrl("Categories")}><Card className="h-full hover:shadow-md transition-shadow"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Tags className="w-5 h-5 text-blue-700" />Categories</CardTitle></CardHeader><CardContent className="text-sm text-gray-600">Manage transaction taxonomies and auto-categorization rules.</CardContent></Card></Link>
          <Link to={createPageUrl("Groups")}><Card className="h-full hover:shadow-md transition-shadow"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Users className="w-5 h-5 text-blue-700" />Roles & Access</CardTitle></CardHeader><CardContent className="text-sm text-gray-600">Use the current groups and access-control tools as the self-hosted replacement.</CardContent></Card></Link>
          <Link to={createPageUrl("FinancialSettings")}><Card className="h-full hover:shadow-md transition-shadow"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Settings2 className="w-5 h-5 text-blue-700" />Financial Profile</CardTitle></CardHeader><CardContent className="text-sm text-gray-600">Risk tolerance, planning horizon, and long-range goals.</CardContent></Card></Link>
          <Link to={createPageUrl("AIAssistant")}><Card className="h-full hover:shadow-md transition-shadow"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Bot className="w-5 h-5 text-blue-700" />AI Assistant</CardTitle></CardHeader><CardContent className="text-sm text-gray-600">Chat, insights, and categorization controls.</CardContent></Card></Link>
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-blue-700" />AI Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium text-gray-900">Enable AI features</p>
                <p className="text-sm text-gray-500">Provider wiring still comes from environment and the MCP-side service.</p>
              </div>
              <input type="checkbox" checked={aiEnabled} onChange={(event) => setAiEnabled(event.target.checked)} className="h-4 w-4" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border p-4"><p className="font-medium text-gray-900 flex items-center gap-2"><Lock className="w-4 h-4 text-blue-700" />MFA</p><p className="mt-2 text-sm text-gray-500">Reserved for the next auth hardening pass.</p></div>
              <div className="rounded-lg border p-4"><p className="font-medium text-gray-900 flex items-center gap-2"><Globe className="w-4 h-4 text-blue-700" />Currency</p><p className="mt-2 text-sm text-gray-500">Currency settings are queued behind the provider-agnostic financial config work.</p></div>
            </div>
            <Button onClick={saveAiSettings} disabled={saving}>{saving ? "Saving..." : "Save AI Settings"}</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
