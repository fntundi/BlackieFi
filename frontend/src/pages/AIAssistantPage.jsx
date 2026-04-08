import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "@/lib/api";
import { Send, Bot, User, Loader2, Lightbulb, Sparkles, X, Tag } from "lucide-react";

export default function AIAssistantPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({ ai_enabled: false, ai_available: false, ai_model: "phi" });
  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [tab, setTab] = useState("chat");
  const scrollRef = useRef(null);

  const loadSettings = useCallback(async () => {
    try {
      const r = await api.get("/ai/settings");
      setSettings(r.data);
    } catch {}
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const r = await api.get("/ai/history?limit=50");
      setMessages(r.data);
    } catch {}
  }, []);

  useEffect(() => { loadSettings(); loadHistory(); }, [loadSettings, loadHistory]);
  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const r = await api.post("/ai/chat", { message: input });
      setMessages(prev => [...prev, { role: "assistant", content: r.data.response, created_at: new Date().toISOString() }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: err.response?.data?.detail || "Error getting response", created_at: new Date().toISOString() }]);
    } finally { setLoading(false); }
  };

  const getInsights = async () => {
    setInsightsLoading(true);
    try {
      const r = await api.post("/ai/insights");
      setInsights(r.data.insights);
    } catch (err) {
      setInsights(err.response?.data?.detail || "Could not generate insights");
    } finally { setInsightsLoading(false); }
  };

  if (!settings.ai_enabled) {
    return (
      <div className="page-container" data-testid="ai-assistant-page">
        <div className="empty-state-card">
          <Sparkles size={48} className="empty-icon" />
          <h2>AI Features Disabled</h2>
          <p>Enable AI features in Settings to use the financial assistant, get insights, and auto-categorize transactions.</p>
          <p className="text-muted" style={{marginTop: "8px"}}>
            {settings.ai_available ? "Ollama AI service is available and ready." : "Note: AI service (Ollama) is not currently available."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" data-testid="ai-assistant-page">
      <div className="ai-tabs" data-testid="ai-tabs">
        <button className={`ai-tab ${tab === "chat" ? "active" : ""}`} onClick={() => setTab("chat")} data-testid="ai-tab-chat">
          <Bot size={16} /> Chat
        </button>
        <button className={`ai-tab ${tab === "insights" ? "active" : ""}`} onClick={() => setTab("insights")} data-testid="ai-tab-insights">
          <Lightbulb size={16} /> Insights
        </button>
        <button className={`ai-tab ${tab === "categorize" ? "active" : ""}`} onClick={() => setTab("categorize")} data-testid="ai-tab-categorize">
          <Tag size={16} /> Auto-Categorize
        </button>
      </div>

      {tab === "chat" && (
        <div className="ai-chat-container" data-testid="ai-chat">
          <div className="ai-messages">
            {messages.length === 0 && (
              <div className="ai-welcome">
                <Bot size={40} />
                <h3>BlackieFi AI Assistant</h3>
                <p>Ask me anything about your finances, budgeting strategies, or investment advice.</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`ai-message ${msg.role}`}>
                <div className="ai-message-avatar">
                  {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className="ai-message-content">{msg.content}</div>
              </div>
            ))}
            {loading && (
              <div className="ai-message assistant">
                <div className="ai-message-avatar"><Bot size={16} /></div>
                <div className="ai-message-content"><Loader2 size={16} className="spin" /> Thinking...</div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
          <form onSubmit={sendMessage} className="ai-input-form" data-testid="ai-chat-form">
            <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask about your finances..." disabled={loading} data-testid="ai-chat-input" />
            <button type="submit" disabled={loading || !input.trim()} data-testid="ai-send-btn"><Send size={18} /></button>
          </form>
        </div>
      )}

      {tab === "insights" && (
        <div className="ai-insights-container" data-testid="ai-insights">
          <div className="section-header">
            <h3>AI Financial Insights</h3>
            <button className="btn-primary" onClick={getInsights} disabled={insightsLoading} data-testid="generate-insights-btn">
              {insightsLoading ? <><Loader2 size={16} className="spin" /> Generating...</> : <><Sparkles size={16} /> Generate Insights</>}
            </button>
          </div>
          {insights && (
            <div className="insights-content" data-testid="insights-result">
              <pre style={{whiteSpace: "pre-wrap", fontFamily: "inherit"}}>{insights}</pre>
            </div>
          )}
        </div>
      )}

      {tab === "categorize" && <CategorizeTool />}
    </div>
  );
}

function CategorizeTool() {
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const categorize = async () => {
    if (!desc) return;
    setLoading(true);
    try {
      const r = await api.post(`/ai/categorize?description=${encodeURIComponent(desc)}&amount=${amount || 0}`);
      setResult(r.data);
    } catch (err) {
      setResult({ category: "Error", confidence: 0 });
    } finally { setLoading(false); }
  };

  return (
    <div className="categorize-container" data-testid="ai-categorize">
      <h3>Auto-Categorize Transaction</h3>
      <p className="text-muted">Enter a transaction description and the AI will suggest a category.</p>
      <div className="form-row">
        <input placeholder="Transaction description" value={desc} onChange={e => setDesc(e.target.value)} data-testid="categorize-desc" />
        <input placeholder="Amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} data-testid="categorize-amount" />
        <button className="btn-primary" onClick={categorize} disabled={loading || !desc} data-testid="categorize-btn">
          {loading ? <Loader2 size={16} className="spin" /> : <Tag size={16} />} Categorize
        </button>
      </div>
      {result && (
        <div className="categorize-result" data-testid="categorize-result">
          <span className="category-badge">{result.category}</span>
          <span className="confidence">Confidence: {(result.confidence * 100).toFixed(0)}%</span>
        </div>
      )}
    </div>
  );
}
