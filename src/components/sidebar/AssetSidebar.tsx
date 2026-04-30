"use client";

import { finnhubWsManager } from "@/lib/finnhubWs";
import { computeHoldings, computePnL, formatPnL } from "@/lib/portfolio";
import { createClient } from "@/lib/supabase/client";
import { useAssetStore } from "@/store/useAssetStore";
import type { Asset } from "@/types";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { AssetRow } from "./AssetRow";
import { PortfolioModal } from "./PortfolioModal";

interface Props {
  onTradeClick: (ticker: string) => void;
  /** Called when the mobile close (✕) button is pressed. */
  onClose?: () => void;
}

export function AssetSidebar({ onTradeClick, onClose }: Props) {
  const assets = useAssetStore((s) => s.assets);
  const transactions = useAssetStore((s) => s.transactions);
  const prices = useAssetStore((s) => s.prices);
  const router = useRouter();

  const holdings = useMemo(() => computeHoldings(transactions), [transactions]);
  const pnlMap = useMemo(
    () => computePnL(holdings, prices),
    [holdings, prices],
  );

  const totalValue = useMemo(
    () => Object.values(pnlMap).reduce((sum, p) => sum + p.currentValue, 0),
    [pnlMap],
  );
  const totalCost = useMemo(
    () => Object.values(holdings).reduce((sum, h) => sum + h.totalCost, 0),
    [holdings],
  );
  const totalPnL = totalValue - totalCost;

  const [portfolioOpen, setPortfolioOpen] = useState(false);

  // ── Add-ticker form state ────────────────────────────────────────────────
  const [addInput, setAddInput] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleAdd() {
    const sym = addInput.trim().toUpperCase();
    if (!sym) return;
    if (assets.some((a) => a.ticker === sym)) {
      setAddError("Already tracked");
      return;
    }
    setIsAdding(true);
    setAddError(null);
    try {
      const res = await fetch(`/api/ticker?symbol=${encodeURIComponent(sym)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setAddError((body as { error?: string }).error ?? "Symbol not found");
        return;
      }
      const asset = (await res.json()) as Asset;
      useAssetStore.getState().addAsset(asset);
      finnhubWsManager.subscribeTicker(sym);
      fetch(`/api/quotes?tickers=${encodeURIComponent(sym)}`)
        .then((r) => r.json())
        .then((data) => useAssetStore.getState().initPrices(data))
        .catch(console.error);
      setAddInput("");
      inputRef.current?.focus();
    } catch {
      setAddError("Lookup failed");
    } finally {
      setIsAdding(false);
    }
  }

  function handleRemove(ticker: string) {
    useAssetStore.getState().removeAsset(ticker);
    finnhubWsManager.unsubscribeTicker(ticker);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <aside className="w-64 shrink-0 flex flex-col h-full border-r border-white/10 bg-[#0d1117]">
        {/* Header */}
        <div className="px-4 py-4 border-b border-white/10 flex items-start justify-between">
          <div>
            <h1 className="text-base font-bold text-gray-100 tracking-tight">
              Portfolio
            </h1>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {assets.length} tracked asset{assets.length !== 1 ? "s" : ""}
            </p>
          </div>
          {/* Close button — only shown on mobile */}
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden text-gray-500 hover:text-gray-200 transition-colors text-lg leading-none mt-0.5"
              aria-label="Close sidebar"
            >
              ✕
            </button>
          )}
        </div>

        {/* Add ticker form — at the top, below the header */}
        <div className="border-b border-white/10 px-3 py-2.5">
          <div className="flex gap-1.5">
            <input
              ref={inputRef}
              value={addInput}
              onChange={(e) => {
                setAddInput(e.target.value.toUpperCase());
                setAddError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Add ticker, e.g. AAPL"
              maxLength={12}
              disabled={isAdding}
              className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500/60 disabled:opacity-50"
            />
            <button
              onClick={handleAdd}
              disabled={isAdding || !addInput.trim()}
              className="px-2 py-1 rounded bg-blue-600/80 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-xs text-white transition-colors"
            >
              {isAdding ? "…" : "+"}
            </button>
          </div>
          {addError && (
            <p className="text-[10px] text-red-400 mt-1">{addError}</p>
          )}
        </div>

        {/* Asset list */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/5">
          {assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
              <p className="text-sm text-gray-500">No assets tracked yet.</p>
              <p className="text-xs text-gray-600">
                Type a ticker above and press{" "}
                <kbd className="px-1 py-0.5 rounded bg-white/5 text-gray-400 font-mono text-[10px]">
                  Enter
                </kbd>{" "}
                to add one.
              </p>
            </div>
          ) : (
            assets.map((asset) => (
              <AssetRow
                key={asset.ticker}
                asset={asset}
                holding={holdings[asset.ticker]}
                pnl={pnlMap[asset.ticker]}
                onTradeClick={onTradeClick}
                onRemove={handleRemove}
              />
            ))
          )}
        </div>

        {/* Portfolio total — clickable to open modal */}
        {totalCost > 0 && (
          <button
            onClick={() => setPortfolioOpen(true)}
            className="border-t border-white/10 px-4 py-3 w-full text-left hover:bg-white/[0.03] transition-colors group"
          >
            <p className="text-[11px] text-gray-500 uppercase tracking-wider flex items-center justify-between">
              Total Portfolio
              <span className="text-[10px] text-gray-600 group-hover:text-blue-400 transition-colors">
                View details →
              </span>
            </p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-sm font-mono text-gray-100">
                ${totalValue.toFixed(2)}
              </span>
              <span
                className={`text-sm font-mono ${totalPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}
              >
                {formatPnL(totalPnL)}
              </span>
            </div>
          </button>
        )}

        {/* Sign-out */}
        <button
          onClick={handleSignOut}
          className="border-t border-white/10 px-4 py-3 w-full text-left text-xs text-gray-500 hover:text-gray-300 hover:bg-white/[0.03] transition-colors flex items-center gap-2"
        >
          <span>↩</span> Sign out
        </button>
      </aside>

      {portfolioOpen && (
        <PortfolioModal onClose={() => setPortfolioOpen(false)} />
      )}
    </>
  );
}
