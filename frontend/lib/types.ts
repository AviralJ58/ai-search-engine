// Strict TypeScript types for SSE events, messages and citations
export type EventType =
  | "typing"
  | "tool_call_started"
  | "tool_call_finished"
  | "text_delta"
  | "citation_map"
  | "citation"
  | "info"
  | "error"
  | "done";

export interface SseEvent<T = any> {
  type: EventType;
  data: T;
}

export interface CitationMapEntry {
  id: number; // inline number [1]
  doc_id?: string;
  page_number?: number;
  start_offset?: number;
  end_offset?: number;
  text_snippet?: string;
  score?: number;
}

export interface CitationEvent extends CitationMapEntry {}

export type MessageRole = "user" | "assistant" | "system" | "tool";

export interface Message {
  message_id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  metadata?: any;
  created_at?: string | null;
}

// Streaming state for an in-progress assistant message
export interface StreamingState {
  conversationId?: string;
  buffer: string; // ephemeral streaming text
  active: boolean;
  toolStatus?: { tool: string; status: string } | null;
  citationMap?: CitationMapEntry[];
}
