"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Renders children into a portal attached to document.body so that the modal
 * is never clipped by a parent stacking context (e.g. the sidebar z-index).
 */
export function Modal({ onClose, children }: Props) {
  const [mounted, setMounted] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
