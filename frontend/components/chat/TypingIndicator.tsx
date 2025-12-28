"use client";
import React from "react";

export default function TypingIndicator() {
  return (
    <span className="inline-flex items-center text-xs text-gray-400">
      <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 animate-pulse mr-1" />
      <span>Writing answer…</span>
    </span>
  );
}
