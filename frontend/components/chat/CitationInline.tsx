"use client";
import React from "react";
import { CitationMapEntry } from "../../lib/types";
import { useChatStore } from "../../store/chatStore";

export default function CitationInline({ citation }: { citation: CitationMapEntry }) {
  const setPdf = useChatStore((s) => (s as any).openPdf);

  function onClick() {
    // open PDF viewer and jump to page
    // store should provide behavior; we keep this as a simple event for now
    if (citation.doc_id) {
      // TODO: wire pdfStore to open viewer; simple window.open for now
      window.open(`/documents/${citation.doc_id}/pdf`, "_blank");
    }
  }

  return (
    <button onClick={onClick} className="inline-flex items-center justify-center text-xs border px-2 py-1 rounded hover:bg-gray-100">
      [{citation.id}]
    </button>
  );
}
