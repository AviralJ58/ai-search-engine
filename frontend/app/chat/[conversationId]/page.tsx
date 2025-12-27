"use client";

import { useEffect } from "react";
import { getConversationHistory } from "../../../lib/api";
import { useChatStore } from "../../../store/chatStore";
import ChatContainer from "../../../components/chat/ChatContainer";

interface Props {
  params: { conversationId: string };
}

export default function ConversationPage({ params }: Props) {
  const { conversationId } = params;
  const setMessages = useChatStore((s) => s.setMessages);
  const setSelected = useChatStore((s) => s.setSelectedConversation);

  useEffect(() => {
    // on mount, load persisted history
    (async () => {
      try {
        const hist = await getConversationHistory(conversationId);
        if (hist && hist.messages) setMessages(conversationId, hist.messages);
      } catch (err) {
        // ignore
      }
    })();

    // set active conversation so ChatContainer will subscribe
    setSelected(conversationId);
    // cleanup on unmount
    return () => {
      setSelected(null);
    };
  }, [conversationId, setMessages]);

  return <ChatContainer />;
}
