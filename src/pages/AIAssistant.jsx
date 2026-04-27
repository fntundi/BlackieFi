import React, { useState } from "react";
import { appApi } from "@/lib/app-api";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Lightbulb, Send, Sparkles, Tag } from "lucide-react";

export default function AIAssistant() {
  const [tab, setTab] = useState("chat");
  const [prompt, setPrompt] = useState("");
  const [categorize, setCategorize] = useState({ description: "", amount: "" });
  const [messages, setMessages] = useState([]);
  const [insights, setInsights] = useState("");
  const [categoryResult, setCategoryResult] = useState(null);
  const settings = useQuery({ queryKey: ["ai-settings"], queryFn: () => appApi.get("/api/ai/settings") });

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!prompt.trim()) return;
    const userMessage = { role: "user", content: prompt };
    setMessages((current) => [...current, userMessage]);
    const response = await appApi.post("/api/ai/chat", { message: prompt });
    setMessages((current) => [...current, { role: "assistant", content: response.response }]);
    setPrompt("");
  };

  const generateInsights = async () => {
    const response = await appApi.post("/api/ai/insights", {});
    setInsights(response.insights);
  };

  const categorizeTransaction = async () => {
    const response = await appApi.post(`/api/ai/categorize?description=${encodeURIComponent(categorize.description)}&amount=${encodeURIComponent(categorize.amount || "0")}`, {});
    setCategoryResult(response);
  };

  const enabled = settings.data?.ai_enabled;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Assistant</h1>
          <p className="text-gray-500 mt-1">Provider-agnostic assistant plumbing, ready for the MCP service layer.</p>
        </div>

        <div className="flex gap-2">
          <Button variant={tab === "chat" ? "default" : "outline"} onClick={() => setTab("chat")}><Bot className="w-4 h-4 mr-2" />Chat</Button>
          <Button variant={tab === "insights" ? "default" : "outline"} onClick={() => setTab("insights")}><Lightbulb className="w-4 h-4 mr-2" />Insights</Button>
          <Button variant={tab === "categorize" ? "default" : "outline"} onClick={() => setTab("categorize")}><Tag className="w-4 h-4 mr-2" />Categorize</Button>
        </div>

        {!enabled && (
          <Card>
            <CardContent className="pt-6 text-sm text-gray-600">
              AI features are currently disabled in settings. You can still test the local heuristic responses while provider wiring is completed.
            </CardContent>
          </Card>
        )}

        {tab === "chat" && (
          <Card>
            <CardHeader><CardTitle>Financial Chat</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 rounded-lg border bg-white p-4">
                {messages.map((message, index) => (
                  <div key={index} className={`rounded-lg p-3 text-sm ${message.role === "user" ? "bg-blue-50" : "bg-slate-100"}`}>
                    <span className="font-semibold mr-2">{message.role === "user" ? "You" : "BlackieFi"}</span>
                    {message.content}
                  </div>
                ))}
                {!messages.length && <p className="text-sm text-gray-500">Ask for a cash-flow snapshot, debt summary, or a planning nudge.</p>}
              </div>
              <form className="flex gap-3" onSubmit={sendMessage}>
                <Input value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="How am I doing this month?" />
                <Button type="submit"><Send className="w-4 h-4" /></Button>
              </form>
            </CardContent>
          </Card>
        )}

        {tab === "insights" && (
          <Card>
            <CardHeader><CardTitle>AI Insights</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={generateInsights}><Sparkles className="w-4 h-4 mr-2" />Generate Insights</Button>
              {insights && <div className="rounded-lg border bg-slate-950 p-4 text-sm text-slate-100 whitespace-pre-wrap">{insights}</div>}
            </CardContent>
          </Card>
        )}

        {tab === "categorize" && (
          <Card>
            <CardHeader><CardTitle>Auto-Categorize a Transaction</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input value={categorize.description} onChange={(event) => setCategorize((current) => ({ ...current, description: event.target.value }))} placeholder="Transaction description" />
              <Input type="number" value={categorize.amount} onChange={(event) => setCategorize((current) => ({ ...current, amount: event.target.value }))} placeholder="Amount" />
              <Button onClick={categorizeTransaction}><Tag className="w-4 h-4 mr-2" />Suggest Category</Button>
              {categoryResult && <p className="text-sm text-gray-700">Suggested category: <span className="font-semibold">{categoryResult.category}</span> ({Math.round(Number(categoryResult.confidence ?? 0) * 100)}% confidence)</p>}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
