"use client";

import React from "react";
import { Message } from "../../lib/types";
import CitationInline from "./CitationInline";
import ReactMarkdown from "react-markdown";

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
    <div className="w-full pl-4 max-w-xl mx-0">
      <div className="prose prose-neutral dark:prose-invert max-w-none text-base leading-relaxed">
        <ReactMarkdown>{typeof content === 'string' ? content : ''}</ReactMarkdown>
        {typeof content !== 'string' && content}
      </div>
      {citations && citations.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {citations.map((c: any) => (
            <button
              key={c.id}
              onClick={() => {
                if (c.doc_id) {
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
              className="inline-block px-3 py-1 rounded bg-gray-100 dark:bg-neutral-800 text-gray-500 text-xs font-medium hover:bg-gray-200 dark:hover:bg-neutral-700 transition cursor-pointer"
              title={c.text_snippet || `Source ${c.id}`}
            >
              Source {c.id}
            </button>
          ))}
        </div>
      )}
      <div className="border-t border-gray-100 dark:border-neutral-800 my-8" />
    </div>
  );
}
