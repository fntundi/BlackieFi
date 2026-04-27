import { config } from "./config.js";

async function invoke(path: string, payload: unknown) {
  const response = await fetch(`${config.llmServiceUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`LLM service error: ${response.status}`);
  }

  return response.json();
}

export async function invokeTool<T>(tool: string, payload: Record<string, unknown>): Promise<T | null> {
  try {
    const data = await invoke(`/invoke/${tool}`, payload);
    return data.result as T;
  } catch {
    return null;
  }
}
