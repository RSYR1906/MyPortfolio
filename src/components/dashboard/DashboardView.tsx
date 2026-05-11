"use client";

import { useCurrency } from "@/hooks/useCurrency";
import { usePortfolio } from "@/hooks/usePortfolio";
import { formatPct } from "@/lib/portfolio";
import { useAssetStore } from "@/store/useAssetStore";

interface Props {
  onSelect: (ticker: string) => void;
  onTradeClick: (ticker: string) => void;
}

export function DashboardView({ onSelect, onTradeClick }: Props) {
  const assets = useAssetStore((s) => s.assets);
  const prices = useAssetStore((s) => s.prices);
  const { holdings, pnlMap, totalValue, totalCost } = usePortfolio();
  const { fmt, fmtPnL } = useCurrency();

  const totalPnL = totalValue - totalCost;
  const totalPnLPct = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* Dashboard header */}
      <div className="px-4 sm:px-6 pt-4 pb-3 border-b border-white/10 bg-background/95 backdrop-blur-sm sticky top-0 z-10">
        <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-0.5">
          Portfolio value
        </p>
        <div className="flex items-end gap-3">
          <span className="text-2xl font-mono font-bold text-gray-100">
            {fmt(totalValue)}
          </span>
          {totalCost > 0 && (
            <span
              className={`text-sm font-mono font-semibold mb-0.5 ${
                totalPnL >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {fmtPnL(totalPnL)}{" "}
              <span className="text-xs opacity-80">
                ({formatPct(totalPnLPct)})
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Card grid */}
      <div className="p-3 sm:p-4 grid grid-cols-2 gap-2.5 sm:gap-3 content-start">
        {assets.map((asset) => {
          const { ticker, name, type, accentColor } = asset;
          const priceData = prices[ticker];
          const holding = holdings[ticker];
          const pnl = pnlMap[ticker];
          const isPositive = (priceData?.changePct ?? 0) >= 0;

          return (
            <div
              key={ticker}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(ticker)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(ticker);
                }
              }}
              className="rounded-xl border border-white/10 bg-white/2 p-3 cursor-pointer hover:bg-white/5 active:scale-[0.97] transition-all duration-150 flex flex-col"
            >
              {/* Ticker row */}
              <div className="flex items-center justify-between gap-1 mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: accentColor }}
                  />
                  <span className="text-sm font-bold text-gray-100 leading-none">
                    {ticker}
                  </span>
                  {type === "etf" && (
                    <span className="text-[9px] px-1 py-px rounded bg-white/10 text-gray-400 leading-none">
                      ETF
                    </span>
                  )}
                </div>
                {priceData && (
                  <span
                    className={`text-[11px] font-mono font-semibold shrink-0 ${
                      isPositive ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {isPositive ? "+" : ""}
                    {priceData.changePct.toFixed(2)}%
                  </span>
                )}
              </div>

              {/* Name */}
              <p className="text-[11px] text-gray-500 truncate mb-2.5 leading-none">
                {name}
              </p>

              {/* Price */}
              <p className="text-base font-mono font-bold text-gray-100 leading-none">
                {priceData ? fmt(priceData.price) : "—"}
              </p>
              {priceData && (
                <p
                  className={`text-[11px] font-mono mt-0.5 ${
                    isPositive ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {isPositive ? "+" : "—"}
                  {Math.abs(priceData.change).toFixed(2)}
                </p>
              )}

              {/* Position or watchlist tag */}
              <div className="mt-2.5 pt-2 border-t border-white/5 flex-1 flex flex-col justify-end">
                {holding && pnl ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-500">
                        {holding.netShares % 1 === 0
                          ? holding.netShares
                          : holding.netShares.toFixed(2)}{" "}
                        sh
                      </span>
                      <span className="text-[11px] font-mono text-gray-300">
                        {fmt(pnl.currentValue)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[10px] text-gray-600">
                        avg {fmt(holding.avgCostBasis)}
                      </span>
                      <span
                        className={`text-[11px] font-mono font-semibold ${
                          pnl.unrealizedPnL >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {fmtPnL(pnl.unrealizedPnL)}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-600 uppercase tracking-wider">
                      Watchlist
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTradeClick(ticker);
                      }}
                      className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      + Trade
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {assets.length === 0 && (
          <div className="col-span-2 flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-gray-500">No assets tracked yet.</p>
            <p className="text-xs text-gray-600 mt-1">
              Open the sidebar and add a ticker to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
