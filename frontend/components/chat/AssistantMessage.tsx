"use client";
import React from "react";
import { Message } from "../../lib/types";
import CitationInline from "./CitationInline";

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
    </div>
  );
}
