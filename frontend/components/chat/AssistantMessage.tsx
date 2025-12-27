"use client";
import React from "react";
import { Message } from "../../lib/types";
import CitationInline from "./CitationInline";
import SourceCards from "./SourceCards";

export default function AssistantMessage({ message }: { message: Message }) {
  const citations = message.metadata?.citation_map || [];
  return (
    <div className="p-3 bg-gray-50 border rounded">
      <div className="text-gray-800 whitespace-pre-wrap">{message.content}</div>
      {citations && citations.length > 0 && (
        <div className="mt-3">
          <div className="flex gap-2 items-center">
            {citations.map((c: any) => (
              <CitationInline key={c.id} citation={c} />
            ))}
          </div>
          <div className="mt-2">
            <SourceCards citations={citations} />
          </div>
        </div>
      )}
    </div>
  );
}
