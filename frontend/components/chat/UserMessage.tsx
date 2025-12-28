"use client";
import React from "react";
import { Message } from "../../lib/types";

export default function UserMessage({ message }: { message: Message }) {
  return (
    <div className="flex justify-end w-full">
      <div className="bg-gray-100 dark:bg-neutral-800 text-gray-800 dark:text-gray-100 px-4 py-1.5 rounded-full max-w-[70%] text-sm font-normal whitespace-pre-wrap shadow-none">
        {message.content}
      </div>
    </div>
  );
}
