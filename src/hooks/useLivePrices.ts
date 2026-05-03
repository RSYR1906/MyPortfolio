'use client';

import { useAssetStore } from '@/store/useAssetStore';
import { useEffect, useRef } from 'react';

/**
 * Streams live trade prices from the server-side SSE proxy (/api/prices).
 * The Finnhub WS key stays on the server — the browser only sees an EventSource.
 *
 * Re-opens the stream automatically whenever the tracked asset list changes.
 * Mount once at the root dashboard level.
 */
export function useLivePrices() {
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    function openStream(tickers: string[]) {
      esRef.current?.close();
      esRef.current = null;
      if (tickers.length === 0) return;

      const url = `/api/prices?tickers=${encodeURIComponent(tickers.join(','))}`;
      const es = new EventSource(url);

      es.onmessage = (event) => {
        try {
          const { ticker, price } = JSON.parse(event.data as string) as {
            ticker: string;
            price: number;
          };
          useAssetStore.getState().updatePrice(ticker, { price });
        } catch {
          // ignore malformed messages
        }
      };

      // EventSource auto-reconnects on transient errors; no manual retry needed.
      esRef.current = es;
    }

    // Initial open with the current asset list
    openStream(useAssetStore.getState().assets.map((a) => a.ticker));

    // Re-open whenever the asset list changes (ticker added / removed)
    const unsubscribe = useAssetStore.subscribe((state, prevState) => {
      const prev = prevState.assets.map((a) => a.ticker).sort().join(',');
      const next = state.assets.map((a) => a.ticker).sort().join(',');
      if (prev !== next) {
        openStream(state.assets.map((a) => a.ticker));
      }
    });

    return () => {
      unsubscribe();
      esRef.current?.close();
      esRef.current = null;
    };
  }, []); // mount once
}
