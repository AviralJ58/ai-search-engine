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
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // auto-scroll to bottom when messages change or streaming buffer updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, streaming?.buffer]);

  return (
    <div className="space-y-4">
      {messages.map((m) => (
        <div key={m.message_id}>
          {m.role === "user" ? <UserMessage message={m} /> : <AssistantMessage message={m} />}
        </div>
      ))}

      {/* Streaming/typing/toolcall indicator */}
      {streaming && streaming.active && (
        <div className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded">
          <div className="flex items-center gap-2">
            {/* Tool call progress indicator */}
            {streaming.toolStatus?.tool === "search_documents" && (
              <ToolCallIndicator text="Searching..." />
            )}
            {streaming.toolStatus?.tool === "search_documents" && streaming.toolStatus?.status == null && (
              <ToolCallIndicator text="Reading PDF..." />
            )}
            {/* Typing indicator shown when generating answer */}
            {streaming.toolStatus?.tool === "generate_answer" && (
            <TypingIndicator />
            )}
          </div>
          <div className="mt-2 text-gray-800 dark:text-gray-100 whitespace-pre-wrap">
            {streaming.buffer}
            <StreamingCursor />
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
