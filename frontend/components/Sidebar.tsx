"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChatStore } from "../store/chatStore";

export default function Sidebar() {
  /* ---------------- Theme ---------------- */
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark")
        ? "dark"
        : "light";
    }
    return "light";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  /* ---------------- Store ---------------- */
  const conversations = useChatStore((s) => s.conversations);
  const selected = useChatStore((s) => s.selectedConversation);
  const setSelected = useChatStore((s) => s.setSelectedConversation);

  /* ---------------- State ---------------- */
  const [collapsed, setCollapsed] = useState(false); // desktop only
  const [mobileOpen, setMobileOpen] = useState(false); // mobile only

  /* ---------------- Body Scroll Lock (Mobile) ---------------- */
  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  /* ---------------- Layout Constants ---------------- */
  const expandedWidth = 288;
  const collapsedWidth = 64;

  /* ---------------- Icons ---------------- */
  const HamburgerIcon = () => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );

  const PlusIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );

  const HistoryIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );

  /* ================================================= */
  /* ================= Sidebar Content =============== */
  /* ================================================= */

  const SidebarContent = (
    <>
      {/* ---------- Header ---------- */}
      <div className="flex items-center justify-between px-3 py-3 border-b relative">
        {/* Left side: Hamburger + Title */}
        <div className="flex items-center gap-3">
          {/* Desktop hamburger */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <HamburgerIcon />
          </button>

          {/* Title only when expanded (desktop) */}
          {(!collapsed || mobileOpen) && (
            <span className="font-semibold text-lg whitespace-nowrap">
              AI Search Engine
            </span>
          )}

        </div>

        {/* Mobile close */}
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden text-xl"
        >
          ✕
        </button>
      </div>


      {/* ---------- Desktop Expanded ---------- */}
      {!collapsed && (
        <>
          <div className="px-4 pb-3 pt-3">
            <button
              onClick={() => {
                setSelected(null);
                setMobileOpen(false);
              }}
              className="w-full bg-indigo-600 text-white py-2 rounded-md"
            >
              Start New Conversation
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 space-y-1">
            {conversations.map((c) => (
              <button
                key={c.conversation_id}
                onClick={() => {
                  setSelected(c.conversation_id);
                  setMobileOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded ${selected === c.conversation_id
                  ? "bg-gray-100 dark:bg-gray-800"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
              >
                <div className="truncate">{c.title || "Untitled"}</div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* ---------- Desktop Collapsed ---------- */}
      {collapsed && (
        <div className="flex-1 flex flex-col items-center justify-start gap-4 py-4">
          {/* New Conversation */}
          <button
            onClick={() => setSelected(null)}
            className="p-3 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 shadow"
            title="New conversation"
          >
            <PlusIcon />
          </button>

          {/* History */}
          <button
            onClick={() => setCollapsed(false)}
            className="p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Show history"
          >
            <HistoryIcon />
          </button>
        </div>
      )}

      {/* ---------- Theme ---------- */}
      <div className="p-3 border-t">
        <button
          onClick={toggleTheme}
          className={`w-full flex items-center justify-center gap-2 p-2 border rounded transition ${collapsed ? "rounded-full p-3" : ""
            }`}
          title={collapsed ? "Toggle theme" : undefined}
        >
          {/* Icon always visible */}
          <span className="text-lg">
            {theme === "dark" ? "🌞" : "🌙"}
          </span>

          {/* Text only when expanded or mobile */}
          {!collapsed && (
            <span className="text-sm">
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </span>
          )}
        </button>
      </div>

    </>
  );

  /* ================================================= */
  /* ===================== Render ==================== */
  /* ================================================= */

  return (
    <>
      {/* -------- Mobile Hamburger -------- */}
      {!mobileOpen && (
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-md bg-indigo-600 text-white shadow"
        >
          <HamburgerIcon />
        </button>
      )}

      {/* -------- Mobile Sidebar -------- */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            className="fixed inset-0 z-40 bg-white dark:bg-gray-900 md:hidden flex flex-col"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {SidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* -------- Desktop Sidebar -------- */}
      <motion.aside
        className="hidden md:flex flex-col bg-white dark:bg-gray-900 h-screen shadow z-20"
        animate={{ width: collapsed ? collapsedWidth : expandedWidth }}
        transition={{ duration: 0.3 }}
      >
        {SidebarContent}
      </motion.aside>
    </>
  );
}
