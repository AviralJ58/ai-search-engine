"use client";

import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
// NOTE: This component uses `react-pdf` or `@react-pdf-viewer/core` in production.
// Keep these as TODOs so you can install preferred library and adjust props.

export default function PdfViewer({ docId, onClose, openPage }: { docId: string; onClose: () => void; openPage?: number }) {
  // For now we render an iframe pointing at the backend PDF endpoint.
  const src = `/documents/${docId}/pdf`;

  return (
    <motion.div
      initial={{ x: 300, opacity: 0, scale: 0.98 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: 300, opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.35 }}
      className="fixed inset-y-0 right-0 w-full md:w-2/5 bg-white shadow-lg z-50"
      style={{ maxWidth: 980 }}
    >
      <div className="p-3 border-b flex items-center justify-between">
        <div className="font-medium">PDF Viewer</div>
        <button onClick={onClose} className="text-gray-600">Close</button>
      </div>
      <div className="h-[calc(100vh-64px)]">
        <iframe src={src} className="w-full h-full" title="pdf" />
      </div>
    </motion.div>
  );
}
