'use client';

import { finnhubWsManager } from '@/lib/finnhubWs';
import { useAssetStore } from '@/store/useAssetStore';
import { useEffect } from 'react';

/**
 * Mounts the Finnhub WebSocket singleton and pipes live trade prices
 * into the Zustand store. Mount once at the root dashboard level.
 *
 * The WebSocket token is fetched from /api/ws-token (server-side env var)
 * so it is NOT baked into the JS bundle.  Falls back to the legacy
 * NEXT_PUBLIC_FINNHUB_WS_KEY if the server endpoint is unavailable.
 *
 * Waits for the store to rehydrate so that the user's persisted asset
 * watch-list (not just the compile-time defaults) is used for subscriptions.
 */
export function useLivePrices() {
  useEffect(() => {
    const callback = (ticker: string, price: number) => {
      useAssetStore.getState().updatePrice(ticker, { price });
    };

    finnhubWsManager.subscribe(callback);

    // Fetch token from server endpoint (key stays out of the JS bundle),
    // then rehydrate the store and open the WebSocket.
    fetch('/api/ws-token')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(({ token }: { token: string }) => token)
      .catch(() => {
        // Fallback: legacy public key (less secure but keeps dev working)
        return process.env.NEXT_PUBLIC_FINNHUB_WS_KEY ?? null;
      })
      .then((token) => {
        if (!token || token === 'your_finnhub_api_key_here') return;
        // page.tsx calls rehydrate() synchronously on mount (localStorage is sync).
        // By the time this async token fetch resolves, the store is already populated.
        const tickers = useAssetStore.getState().assets.map((a) => a.ticker);
        finnhubWsManager.connect(token, tickers);
      })
      .catch(console.error);

    return () => {
      finnhubWsManager.unsubscribe(callback);
    };
  }, []); // empty deps: connect once on mount
}
