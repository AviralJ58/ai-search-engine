"use client";

import React, { useEffect, useRef } from "react";
import { useChatStore } from "../../store/chatStore";
import UserMessage from "./UserMessage";
import AssistantMessage from "./AssistantMessage";
import TypingIndicator from "./TypingIndicator";
import StreamingCursor from "./StreamingCursor";
import ToolCallIndicator from "./ToolCallIndicator";

export default function MessageList({ conversationId, scrollRef }: { conversationId: string, scrollRef?: React.RefObject<HTMLDivElement> }) {
  const messages = useChatStore((s) => s.messages[conversationId] || []);
  const streaming = useChatStore((s) => s.streaming[conversationId]);

  // auto-scroll to bottom when messages change or streaming buffer updates
  useEffect(() => {
    if (scrollRef?.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, streaming?.buffer, scrollRef]);

  return (
    <div className="space-y-4">
      {messages.map((m) => (
        <div key={m.message_id}>
          {m.role === "user" ? <UserMessage message={m} /> : <AssistantMessage message={m} />}
        </div>
      ))}

      {/* Streaming/typing/toolcall indicator */}
      {streaming && streaming.active && (
        <div className="p-3 bg-gray-50 border rounded">
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
          <div className="mt-2 text-gray-800 whitespace-pre-wrap">
            {streaming.buffer}
            <StreamingCursor />
          </div>
        </div>
      )}
    </div>
  );
}
