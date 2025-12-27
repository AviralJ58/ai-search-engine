"use client";
import React from "react";

export default function ToolCallIndicator({ text }: { text: string }) {
  return (
    <div className="inline-flex items-center gap-2 text-sm text-gray-600">
      <span className="animate-pulse">🔍</span>
      <span>{text}</span>
    </div>
  );
}
