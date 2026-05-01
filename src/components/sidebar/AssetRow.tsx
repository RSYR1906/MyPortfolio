"use client";

import { formatPct, formatPnL } from "@/lib/portfolio";
import { useAssetStore } from "@/store/useAssetStore";
import type { Asset, Holding, PnL } from "@/types";
import { useEffect, useRef, useState } from "react";

interface Props {
  asset: Asset;
  /** Pre-computed by AssetSidebar (memoized) — avoids redundant per-row replay. */
  holding?: Holding;
  pnl?: PnL;
  onTradeClick: (ticker: string) => void;
  onRemove: (ticker: string) => void;
}

export function AssetRow({
  asset,
  holding,
  pnl,
  onTradeClick,
  onRemove,
}: Props) {
  const { ticker, name, accentColor } = asset;

  const price = useAssetStore((s) => s.prices[ticker]?.price);
  const changePct = useAssetStore((s) => s.prices[ticker]?.changePct);
  const selectedTicker = useAssetStore((s) => s.selectedTicker);
  const setSelectedTicker = useAssetStore((s) => s.setSelectedTicker);

  const isSelected = selectedTicker === ticker;
  const isPositive = (changePct ?? 0) >= 0;

  // Flash animation on price change
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prevPriceRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (price === undefined) return;
    if (prevPriceRef.current !== undefined) {
      if (price > prevPriceRef.current) setFlash("up");
      else if (price < prevPriceRef.current) setFlash("down");
    }
    prevPriceRef.current = price;
  }, [price]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 600);
    return () => clearTimeout(t);
  }, [flash]);

  return (
    <div
      role="button"
      tabIndex={0}
      className={`group flex flex-col gap-1 px-3 py-3 cursor-pointer transition-colors border-l-2 ${
        isSelected
          ? "bg-white/5 border-blue-400"
          : "border-transparent hover:bg-white/[0.03] hover:border-white/20"
      }`}
      onClick={() => setSelectedTicker(ticker)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setSelectedTicker(ticker);
        }
      }}
    >
      <div className="flex items-center justify-between">
        {/* Left: accent dot + ticker */}
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: accentColor }}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-gray-100">
                {ticker}
              </span>
              {asset.type === "etf" && (
                <span className="text-[10px] px-1 py-0.5 rounded bg-white/10 text-gray-400">
                  ETF
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-500 truncate max-w-[120px]">
              {name}
            </p>
          </div>
        </div>

        {/* Right: price + change */}
        <div className="flex flex-col items-end shrink-0">
          <span
            className={`text-sm font-mono font-semibold transition-colors duration-300 ${
              flash === "up"
                ? "text-emerald-400"
                : flash === "down"
                  ? "text-red-400"
                  : "text-gray-100"
            }`}
          >
            {price !== undefined ? `$${price.toFixed(2)}` : "—"}
          </span>
          <span
            className={`text-[11px] font-mono ${
              isPositive ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {changePct !== undefined
              ? `${isPositive ? "+" : ""}${changePct.toFixed(2)}%`
              : "—"}
          </span>
        </div>
      </div>

      {/* Portfolio row (shown when holding > 0) */}
      {holding && pnl && (
        <div className="flex items-center justify-between mt-0.5 pl-4">
          <span className="text-[11px] text-gray-500">
            {holding.netShares % 1 === 0
              ? holding.netShares
              : holding.netShares.toFixed(4)}{" "}
            shares
          </span>
          <span
            className={`text-[11px] font-mono ${
              pnl.unrealizedPnL >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {formatPnL(pnl.unrealizedPnL)} ({formatPct(pnl.unrealizedPnLPct)})
          </span>
        </div>
      )}

      {/* Quick actions — always visible on mobile, hover-reveal on desktop */}
      <div className="mt-1 ml-4 flex items-center gap-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTradeClick(ticker);
          }}
          className="text-[11px] text-blue-400 hover:text-blue-300"
        >
          + Trade
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(ticker);
          }}
          className="text-[11px] text-red-400/60 hover:text-red-400"
        >
          × Remove
        </button>
      </div>
    </div>
  );
}
