"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface Props {
  onClose: () => void;
  children: React.ReactNode;
  /** Used for aria-labelledby — should match an id on the modal's heading. */
  labelId?: string;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Renders children into a portal attached to document.body so that the modal
 * is never clipped by a parent stacking context (e.g. the sidebar z-index).
 * Traps focus within the dialog and restores it on close.
 */
export function Modal({ onClose, children, labelId }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  // Remember which element had focus before the modal opened
  const previousFocusRef = useRef<Element | null>(null);

  useEffect(() => {
    previousFocusRef.current = document.activeElement;

    // Focus the first focusable element inside the dialog
    const first =
      dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)[0];
    first?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      // Restore focus to the element that opened the modal
      (previousFocusRef.current as HTMLElement | null)?.focus();
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
