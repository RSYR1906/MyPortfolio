"use client";

import type { InsiderTransaction } from "@/types";
import { useEffect, useRef, useState } from "react";

// Module-level cache — TTL 30 min
const insiderCache = new Map<
  string,
  { data: InsiderTransaction[]; expiry: number }
>();
const CACHE_TTL = 1_800_000;

const CODE_LABELS: Record<string, { label: string; badge: string }> = {
  P: {
    label: "Purchase",
    badge: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  },
  S: {
    label: "Sale",
    badge: "bg-red-500/20 text-red-400 border border-red-500/30",
  },
  A: {
    label: "Award",
    badge: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  },
  D: {
    label: "Disposal",
    badge: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
  },
};

interface Props {
  ticker: string;
}

export function InsiderTransactions({ ticker }: Props) {
  const [transactions, setTransactions] = useState<InsiderTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setShowAll(false);

    const cached = insiderCache.get(ticker);
    if (cached && cached.expiry > Date.now()) {
      setTransactions(cached.data);
      setLoading(false);
      return;
    }

    fetch(`/api/insider?symbol=${encodeURIComponent(ticker)}`, {
      signal: ac.signal,
    })
      .then((r) => (r.ok ? (r.json() as Promise<InsiderTransaction[]>) : []))
      .then((data) => {
        if (ac.signal.aborted) return;
        insiderCache.set(ticker, { data, expiry: Date.now() + CACHE_TTL });
        setTransactions(data);
        setLoading(false);
      })
      .catch(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
  }, [ticker]);

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-2 animate-pulse">
        <div className="h-3 w-32 bg-white/10 rounded" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-4 bg-white/5 rounded" />
        ))}
      </div>
    );
  }

  if (transactions.length === 0) return null;

  const visible = showAll ? transactions : transactions.slice(0, 5);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        Insider Transactions
      </h3>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 text-[10px] text-gray-600 uppercase tracking-wider pb-1 border-b border-white/5">
        <span>Name</span>
        <span className="text-right">Shares</span>
        <span className="text-right">Price</span>
        <span className="text-right">Date</span>
      </div>

      {/* Rows */}
      <div className="space-y-1.5">
        {visible.map((t, i) => {
          const codeInfo = CODE_LABELS[t.transactionCode] ?? {
            label: t.transactionCode,
            badge: "bg-white/10 text-gray-400",
          };
          return (
            <div
              key={i}
              className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 items-center"
            >
              <div className="min-w-0">
                <p className="text-[11px] text-gray-300 truncate leading-tight">
                  {t.name}
                </p>
                <span
                  className={`inline-block text-[9px] px-1 py-0.5 rounded font-semibold mt-0.5 ${codeInfo.badge}`}
                >
                  {codeInfo.label}
                </span>
              </div>
              <span className="text-[11px] font-mono text-gray-300 text-right">
                {Math.abs(t.change).toLocaleString()}
              </span>
              <span className="text-[11px] font-mono text-gray-500 text-right">
                {t.transactionPrice > 0
                  ? `$${t.transactionPrice.toFixed(2)}`
                  : "—"}
              </span>
              <span className="text-[10px] text-gray-600 text-right whitespace-nowrap">
                {t.transactionDate}
              </span>
            </div>
          );
        })}
      </div>

      {transactions.length > 5 && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
        >
          {showAll ? "Show less" : `Show ${transactions.length - 5} more`}
        </button>
      )}
    </div>
  );
}
