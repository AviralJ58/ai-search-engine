"use client";

import React, { useEffect, useRef, useState } from "react";
import Toast from "../Toast";
import { useChatStore } from "../../store/chatStore";
import { postChat, getConversationHistory } from "../../lib/api";
import { ConversationSse } from "../../lib/sse";

import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import MessageList from "./MessageList";

const PdfViewer = dynamic(() => import("../pdf/PdfViewer"), { ssr: false });

export default function ChatContainer() {
  const [input, setInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string }>({ show: false, message: "" });
  const addMessage = useChatStore((s) => s.addMessage);
  const setMessages = useChatStore((s) => s.setMessages);
  const addConversation = useChatStore((s) => (s as any).addConversation);
  const startStreaming = useChatStore((s) => s.startStreaming);
  const appendStreamingDelta = useChatStore((s) => s.appendStreamingDelta);
  const stopStreaming = useChatStore((s) => s.stopStreaming);
  const setToolStatus = useChatStore((s) => s.setToolStatus);
  const setCitationMap = useChatStore((s) => s.setCitationMap);
  const selectedConversation = useChatStore((s) => s.selectedConversation);
  const setSelectedConversation = useChatStore((s) => s.setSelectedConversation);
  const pdfViewer = useChatStore((s) => s.pdfViewer);
  const closePdf = useChatStore((s) => s.closePdf);
  const sseRef = useRef<ConversationSse | null>(null);

  useEffect(() => {
    // when selection changes, load persisted history
    if (selectedConversation) {
      (async () => {
        try {
          const h = await getConversationHistory(selectedConversation);
          if (h && h.messages) setMessages(selectedConversation, h.messages);
        } catch (e) {
          // ignore
        }
      })();
    }

    // subscribe to SSE for the currently selected conversation
    if (!selectedConversation) return;

    // cleanup previous
    sseRef.current?.close();

    sseRef.current = new ConversationSse(selectedConversation, (evt) => {
      const { type, data } = evt;
      switch (type) {
        case "typing":
          // show typing indicator
          startStreaming(selectedConversation);
          break;
        case "tool_call_started":
          setToolStatus(selectedConversation, { tool: data.tool, status: "started" });
          break;
        case "tool_call_finished":
          setToolStatus(selectedConversation, null);
          break;
        case "text_delta":
          appendStreamingDelta(selectedConversation, data.delta || "");
          break;
        case "citation_map":
          setCitationMap(selectedConversation, data.map || []);
          break;
        case "done":
          stopStreaming(selectedConversation);
          // reload persisted history
          (async () => {
            try {
              const h = await getConversationHistory(selectedConversation);
              if (h && h.messages) setMessages(selectedConversation, h.messages);
            } catch (e) {
              // ignore
            }
          })();
          break;
        case "error":
          stopStreaming(selectedConversation);
          // Set error message in chat store
          if (data && typeof data.error === "string") {
            // If backend sends { error: "..." }
            useChatStore.getState().setError(selectedConversation, data.error);
          } else if (typeof data === "string") {
            useChatStore.getState().setError(selectedConversation, data);
          } else {
            useChatStore.getState().setError(selectedConversation, "An unknown error occurred.");
          }
          break;
        default:
          break;
      }
    });

    return () => {
      sseRef.current?.close();
    };
  }, [selectedConversation, appendStreamingDelta, setCitationMap, setToolStatus, setMessages, startStreaming, stopStreaming]);

  async function handleSend() {
    if (!input.trim()) return;
    try {
      if (!selectedConversation) {
        // first message: backend will create conversation and return id
        const r = await postChat(input);
        const convId = r.conversation_id || r.conversationId || r.conversation || null;
        if (convId) {
          // Fetch updated conversation list to get the AI-generated title
          try {
            const { listConversations } = await import("../../lib/api");
            const data = await listConversations();
            if (data && data.conversations) {
              const { setConversations } = await import("../../store/chatStore");
              setConversations(data.conversations);
            }
          } catch (err) {
            // fallback: add with placeholder title if fetch fails
            addConversation({ conversation_id: convId, title: input.slice(0, 80) });
          }
          setSelectedConversation(convId);
          // optimistic add user message
          addMessage(convId, {
            message_id: "local-" + Date.now(),
            conversation_id: convId,
            role: "user",
            content: input,
            metadata: {},
          });
        }
      } else {
        // existing conversation
        await postChat(input, selectedConversation);
        addMessage(selectedConversation, {
          message_id: "local-" + Date.now(),
          conversation_id: selectedConversation,
          role: "user",
          content: input,
          metadata: {},
        });
      }
      setInput("");
    } catch (e) {
      console.error(e);
    }
  }

  async function handleUpload(file?: File) {
    if (!file) return;
    setUploading(true);
    try {
      const res = await (await import("../../lib/api")).uploadPdf(file);
      // If uploadPdf does not throw, assume 2xx response
      setToast({ show: true, message: "PDF uploaded successfully!" });
      console.log("Upload response", res);
    } catch (e: any) {
      console.error("Upload failed", e);
      let msg = "Upload failed.";
      if (e && typeof e === "object" && "message" in e && typeof e.message === "string") {
        msg = e.message;
      }
      setToast({ show: true, message: msg });
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <Toast message={toast.message} show={toast.show} onClose={() => setToast({ show: false, message: "" })} />
      <div className="h-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-2 sm:px-4 transition-colors duration-500 w-full overflow-x-hidden">
      <div className="w-full max-w-2xl mx-auto bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-neutral-800 flex flex-col shadow-none h-full">
        <div className="hidden">Conversation</div>
        <div className="flex-1 min-h-0 overflow-auto">
          <MessageList conversationId={selectedConversation || ""} />
        </div>
        <div className="p-2 sm:p-4 border-t border-gray-100 dark:border-neutral-800 flex flex-row gap-2 bg-white dark:bg-gray-900 rounded-b-xl fixed-bottom">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 min-w-0 text-base focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition"
            placeholder="Ask a question..."
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <label className="inline-flex items-center gap-2">
            <input type="file" accept="application/pdf" className="hidden" onChange={(e) => handleUpload(e.target.files?.[0])} />
            <span className="p-2 border border-gray-200 dark:border-gray-700 rounded-full cursor-pointer bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
              <img src="/images/attachment-2-svgrepo-com.svg" alt="Attach" width={20} height={20} className="dark:invert" />
            </span>
          </label>
          <button className="flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white w-10 h-10 rounded-full transition" onClick={handleSend} aria-label="Send">
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M12 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

      {/* PDF viewer container (animated) opens when citation is clicked */}
      <AnimatePresence>
        {pdfViewer.open && pdfViewer.docId && (
          <PdfViewer
            docId={pdfViewer.docId}
            pageNumber={pdfViewer.pageNumber}
            startOffset={pdfViewer.startOffset}
            endOffset={pdfViewer.endOffset}
            citationId={pdfViewer.citationId}
            onClose={closePdf}
          />
        )}
      </AnimatePresence>
    </div>
    </>
  );
}
