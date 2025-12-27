"use client";
import React from "react";
import { CitationMapEntry } from "../../lib/types";
import { useChatStore } from "../../store/chatStore";

export default function CitationInline({ citation }: { citation: CitationMapEntry }) {
  const openPdf = useChatStore((s) => s.openPdf);

  function onClick() {
    if (citation.doc_id) {
      openPdf({
        docId: citation.doc_id,
        pageNumber: citation.page_number,
        startOffset: citation.start_offset,
        endOffset: citation.end_offset,
        citationId: citation.id,
      });
    }
  }

  return (
    <button onClick={onClick} className="inline-flex items-center justify-center text-xs border px-2 py-1 rounded hover:bg-gray-100">
      [{citation.id}]
    </button>
  );
}
