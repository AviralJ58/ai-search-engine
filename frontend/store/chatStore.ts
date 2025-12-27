import create from "zustand";
import { Message, StreamingState, CitationMapEntry } from "../lib/types";

interface ChatState {
  conversations: { conversation_id: string; title?: string }[];
  messages: Record<string, Message[]>; // keyed by conversation_id
  streaming: Record<string, StreamingState | undefined>;
  selectedConversation?: string | null;
  setConversations: (c: { conversation_id: string; title?: string }[]) => void;
  setSelectedConversation: (id: string | null) => void;
  addConversation: (conv: { conversation_id: string; title?: string }) => void;
  addMessage: (conversationId: string, msg: Message) => void;
  setMessages: (conversationId: string, msgs: Message[]) => void;
  startStreaming: (conversationId: string) => void;
  appendStreamingDelta: (conversationId: string, delta: string) => void;
  stopStreaming: (conversationId: string) => void;
  setToolStatus: (conversationId: string, toolStatus: { tool: string; status: string } | null) => void;
  setCitationMap: (conversationId: string, map: CitationMapEntry[]) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  messages: {},
  streaming: {},
  selectedConversation: null,
  setConversations: (c) => set({ conversations: c }),
  setSelectedConversation: (id) => set(() => ({ selectedConversation: id })),
  addConversation: (conv) => set((s) => ({ conversations: [conv, ...s.conversations] })),
  addMessage: (conversationId, msg) =>
    set((s) => ({ messages: { ...s.messages, [conversationId]: [...(s.messages[conversationId] || []), msg] } })),
  setMessages: (conversationId, msgs) => set((s) => ({ messages: { ...s.messages, [conversationId]: msgs } })),
  startStreaming: (conversationId) =>
    set((s) => ({
      streaming: { ...s.streaming, [conversationId]: { conversationId, buffer: "", active: true, toolStatus: null } },
    })),
  appendStreamingDelta: (conversationId, delta) =>
    set((s) => {
      const cur = s.streaming[conversationId];
      if (!cur) return s;
      const updated = { ...cur, buffer: cur.buffer + delta };
      return { streaming: { ...s.streaming, [conversationId]: updated } } as any;
    }),
  stopStreaming: (conversationId) =>
    set((s) => {
      const cur = s.streaming[conversationId];
      const updated = cur ? { ...cur, active: false } : { conversationId, buffer: "", active: false, toolStatus: null };
      return { streaming: { ...s.streaming, [conversationId]: updated } } as any;
    }),
  setToolStatus: (conversationId, toolStatus) =>
    set((s) => {
      const cur = s.streaming[conversationId];
      const updated = cur ? { ...cur, toolStatus } : { conversationId, buffer: "", active: false, toolStatus };
      return { streaming: { ...s.streaming, [conversationId]: updated } } as any;
    }),
  setCitationMap: (conversationId, map) =>
    set((s) => {
      const cur = s.streaming[conversationId];
      const updated = cur ? { ...cur, citationMap: map } : { conversationId, buffer: "", active: false, citationMap: map };
      return { streaming: { ...s.streaming, [conversationId]: updated } } as any;
    }),
}));
