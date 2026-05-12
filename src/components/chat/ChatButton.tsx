"use client";

import { useState } from "react";
import { ChatPanel } from "./ChatPanel";

export function ChatButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating action button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close AI assistant" : "Open AI assistant"}
        className={`fixed bottom-6 right-4 z-40 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
          open
            ? "bg-white/10 text-gray-300 hover:bg-white/15 rotate-45"
            : "bg-blue-600 text-white hover:bg-blue-500 shadow-blue-900/40"
        }`}
      >
        {open ? (
          // × when open (rotated via parent)
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          // Sparkle / chat icon
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <path d="M12 7v1m0 4v1M9.5 9l.7.7m3.6 3.6.7.7M9.5 15l.7-.7m3.6-3.6.7-.7" />
          </svg>
        )}
      </button>

      {/* Panel — slides in above the FAB */}
      {open && (
        <div className="fixed bottom-24 right-4 z-40 w-[calc(100vw-2rem)] max-w-sm">
          <ChatPanel onClose={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}
