"use client";

import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { listConversations } from "../lib/api";
import { useChatStore } from "../store/chatStore";
import Sidebar from "../components/Sidebar";
import ChatContainer from "../components/chat/ChatContainer";

export default function HomePage() {
  const setConversations = useChatStore((s) => s.setConversations);
  const setSelected = useChatStore((s) => s.setSelectedConversation);
  const { data } = useQuery({ queryKey: ["conversations"], queryFn: listConversations, refetchOnWindowFocus: false });

  useEffect(() => {
    if (data && data.conversations) {
      setConversations(data.conversations);
    }
  }, [data, setConversations, setSelected]);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <main className="flex-1 p-6">
        <ChatContainer />
      </main>
    </div>
  );
}
