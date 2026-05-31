"use client";

import {
  AssetDot,
  EtfBadge,
  SectionHeading,
} from "@/components/common/AssetVisuals";
import { TradeForm } from "@/components/trade/TradeForm";
import { TransactionHistory } from "@/components/trade/TransactionHistory";
import { useCandles } from "@/hooks/useCandles";
import { useCurrency } from "@/hooks/useCurrency";
import { useNews } from "@/hooks/useNews";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useSwipe } from "@/hooks/useSwipe";
import { formatShareCount } from "@/lib/display";
import { formatPct } from "@/lib/portfolio";
import { useAssetStore } from "@/store/useAssetStore";
import type { Timeframe } from "@/types";
import { useRef, useState } from "react";
import { AnalystRatings } from "./AnalystRatings";
import { AssetProfile } from "./AssetProfile";
import { InsiderTransactions } from "./InsiderTransactions";
import { NewsFeed } from "./NewsFeed";
import { PositionNotes } from "./PositionNotes";
import { PriceChart } from "./PriceChart";
import { TimeframeSelector } from "./TimeframeSelector";

const TABS = ["overview", "trade", "news"] as const;
type Tab = (typeof TABS)[number];

export function FocusView() {
  const ticker = useAssetStore((s) => s.selectedTicker);
  const priceData = useAssetStore((s) => s.prices[ticker]);

  const asset = useAssetStore((s) => s.assets.find((a) => a.ticker === ticker));
  const [timeframe, setTimeframe] = useState<Timeframe>("1D");
  const [mobileTab, setMobileTab] = useState<Tab>("overview");
  const bodyRef = useRef<HTMLDivElement>(null);
  useSwipe(bodyRef, {
    onSwipeLeft: () =>
      setMobileTab((t) => {
        const i = TABS.indexOf(t);
        return i < TABS.length - 1 ? TABS[i + 1] : t;
      }),
    onSwipeRight: () =>
      setMobileTab((t) => {
        const i = TABS.indexOf(t);
        return i > 0 ? TABS[i - 1] : t;
      }),
  });

  const { holdings, pnlMap } = usePortfolio();
  const holding = holdings[ticker];
  const pnl = pnlMap[ticker];

  const { symbol, fmt, fmtPnL, convert } = useCurrency();

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
    <div ref={bodyRef} className="flex-1 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-white/10">
        <div className="px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-3">
                <AssetDot accentColor={asset.accentColor} className="w-3 h-3" />
                <h2 className="text-lg sm:text-xl font-bold text-gray-100">
                  {ticker}
                </h2>
                {asset.type === "etf" && (
                  <EtfBadge className="text-xs px-1.5 py-0.5" />
                )}
              </div>
              <p className="text-sm text-gray-500 mt-0.5 ml-6">{asset.name}</p>
            </div>

            <div className="ml-6 sm:ml-0 sm:text-right">
              <p className="text-xl sm:text-2xl font-mono font-bold text-gray-100">
                {priceData ? fmt(priceData.price) : "—"}
              </p>
              {priceData && (
                <p
                  className={`text-sm font-mono ${isPositive ? "text-emerald-400" : "text-red-400"}`}
                >
                  {isPositive ? "+" : ""}
                  {symbol}
                  {Math.abs(convert(priceData.change)).toFixed(2)} (
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
                  {formatShareCount(holding.netShares)} shares
                </span>
              </span>
              <span className="text-gray-500">
                Avg cost:{" "}
                <span className="text-gray-300 font-mono">
                  {fmt(holding.avgCostBasis)}
                </span>
              </span>
              <span className="text-gray-500">
                Value:{" "}
                <span className="text-gray-300 font-mono">
                  {fmt(pnl.currentValue)}
                </span>
              </span>
              <span
                className={`font-mono font-semibold ${pnl.unrealizedPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}
              >
                {fmtPnL(pnl.unrealizedPnL)} ({formatPct(pnl.unrealizedPnLPct)})
              </span>
            </div>
          )}
        </div>

        {/* Mobile section tabs — hidden on md+ where all sections show at once */}
        <div className="md:hidden flex border-t border-white/5">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setMobileTab(tab)}
              className={`flex-1 py-3.5 sm:py-2.5 text-xs font-semibold capitalize transition-colors border-b-2 ${
                mobileTab === tab
                  ? "text-blue-400 border-blue-400"
                  : "text-gray-500 hover:text-gray-300 border-transparent"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Body — key triggers remount on ticker change, playing the fade-in animation */}
      <div
        key={ticker}
        className="flex-1 flex flex-col p-4 sm:p-6 gap-4 sm:gap-6 anim-fade-in-up"
      >
        {/* Overview: Chart + Profile — flex so hidden siblings don't create gaps on mobile */}
        <div
          className={`flex flex-col gap-4 sm:gap-6${
            mobileTab !== "overview" ? " hidden md:flex" : ""
          }`}
        >
          {/* Chart */}
          <div className="rounded-xl border border-white/10 bg-white/2 p-4">
            <div className="flex items-center justify-between mb-3">
              <SectionHeading>Chart</SectionHeading>
              <TimeframeSelector value={timeframe} onChange={setTimeframe} />
            </div>
            <div className="h-56 sm:h-64 md:h-80">
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

          {/* Analyst ratings + insider transactions — stocks only */}
          {asset.type !== "etf" && (
            <>
              <AnalystRatings ticker={ticker} />
              <InsiderTransactions ticker={ticker} />
            </>
          )}
        </div>

        {/* Trade + History */}
        <div className={mobileTab !== "trade" ? "hidden md:block" : ""}>
          {/* Notes */}
          <div className="rounded-xl border border-white/10 bg-white/2 p-4 mb-6">
            <SectionHeading className="mb-2">Notes</SectionHeading>
            <PositionNotes ticker={ticker} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-white/10 bg-white/2 p-4 space-y-4">
              <SectionHeading>Trade</SectionHeading>
              <TradeForm ticker={ticker} />
            </div>
            <TransactionHistory ticker={ticker} />
          </div>
        </div>

        {/* News */}
        <div className={mobileTab !== "news" ? "hidden md:block" : ""}>
          <NewsFeed
            news={news}
            loading={newsLoading}
            error={newsError}
            onRetry={retryNews}
          />
        </div>
      </div>
    </div>
  );
}
