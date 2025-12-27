import { Message, CitationMapEntry } from "./types";

// Allow overriding the backend base URL via NEXT_PUBLIC_API_BASE.
// If not set, default to localhost:8000 which is the default backend dev server.
export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE as string) || "http://127.0.0.1:8000";

export async function postChat(message: string, conversationId?: string) {
  const body = { conversation_id: conversationId ?? null, message };
  const res = await fetch(`${API_BASE.replace(/\/$/, "")}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST /chat failed: ${res.status}`);
  return res.json();
}

export async function listConversations() {
  const res = await fetch(`${API_BASE.replace(/\/$/, "")}/conversations`);
  if (!res.ok) throw new Error("Failed to fetch conversations");
  return res.json();
}

export async function getConversationHistory(conversationId: string) {
  const res = await fetch(`${API_BASE.replace(/\/$/, "")}/conversations/${conversationId}/history`);
  if (!res.ok) throw new Error("Failed to fetch history");
  return res.json();
}

export async function getDocumentPdfUrl(docId: string) {
  // frontend can navigate to this URL directly
  return `${API_BASE.replace(/\/$/, "")}/documents/${docId}/pdf`;
}

export async function uploadPdf(file: File) {
  const fd = new FormData();
  fd.append("file", file, file.name);
  const res = await fetch(`${API_BASE.replace(/\/$/, "")}/upload`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Upload failed: ${res.status} ${txt}`);
  }
  return res.json();
}
