"use client";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FocusView } from "@/components/focus/FocusView";
import { AssetSidebar } from "@/components/sidebar/AssetSidebar";
import { TradeModal } from "@/components/trade/TradeModal";
import { useLivePrices } from "@/hooks/useLivePrices";
import { usePortfolioSync } from "@/hooks/usePortfolioSync";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export default function Home() {
  const [userId, setUserId] = useState<string | null>(null);
  const [tradeModalTicker, setTradeModalTicker] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Resolve the logged-in user's ID (middleware already ensures they're authed)
  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setUserId(data.user?.id ?? null))
      .catch(console.error);
  }, []);

  // Sync portfolio with Supabase (load on mount, write-back on changes)
  const { ready } = usePortfolioSync(userId);

  // Boot live WebSocket price feed
  useLivePrices();

  // Loading screen — shown until Supabase data is ready
  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0d1117]">
        <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
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
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar with hamburger */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-[#0d1117] shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
            className="text-gray-400 hover:text-gray-200 transition-colors text-xl leading-none"
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
