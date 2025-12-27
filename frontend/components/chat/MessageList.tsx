"use client";

import React, { useEffect, useRef } from "react";
import { useChatStore } from "../../store/chatStore";
import UserMessage from "./UserMessage";
import AssistantMessage from "./AssistantMessage";

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

      {/* ephemeral streaming assistant while active */}
      {streaming && streaming.active && (
        <div className="p-3 bg-gray-50 border rounded">
          <div className="text-sm text-gray-500">AI is typing…</div>
          <div className="mt-2 text-gray-800 whitespace-pre-wrap">{streaming.buffer}</div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
