"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useChatStore } from "../store/chatStore";


export default function Sidebar() {
  // Theme switcher state and icons must be inside the component
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const SunIcon = () => (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-yellow-400"><circle cx="12" cy="12" r="5" strokeWidth="2"/><path strokeWidth="2" d="M12 1v2m0 18v2m11-11h-2M3 12H1m16.95 6.95l-1.41-1.41M6.05 6.05L4.64 4.64m12.31 0l-1.41 1.41M6.05 17.95l-1.41 1.41"/></svg>
  );
  const MoonIcon = () => (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-gray-500"><path strokeWidth="2" d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z"/></svg>
  );

  const conversations = useChatStore((s) => s.conversations);
  const selected = useChatStore((s) => s.selectedConversation);
  const setSelected = useChatStore((s) => s.setSelectedConversation);
  const [collapsed, setCollapsed] = useState(false);

  // Sidebar width for animation
  const expandedWidth = 288; // 72 * 4 (w-72)
  const collapsedWidth = 64; // w-16

  // Provided SVG icons
    // Default sidebar (hamburger) icon for both expand and collapse
    const SidebarIcon = () => (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700 dark:text-gray-200">
        <line x1="4" y1="6" x2="20" y2="6" />
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="4" y1="18" x2="20" y2="18" />
      </svg>
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
          transition={{ type: "tween", duration: 0.35, ease: "easeInOut" }}
          className="border-b md:border-b-0 md:border-r bg-white dark:bg-gray-900 h-16 md:h-screen flex md:flex-col flex-row shadow z-20 overflow-x-auto md:overflow-hidden transition-colors duration-500 w-full md:w-auto"
          style={{ minWidth: 0 }}
        >
          <div className="flex items-center justify-center relative px-4 py-3 border-b border-gray-200 dark:border-gray-800 md:border-b-0 md:border-r md:border-gray-200 md:dark:border-gray-800 w-full md:w-auto">
            <motion.button
              onClick={() => setCollapsed(true)}
              className="p-1 pl-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center absolute left-4"
              title="Collapse sidebar"
              style={{ width: 36, height: 36 }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
            >
                <SidebarIcon />
            </motion.button>
            <motion.span
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="text-lg font-bold tracking-tight"
            >
              AI Search Engine
            </motion.span>
          </div>
          <div className="px-2 pt-2 pb-2 md:px-4 md:pt-4">
            <motion.button
              onClick={() => setSelected(null)}
              className="w-full flex items-center justify-center gap-2 py-2 text-base font-medium bg-indigo-600 text-white rounded-md shadow hover:bg-indigo-700 transition"
              style={{ minHeight: 44 }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25, delay: 0.1 }}
            >
              <span className="ml-1">Start New Conversation</span>
            </motion.button>
          </div>
          <div className="flex-1 overflow-y-auto px-1 pb-2 md:px-2 md:pb-4 min-w-0">
            <motion.div
              className="flex items-center px-4 mb-2 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide h-8"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25, delay: 0.15 }}
            >
              <span>Conversation History</span>
            </motion.div>
            <div className="space-y-2">
              <AnimatePresence>
                {conversations.map((c) => (
                  <motion.button
                    key={c.conversation_id}
                    onClick={() => setSelected(c.conversation_id)}
                    className={`w-full text-left p-2 rounded flex items-center ${selected === c.conversation_id ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                    style={{ minHeight: 40 }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="text-sm font-medium truncate">{c.title || 'Untitled'}</div>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          </div>
          {/* Theme Switcher */}
          <div className="px-2 py-2 md:px-4 md:py-3 mt-auto">
            <button
              onClick={e => { e.stopPropagation(); toggleTheme(); }}
              className="w-full flex items-center justify-center gap-2 p-2 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              title="Toggle theme"
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
              <span className="text-sm font-medium">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
          </div>
        </motion.aside>
      ) : (
        <motion.aside
          key="collapsed"
          initial={{ width: collapsedWidth, opacity: 1 }}
          animate={{ width: collapsedWidth, opacity: 1 }}
          exit={{ width: collapsedWidth, opacity: 0 }}
          transition={{ type: "tween", duration: 0.35, ease: "easeInOut" }}
          className="border-b md:border-b-0 md:border-r bg-white dark:bg-gray-900 h-16 md:h-screen flex md:flex-col flex-row items-center shadow z-20 cursor-pointer select-none overflow-x-auto md:overflow-hidden transition-colors duration-500 w-full md:w-auto"
          style={{ minWidth: 0 }}
          onClick={handleExpand}
        >
          <motion.button
            onClick={e => { e.stopPropagation(); setCollapsed(false); }}
            className="mt-4 mb-2 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center"
            title="Expand sidebar"
            style={{ width: 36, height: 36 }}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25 }}
          >
              <SidebarIcon />
          </motion.button>
          <motion.button
            onClick={e => { e.stopPropagation(); setSelected(null); }}
            className="my-2 p-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow flex items-center justify-center"
            title="Start New Conversation"
            style={{ width: 36, height: 36 }}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25, delay: 0.1 }}
          >
            <PlusIcon />
          </motion.button>
          <motion.button
            onClick={e => { e.stopPropagation(); setCollapsed(false); }}
            className="mt-2 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center"
            title="Show History"
            style={{ width: 36, height: 36 }}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25, delay: 0.15 }}
          >
            <HistoryIcon />
          </motion.button>
          {/* Theme Switcher */}
          <div className="px-2 py-2 md:px-4 md:py-3 mt-auto">
            <button
              onClick={e => { e.stopPropagation(); toggleTheme(); }}
              className="w-full flex items-center justify-center gap-2 p-2 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              title="Toggle theme"
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
