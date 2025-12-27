"use client";

import React, { useEffect, useRef, useState } from "react";
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
          // add to sidebar list and select
          try {
            addConversation({ conversation_id: convId, title: input.slice(0, 80) });
          } catch (err) {
            // ignore if store method missing
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
      // res contains doc_id, job_id etc. We could optionally add a system message or notify
      console.log("Upload response", res);
    } catch (e) {
      console.error("Upload failed", e);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center p-4">
      <div className="w-full max-w-3xl bg-white shadow rounded-lg overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Conversation</h2>
        </div>
        <div className="p-4 h-[70vh] overflow-auto">
          <MessageList conversationId={selectedConversation || ""} />
        </div>
        <div className="p-4 border-t flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 border rounded px-3 py-2"
            placeholder="Ask a question..."
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <label className="inline-flex items-center gap-2">
            <input type="file" accept="application/pdf" className="hidden" onChange={(e) => handleUpload(e.target.files?.[0])} />
            <span className="px-3 py-2 border rounded cursor-pointer bg-white">Upload PDF</span>
          </label>
          <button className="bg-indigo-600 text-white px-4 py-2 rounded" onClick={handleSend}>Send</button>
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
  );
}
