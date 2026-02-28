import type { AnalyzeRequest, AnalyzeResponse, ExplainResponse, ChatRequest, ChatResponse } from "./types";

const API_BASE = import.meta.env.VITE_API_BACKEND_URL || "http://localhost:8000";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

export function analyzeHome(req: AnalyzeRequest): Promise<AnalyzeResponse> {
  return post<AnalyzeResponse>("/analyze", req);
}

export function explainResults(
  data: AnalyzeResponse & { offer_price: number; risk_tolerance: number; prob_underwater?: number }
): Promise<ExplainResponse> {
  return post<ExplainResponse>("/explain", {
    ...data,
    prob_underwater: data.prob_underwater ?? data.prob_downside,
  });
}

export function sendChat(req: ChatRequest): Promise<ChatResponse> {
  return post<ChatResponse>("/chat", req);
}
