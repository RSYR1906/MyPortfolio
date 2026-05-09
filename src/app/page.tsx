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

  // Skeleton loading screen — shown until Supabase data is ready
  if (!ready) {
    return (
      <div className="flex h-full overflow-hidden bg-[#0d1117]">
        {/* Sidebar skeleton (desktop only) */}
        <div className="hidden md:flex w-64 shrink-0 flex-col border-r border-white/10 p-4 gap-4">
          <div className="h-7 w-3/4 rounded-md bg-white/5 animate-pulse" />
          <div className="h-8 rounded-md bg-white/5 animate-pulse" />
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse shrink-0" />
              <div className="flex-1 flex flex-col gap-1.5">
                <div className="h-3 rounded bg-white/5 animate-pulse" />
                <div className="h-2.5 rounded bg-white/5 animate-pulse w-2/3" />
              </div>
            </div>
          ))}
        </div>
        {/* Main skeleton */}
        <div className="flex-1 flex flex-col p-4 sm:p-6 gap-4">
          <div className="h-16 rounded-xl bg-white/5 animate-pulse" />
          <div className="h-56 sm:h-64 rounded-xl bg-white/5 animate-pulse" />
          <div className="h-32 rounded-xl bg-white/5 animate-pulse" />
        </div>
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
        className="flex-1 flex flex-col min-w-0 overflow-y-auto"
      >
        {/* Pull-to-refresh indicator (mobile only) */}
        <div
          className="md:hidden flex items-center justify-center overflow-hidden transition-all duration-150"
          style={{
            height: pullDistance > 0 ? pullDistance : refreshing ? 48 : 0,
          }}
        >
          <div
            className={`w-6 h-6 border-2 border-t-transparent rounded-full ${
              refreshing
                ? "border-blue-400 animate-spin"
                : pullDistance >= threshold
                  ? "border-blue-400"
                  : "border-gray-500"
            }`}
            style={
              refreshing
                ? { opacity: 1 }
                : {
                    opacity: pullDistance > 0 ? pullDistance / threshold : 0,
                    transform: `rotate(${(pullDistance / threshold) * 180}deg)`,
                    transition: "transform 0.1s linear",
                  }
            }
          />
        </div>

        {/* Mobile top bar with hamburger */}
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
