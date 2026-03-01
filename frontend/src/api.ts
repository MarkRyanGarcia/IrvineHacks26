import type { AnalyzeRequest, AnalyzeResponse, ExplainResponse, ChatRequest, ChatResponse, SavedProperty, SavePropertyRequest } from "./types";

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

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

async function del(path: string): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
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

export function fetchSavedProperties(userId: string): Promise<SavedProperty[]> {
  return get<SavedProperty[]>(`/properties/${userId}`);
}

export function saveProperty(req: SavePropertyRequest): Promise<SavedProperty> {
  return post<SavedProperty>("/properties", req);
}

export function deleteSavedProperty(propertyId: number): Promise<void> {
  return del(`/properties/${propertyId}`);
}
