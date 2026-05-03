"use client";

import { useAssetStore } from "@/store/useAssetStore";
import { useEffect, useRef, useState } from "react";

interface Props {
  ticker: string;
}

/**
 * Freeform notes textarea for a specific ticker.
 * Reads/writes via the Zustand store; Supabase sync is handled by usePortfolioSync.
 * Debounces writes to the store to avoid excessive Supabase upserts while typing.
 */
export function PositionNotes({ ticker }: Props) {
  const storedNote = useAssetStore((s) => s.notes[ticker] ?? "");
  const setNote = useAssetStore((s) => s.setNote);

  const [value, setValue] = useState(storedNote);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync stored note into local state if it changes externally (e.g. initial load)
  useEffect(() => {
    setValue(storedNote);
  }, [storedNote]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setValue(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setNote(ticker, val);
    }, 500);
  }

  return (
    <textarea
      value={value}
      onChange={handleChange}
      rows={3}
      maxLength={1000}
      placeholder="Why did you add this? Investment thesis, reminders… (private)"
      className="w-full bg-transparent border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-blue-500/50 resize-none leading-relaxed"
    />
  );
}
