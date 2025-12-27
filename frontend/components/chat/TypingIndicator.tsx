"use client";
import React from "react";

export default function TypingIndicator() {
  return (
    <span className="inline-flex items-center text-sm text-gray-500">
      {/* AI is typing */}
      <span className="ml-1 animate-bounce">.</span>
      <span className="ml-0.5 animate-bounce delay-100">.</span>
      <span className="ml-0.5 animate-bounce delay-200">.</span>
    </span>
  );
}
