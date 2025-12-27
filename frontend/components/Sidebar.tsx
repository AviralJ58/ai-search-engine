"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useChatStore } from "../store/chatStore";

export default function Sidebar() {
  const conversations = useChatStore((s) => s.conversations);
  const selected = useChatStore((s) => s.selectedConversation);
  const setSelected = useChatStore((s) => s.setSelectedConversation);
  const [collapsed, setCollapsed] = useState(false);

  // Sidebar width for animation
  const expandedWidth = 288; // 72 * 4 (w-72)
  const collapsedWidth = 64; // w-16


  // Provided SVG icons
  const ExpandIcon = () => (
    <Image src="/images/sidebar-expand-svgrepo-com.svg" alt="Expand" width={28} height={28} />
  );
  const CollapseIcon = () => (
    <Image src="/images/sidebar-collapse-svgrepo-com.svg" alt="Collapse" width={28} height={28} />
  );
  const PlusIcon = () => (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="mx-auto"><line x1="12" y1="5" x2="12" y2="19" strokeWidth="2"/><line x1="5" y1="12" x2="19" y2="12" strokeWidth="2"/></svg>
  );
  const HistoryIcon = () => (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="mx-auto"><circle cx="12" cy="12" r="10" strokeWidth="2"/><path d="M12 6v6l4 2" strokeWidth="2"/></svg>
  );

  // Collapsed sidebar click handler
  const handleExpand = () => setCollapsed(false);

  return (
    <AnimatePresence initial={false}>
      {!collapsed ? (
        <motion.aside
          key="expanded"
          initial={{ width: collapsedWidth, opacity: 0.7 }}
          animate={{ width: expandedWidth, opacity: 1 }}
          exit={{ width: collapsedWidth, opacity: 0.7 }}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
          className="border-r bg-white h-screen flex flex-col shadow z-20"
          style={{ minWidth: 0 }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="text-lg font-bold tracking-tight">AI Search Engine</span>
            <button
              onClick={() => setCollapsed(true)}
              className="ml-2 p-1 rounded-full hover:bg-gray-100 flex items-center justify-center"
              title="Collapse sidebar"
              style={{ width: 36, height: 36 }}
            >
              <CollapseIcon />
            </button>
          </div>
          <div className="px-4 pt-4 pb-2">
            <button
              onClick={() => setSelected(null)}
              className="w-full flex items-center justify-center gap-2 py-2 text-base font-medium bg-indigo-600 text-white rounded-md shadow hover:bg-indigo-700 transition"
              style={{ minHeight: 44 }}
            >
              {/* <PlusIcon /> */}
              <span className="ml-1">Start New Conversation</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-4">
            <div className="flex items-center px-4 mb-2 text-xs text-gray-500 uppercase tracking-wide h-8">
              <span>Conversation History</span>
            </div>
            <div className="space-y-2">
              {conversations.map((c) => (
                <button
                  key={c.conversation_id}
                  onClick={() => setSelected(c.conversation_id)}
                  className={`w-full text-left p-2 rounded flex items-center ${selected === c.conversation_id ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                  style={{ minHeight: 40 }}
                >
                  <div className="text-sm font-medium truncate">{c.title || 'Untitled'}</div>
                </button>
              ))}
            </div>
          </div>
        </motion.aside>
      ) : (
        <motion.aside
          key="collapsed"
          initial={{ width: expandedWidth, opacity: 1 }}
          animate={{ width: collapsedWidth, opacity: 1 }}
          exit={{ width: expandedWidth, opacity: 0.7 }}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
          className="border-r bg-white h-screen flex flex-col items-center shadow z-20 cursor-pointer select-none"
          style={{ minWidth: 0 }}
          onClick={handleExpand}
        >
          <button
            onClick={e => { e.stopPropagation(); setCollapsed(false); }}
            className="mt-4 mb-2 p-2 rounded-full hover:bg-gray-100 flex items-center justify-center"
            title="Expand sidebar"
            style={{ width: 36, height: 36 }}
          >
            <ExpandIcon />
          </button>
          <button
            onClick={e => { e.stopPropagation(); setSelected(null); }}
            className="my-2 p-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow flex items-center justify-center"
            title="Start New Conversation"
            style={{ width: 36, height: 36 }}
          >
            <PlusIcon />
          </button>
          <button
            onClick={e => { e.stopPropagation(); setCollapsed(false); }}
            className="mt-2 p-2 rounded-full hover:bg-gray-100 flex items-center justify-center"
            title="Show History"
            style={{ width: 36, height: 36 }}
          >
            <HistoryIcon />
          </button>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
