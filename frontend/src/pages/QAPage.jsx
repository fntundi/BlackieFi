import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { FileText, Upload, Trash2, Search, Loader2, MessageCircle, X } from "lucide-react";

export default function QAPage() {
  const [documents, setDocuments] = useState([]);
  const [status, setStatus] = useState({ available: false, documents_count: 0 });
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, d] = await Promise.all([api.get("/rag/status"), api.get("/rag/documents")]);
      setStatus(s.data);
      setDocuments(d.data);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      await api.post("/rag/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
      await load();
    } catch (err) {
      alert(err.response?.data?.detail || "Upload failed");
    } finally { setUploading(false); e.target.value = ""; }
  };

  const deleteDoc = async (id) => {
    await api.delete(`/rag/documents/${id}`);
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  const askQuestion = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setAnswer(null);
    try {
      const r = await api.post("/rag/query", { question });
      setAnswer(r.data);
    } catch (err) {
      setAnswer({ answer: err.response?.data?.detail || "Error", sources: [] });
    } finally { setLoading(false); }
  };

  return (
    <div className="page-container" data-testid="qa-page">
      <div className="page-header-row">
        <h2><MessageCircle size={22} /> Document Q&A</h2>
        <label className="btn-primary upload-btn" data-testid="upload-doc-btn">
          {uploading ? <><Loader2 size={16} className="spin" /> Uploading...</> : <><Upload size={16} /> Upload Document</>}
          <input type="file" accept=".txt,.csv,.md,.json" onChange={handleUpload} hidden disabled={uploading} />
        </label>
      </div>

      <p className="text-muted">Upload financial documents and ask questions. AI will answer based on document content.</p>

      {documents.length > 0 && (
        <div className="rag-documents" data-testid="rag-documents-list">
          <h4>Uploaded Documents ({documents.length})</h4>
          {documents.map(doc => (
            <div key={doc.id} className="rag-doc-item" data-testid={`rag-doc-${doc.id}`}>
              <FileText size={16} />
              <div className="rag-doc-info">
                <span className="rag-doc-name">{doc.filename}</span>
                <span className="rag-doc-meta">{doc.chunk_count} chunks - {doc.status}</span>
              </div>
              <button onClick={() => deleteDoc(doc.id)} className="btn-icon-sm" data-testid={`delete-doc-${doc.id}`}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}

      <div className="rag-query-section" data-testid="rag-query-section">
        <form onSubmit={askQuestion} className="ai-input-form">
          <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Ask a question about your documents..."
                 disabled={loading} data-testid="rag-query-input" />
          <button type="submit" disabled={loading || !question.trim()} data-testid="rag-query-btn">
            {loading ? <Loader2 size={18} className="spin" /> : <Search size={18} />}
          </button>
        </form>
      </div>

      {answer && (
        <div className="rag-answer" data-testid="rag-answer">
          <h4>Answer</h4>
          <div className="rag-answer-content">{answer.answer}</div>
          {answer.sources?.length > 0 && (
            <div className="rag-sources">
              <h5>Sources ({answer.sources.length})</h5>
              {answer.sources.map((s, i) => (
                <div key={i} className="rag-source-item">{s}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {documents.length === 0 && !answer && (
        <div className="empty-state-card">
          <FileText size={48} className="empty-icon" />
          <h3>No Documents Uploaded</h3>
          <p>Upload text, CSV, or markdown files to start asking questions about their content.</p>
        </div>
      )}
    </div>
  );
}
