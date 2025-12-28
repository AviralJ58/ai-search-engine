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
    <button
      onClick={onClick}
      className="inline-flex items-center justify-center text-xs rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-500 px-2 py-0.5 ml-1 hover:bg-gray-200 dark:hover:bg-neutral-700 transition border border-gray-200 dark:border-neutral-700"
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      [{citation.id}]
    </button>
  );
}
