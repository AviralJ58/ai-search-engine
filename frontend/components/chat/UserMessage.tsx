"use client";
import React from "react";
import { Message } from "../../lib/types";

export default function UserMessage({ message }: { message: Message }) {
  return (
    <div className="flex justify-end">
      <div className="bg-indigo-600 text-white px-4 py-2 rounded-lg max-w-[80%] whitespace-pre-wrap">{message.content}</div>
    </div>
  );
}
