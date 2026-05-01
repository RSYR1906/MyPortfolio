"use client";

import { TradeForm } from "@/components/trade/TradeForm";
import { TransactionHistory } from "@/components/trade/TransactionHistory";
import { useCandles } from "@/hooks/useCandles";
import { useNews } from "@/hooks/useNews";
import { usePortfolio } from "@/hooks/usePortfolio";
import { formatPct, formatPnL } from "@/lib/portfolio";
import { useAssetStore } from "@/store/useAssetStore";
import type { Timeframe } from "@/types";
import { useState } from "react";
import { AssetProfile } from "./AssetProfile";
import { NewsFeed } from "./NewsFeed";
import { PriceChart } from "./PriceChart";
import { TimeframeSelector } from "./TimeframeSelector";

export function FocusView() {
  const ticker = useAssetStore((s) => s.selectedTicker);
  const priceData = useAssetStore((s) => s.prices[ticker]);

  const asset = useAssetStore((s) => s.assets.find((a) => a.ticker === ticker));
  const [timeframe, setTimeframe] = useState<Timeframe>("1D");

  const { holdings, pnlMap } = usePortfolio();
  const holding = holdings[ticker];
  const pnl = pnlMap[ticker];

  const {
    candles,
    loading: candlesLoading,
    error: candlesError,
    retry: retryCandles,
  } = useCandles(ticker, timeframe);
  const {
    news,
    loading: newsLoading,
    error: newsError,
    retry: retryNews,
  } = useNews(ticker, asset?.type === "etf");

  const isPositive = (priceData?.changePct ?? 0) >= 0;

  if (!asset) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-gray-500">
          Select an asset from the sidebar.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0d1117]/95 backdrop-blur-sm border-b border-white/10 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-3">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: asset.accentColor }}
              />
              <h2 className="text-lg sm:text-xl font-bold text-gray-100">
                {ticker}
              </h2>
              {asset.type === "etf" && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-gray-400">
                  ETF
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5 ml-6">{asset.name}</p>
          </div>

          <div className="ml-6 sm:ml-0 sm:text-right">
            <p className="text-xl sm:text-2xl font-mono font-bold text-gray-100">
              {priceData ? `$${priceData.price.toFixed(2)}` : "—"}
            </p>
            {priceData && (
              <p
                className={`text-sm font-mono ${isPositive ? "text-emerald-400" : "text-red-400"}`}
              >
                {isPositive ? "+" : ""}${priceData.change.toFixed(2)} (
                {isPositive ? "+" : ""}
                {priceData.changePct.toFixed(2)}%)
              </p>
            )}
          </div>
        </div>

        {/* Holding summary in header */}
        {holding && pnl && (
          <div className="mt-2 ml-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] sm:text-[13px]">
            <span className="text-gray-500">
              Holding:{" "}
              <span className="text-gray-300 font-mono">
                {holding.netShares % 1 === 0
                  ? holding.netShares
                  : holding.netShares.toFixed(4)}{" "}
                shares
              </span>
            </span>
            <span className="text-gray-500">
              Avg cost:{" "}
              <span className="text-gray-300 font-mono">
                ${holding.avgCostBasis.toFixed(2)}
              </span>
            </span>
            <span className="text-gray-500">
              Value:{" "}
              <span className="text-gray-300 font-mono">
                ${pnl.currentValue.toFixed(2)}
              </span>
            </span>
            <span
              className={`font-mono font-semibold ${pnl.unrealizedPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}
            >
              {formatPnL(pnl.unrealizedPnL)} ({formatPct(pnl.unrealizedPnLPct)})
            </span>
          </div>
        )}
      </div>

      {/* Body — key triggers remount on ticker change, playing the fade-in animation */}
      <div
        key={ticker}
        className="flex-1 p-4 sm:p-6 space-y-4 sm:space-y-6 anim-fade-in-up"
      >
        {/* Chart */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Chart
            </h3>
            <TimeframeSelector value={timeframe} onChange={setTimeframe} />
          </div>
          <div className="h-64 md:h-80">
            <PriceChart
              candles={candles}
              loading={candlesLoading}
              error={candlesError}
              accentColor={asset.accentColor}
              onRetry={retryCandles}
            />
          </div>
        </div>

        {/* Profile */}
        <AssetProfile ticker={ticker} />

        {/* Two-column: Trade form + History */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Trade
            </h3>
            <TradeForm ticker={ticker} />
          </div>
          <TransactionHistory ticker={ticker} />
        </div>

        {/* News */}
        <NewsFeed
          news={news}
          loading={newsLoading}
          error={newsError}
          onRetry={retryNews}
        />
      </div>
    </div>
  );
}
