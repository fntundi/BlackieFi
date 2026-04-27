import React, { useState } from "react";
import { appApi } from "@/lib/app-api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileQuestion, Trash2, Upload } from "lucide-react";

export default function DocumentQA() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);
  const queryClient = useQueryClient();
  const documents = useQuery({ queryKey: ["rag-documents"], queryFn: () => appApi.get("/api/rag/documents") });
  const status = useQuery({ queryKey: ["rag-status"], queryFn: () => appApi.get("/api/rag/status") });

  const uploadDocument = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    await appApi.post("/api/rag/upload", formData);
    queryClient.invalidateQueries({ queryKey: ["rag-documents"] });
    queryClient.invalidateQueries({ queryKey: ["rag-status"] });
    event.target.value = "";
  };

  const askQuestion = async (event) => {
    event.preventDefault();
    const response = await appApi.post("/api/rag/query", { question });
    setAnswer(response);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Document Q&A</h1>
          <p className="text-gray-500 mt-1">RAG-style document querying from the branch, adapted to the new API.</p>
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center justify-between"><span>Uploaded Documents</span><label className="inline-flex"><input type="file" className="hidden" accept=".txt,.csv,.md,.json" onChange={uploadDocument} /><Button asChild><span><Upload className="w-4 h-4 mr-2" />Upload</span></Button></label></CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-500">{status.data?.documents_count ?? 0} document(s) indexed.</p>
            {(documents.data ?? []).map((document) => (
              <div key={document.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">{document.filename}</p>
                  <p className="text-xs text-gray-500">{document.chunk_count} chunk(s)</p>
                </div>
                <Button size="icon" variant="ghost" onClick={async () => {
                  await appApi.delete(`/api/rag/documents/${document.id}`);
                  queryClient.invalidateQueries({ queryKey: ["rag-documents"] });
                  queryClient.invalidateQueries({ queryKey: ["rag-status"] });
                }}><Trash2 className="w-4 h-4 text-red-600" /></Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FileQuestion className="w-5 h-5 text-blue-700" />Ask a Question</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <form className="flex gap-3" onSubmit={askQuestion}>
              <Input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="What changed in my uploaded statements?" />
              <Button type="submit">Ask</Button>
            </form>
            {answer && (
              <div className="rounded-lg border bg-white p-4">
                <p className="text-sm whitespace-pre-wrap">{answer.answer}</p>
                {answer.sources?.length > 0 && <p className="mt-3 text-xs text-gray-500">Sources: {answer.sources.join(", ")}</p>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
