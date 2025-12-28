"use client";
import React from "react";

export default function ToolCallIndicator({ text }: { text: string }) {
  // Choose icon based on text
  let icon = null;
  if (text.toLowerCase().includes("search")) icon = <span className="text-base">🔍</span>;
  else if (text.toLowerCase().includes("read")) icon = <span className="text-base">📄</span>;
  else icon = <span className="text-base">✍️</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-400">
      {icon}
      <span>{text}</span>
    </span>
  );
}
