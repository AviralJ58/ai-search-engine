"use client";


import React, { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Worker, Viewer, SpecialZoomLevel, ScrollMode, Plugin, RenderViewer, Slot } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import { API_BASE } from '../../lib/api';

export default function PdfViewer({ docId, onClose, pageNumber, startOffset, endOffset, citationId }: {
  docId: string;
  onClose: () => void;
  pageNumber?: number;
  startOffset?: number;
  endOffset?: number;
  citationId?: number;
}) {
  // Build the backend PDF URL
  const src = `${API_BASE.replace(/\/$/, "")}/documents/${docId}/pdf`;
  const defaultLayoutPluginInstance = defaultLayoutPlugin();
  const viewerRef = useRef<Viewer | null>(null);
  const [currentPage, setCurrentPage] = useState(pageNumber ? pageNumber - 1 : 0);

  // Scroll to the correct page when opened
  useEffect(() => {
    if (typeof pageNumber === 'number') {
      setCurrentPage(pageNumber - 1);
    }
  }, [pageNumber]);

  // TODO: Highlighting by offset requires custom text layer plugin or overlay.
  // For now, we scroll to the page and can add highlight overlay later.

  return (
    <motion.div
      initial={{ x: 300, opacity: 0, scale: 0.98 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: 300, opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.35 }}
  className="fixed inset-y-0 right-0 w-full md:w-2/5 bg-white dark:bg-gray-900 shadow-lg z-50 transition-colors duration-500"
      style={{ maxWidth: 980 }}
    >
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between transition-colors duration-500">
        <div className="font-medium text-gray-900 dark:text-gray-100">PDF Viewer</div>
        <button onClick={onClose} className="text-gray-600 dark:text-gray-300">Close</button>
      </div>
      <div className="h-[calc(100vh-64px)] bg-white dark:bg-gray-900 transition-colors duration-500">
        <Worker workerUrl={`https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`}>
          <Viewer
            fileUrl={src}
            plugins={[defaultLayoutPluginInstance]}
            defaultScale={SpecialZoomLevel.PageFit}
            initialPage={currentPage}
            scrollMode={ScrollMode.Vertical}
          />
        </Worker>
      </div>
    </motion.div>
  );
}
