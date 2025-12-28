"use client";

import React, { useEffect, useRef } from "react";
import { useChatStore } from "../../store/chatStore";
import UserMessage from "./UserMessage";
import AssistantMessage from "./AssistantMessage";
import TypingIndicator from "./TypingIndicator";
import StreamingCursor from "./StreamingCursor";
import ToolCallIndicator from "./ToolCallIndicator";

export default function MessageList({ conversationId }: { conversationId: string }) {
  const messages = useChatStore((s) => s.messages[conversationId] || []);
  const streaming = useChatStore((s) => s.streaming[conversationId]);
  const error = useChatStore((s) => s.errors[conversationId] || null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // auto-scroll to bottom when messages change or streaming buffer updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, streaming?.buffer, error]);

  return (
    <div className="flex flex-col gap-10 py-10 w-full">
      {messages.map((m) => (
        <div key={m.message_id} className="w-full">
          {m.role === "user" ? <UserMessage message={m} /> : <AssistantMessage message={m} />}
        </div>
      ))}

      {/* Error message display */}
      {error && (
        <div className="w-full flex justify-center">
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-200 rounded-lg px-4 py-3 text-center max-w-xl mx-auto text-base font-medium shadow-sm">
            <span className="inline-block align-middle">{error}</span>
          </div>
        </div>
      )}

      {/* Streaming/typing/toolcall indicator */}
      {streaming && streaming.active && (
        <div className="w-full">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {streaming.toolStatus?.tool === "search_documents" && (
              <ToolCallIndicator text="Searching documents…" />
            )}
            {streaming.toolStatus?.tool === "search_documents" && streaming.toolStatus?.status == null && (
              <ToolCallIndicator text="Reading source…" />
            )}
            {streaming.toolStatus?.tool === "generate_answer" && (
              <TypingIndicator />
            )}
          </div>
          <div className="mt-2 prose prose-neutral dark:prose-invert max-w-none text-base leading-relaxed">
            {streaming.buffer}
            <StreamingCursor />
          </div>
          <div className="border-t border-gray-100 dark:border-neutral-800 my-8" />
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
