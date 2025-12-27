"use client";

import React from "react";
import Link from "next/link";
import { useChatStore } from "../store/chatStore";

export default function Sidebar() {
  const conversations = useChatStore((s) => s.conversations);
  const selected = useChatStore((s) => s.selectedConversation);
  const setSelected = useChatStore((s) => s.setSelectedConversation);

  return (
    <aside className="w-72 border-r bg-white p-3">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Conversations</h3>
        <button
          onClick={() => setSelected(null)}
          className="text-xs text-indigo-600 hover:underline"
        >
          New
        </button>
      </div>
      <div className="space-y-2">
        {conversations.map((c) => (
          <button
            key={c.conversation_id}
            onClick={() => setSelected(c.conversation_id)}
            className={`w-full text-left p-2 rounded ${selected === c.conversation_id ? 'bg-gray-100' : 'hover:bg-gray-50'}`}>
            <div className="text-sm font-medium">{c.title || 'Untitled'}</div>
          </button>
        ))}
      </div>
    </aside>
  );
}
