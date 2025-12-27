"use client";
import React from "react";

export default function SourceCards({ citations }: { citations: any[] }) {
  if (!citations || citations.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-2">
      {citations.map((c) => (
        <div key={c.id} className="p-3 border rounded bg-white">
          <div className="text-sm font-medium">Source {c.id}</div>
          <div className="text-xs text-gray-500">Doc: {c.doc_id} · Page: {c.page_number}</div>
          <div className="mt-2 text-sm text-gray-700">{c.text_snippet}</div>
        </div>
      ))}
    </div>
  );
}
