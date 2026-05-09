"use client";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FocusView } from "@/components/focus/FocusView";
import { AssetSidebar } from "@/components/sidebar/AssetSidebar";
import { TradeModal } from "@/components/trade/TradeModal";
import { useLivePrices } from "@/hooks/useLivePrices";
import { usePortfolioSync } from "@/hooks/usePortfolioSync";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useSwipe } from "@/hooks/useSwipe";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [userId, setUserId] = useState<string | null>(null);
  const [tradeModalTicker, setTradeModalTicker] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const { pullDistance, refreshing, threshold } = usePullToRefresh(mainRef);

  // Swipe right anywhere on main content → open sidebar (mobile only)
  useSwipe(mainRef, { onSwipeRight: () => setSidebarOpen(true) });
  // Swipe left on the sidebar panel → close it (mobile only)
  useSwipe(sidebarRef, { onSwipeLeft: () => setSidebarOpen(false) });

  // Resolve the logged-in user's ID (middleware already ensures they're authed)
  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setUserId(data.user?.id ?? null))
      .catch(console.error);
  }, []);

  // Sync portfolio with Supabase (load on mount, write-back on changes)
  const { ready, error: syncError } = usePortfolioSync(userId);

  // Boot live WebSocket price feed
  useLivePrices();

  // Loading screen — shown until Supabase data is ready
  if (!ready) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 bg-[#0d1117]">
        {/* Concentric spinning rings */}
        <div className="relative flex items-center justify-center w-20 h-20">
          {/* Outer ring — slow clockwise */}
          <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 border-r-blue-500/40 animate-spin" />
          {/* Middle ring — faster counter-clockwise */}
          <span
            className="absolute inset-3 rounded-full border-2 border-transparent border-b-blue-400 border-l-blue-400/40"
            style={{ animation: "spin 0.9s linear infinite reverse" }}
          />
          {/* Inner pulsing dot */}
          <span className="w-3 h-3 rounded-full bg-blue-400 animate-pulse" />
        </div>
        <p className="text-sm text-gray-500 tracking-wide">
          Loading portfolio…
        </p>
      </div>
    );
  }

  // Load error — Supabase unreachable or auth failure
  if (syncError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-[#0d1117] p-6 text-center">
        <p className="text-sm text-red-400">{syncError}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm text-white transition-colors"
        >
          Reload
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Mobile backdrop — always mounted, fades in when sidebar opens */}
      <div
        className={`fixed inset-0 z-20 bg-black/50 md:hidden transition-opacity duration-300 ease-in-out ${
          sidebarOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar — always mounted; slides in on mobile, always visible on md+ */}
      <div
        ref={sidebarRef}
        className={`fixed inset-y-0 left-0 z-30 flex shrink-0 transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:relative md:inset-y-auto md:left-auto md:z-auto md:translate-x-0 md:transition-none`}
      >
        <AssetSidebar
          onTradeClick={(ticker) => setTradeModalTicker(ticker)}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main content area */}
      <div
        ref={mainRef}
        className="flex-1 flex flex-col min-w-0 overflow-hidden"
      >
        {/* Mobile top bar with hamburger — always on top so indicator appears below it */}
        <div className="md:hidden flex items-center gap-3 px-4 pt-safe border-b border-white/10 bg-[#0d1117] shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
            aria-expanded={sidebarOpen}
            aria-controls="asset-sidebar"
            className="flex items-center justify-center min-w-[44px] min-h-[44px] -ml-2 text-gray-400 hover:text-gray-200 transition-colors text-xl"
          >
            ☰
          </button>
          <span className="text-sm font-semibold text-gray-100">Portfolio</span>
        </div>

        {/* Pull-to-refresh indicator (mobile only) */}
        <div
          className="md:hidden shrink-0 flex items-center justify-center overflow-hidden transition-[height] duration-150"
          style={{
            height: pullDistance > 0 ? pullDistance : refreshing ? 56 : 0,
          }}
        >
          <div
            className={`w-8 h-8 border-[3px] border-t-transparent rounded-full ${
              refreshing
                ? "border-blue-400 animate-spin"
                : pullDistance >= threshold
                  ? "border-blue-400"
                  : "border-gray-600"
            }`}
            style={
              refreshing
                ? { opacity: 1 }
                : {
                    opacity: Math.min(pullDistance / (threshold * 0.4), 1),
                    transform: `rotate(${(pullDistance / threshold) * 270}deg)`,
                    transition: "transform 0.05s linear",
                  }
            }
          />
        </div>

        <ErrorBoundary>
          <FocusView />
        </ErrorBoundary>
      </div>

      {tradeModalTicker && (
        <TradeModal
          ticker={tradeModalTicker}
          onClose={() => setTradeModalTicker(null)}
        />
      )}
    </div>
  );
}
