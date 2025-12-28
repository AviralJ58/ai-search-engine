"use client";
import React from "react";

export default function SourceCards({ citations }: { citations: any[] }) {
  if (!citations || citations.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-1">
      {citations.map((c) => (
        <div key={c.id} className="p-2 border border-gray-100 dark:border-neutral-800 rounded bg-gray-50 dark:bg-neutral-900 shadow-none">
          <div className="text-xs text-gray-500 mb-1">Source {c.id} · Page {c.page_number}</div>
          <div className="text-xs text-gray-400 mb-1">Doc: {c.doc_id}</div>
          <div className="text-sm text-gray-700 dark:text-gray-300 leading-snug">{c.text_snippet}</div>
        </div>
      ))}
    </div>
  );
}
