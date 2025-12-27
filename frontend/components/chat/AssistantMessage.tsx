"use client";
import React from "react";
import { Message } from "../../lib/types";
import CitationInline from "./CitationInline";
import SourceCards from "./SourceCards";

export default function AssistantMessage({ message }: { message: Message }) {
  const citations = message.metadata?.citation_map || [];
  // Replace citation tags in content with clickable CitationInline components
  let content: React.ReactNode = message.content;
  if (citations && citations.length > 0) {
    // Replace [1], [2], ... with CitationInline
    content = message.content.split(/(\[\d+\])/g).map((part, i) => {
      const match = part.match(/^\[(\d+)\]$/);
      if (match) {
        const id = parseInt(match[1], 10);
        const citation = citations.find((c: any) => c.id === id);
        if (citation) {
          return <CitationInline key={"citation-" + id + "-" + i} citation={citation} />;
        }
      }
      return part;
    });
  }
  return (
    <div className="p-3 bg-gray-50 border rounded">
      <div className="text-gray-800 whitespace-pre-wrap">{content}</div>
      {citations && citations.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {citations.map((c: any) => (
            <button
              key={c.id}
              onClick={() => {
                if (c.doc_id) {
                  // open PDF viewer and jump to page
                  const openPdf = require("../../store/chatStore").useChatStore.getState().openPdf;
                  openPdf({
                    docId: c.doc_id,
                    pageNumber: c.page_number,
                    startOffset: c.start_offset,
                    endOffset: c.end_offset,
                    citationId: c.id,
                  });
                }
              }}
              className="px-3 py-1 rounded bg-indigo-100 text-indigo-800 text-xs font-medium hover:bg-indigo-200 transition"
              title={c.text_snippet || `Source ${c.id}`}
            >
              Source {c.id}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
