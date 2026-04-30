'use client';

import { ASSETS } from '@/lib/constants';
import { finnhubWsManager } from '@/lib/finnhubWs';
import { createClient } from '@/lib/supabase/client';
import { useAssetStore } from '@/store/useAssetStore';
import type { Asset, Transaction } from '@/types';
import { useEffect, useRef, useState } from 'react';

/**
 * Loads the user's portfolio from Supabase on mount, then subscribes to
 * in-memory store changes and writes them back to Supabase.
 *
 * Returns `ready: true` once the initial load is complete so the parent
 * can gate rendering until data is available.
 */
export function usePortfolioSync(userId: string | null): { ready: boolean } {
  const [ready, setReady] = useState(false);
  const initialLoadDone = useRef(false);

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();

    async function load() {
      const [portfolioRes, txRes] = await Promise.all([
        supabase
          .from('portfolios')
          .select('assets, selected_ticker')
          .eq('user_id', userId)
          .single(),
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: true }),
      ]);

      // New user → no portfolio row yet; fall back to default asset list
      const assets: Asset[] =
        portfolioRes.data?.assets ?? ASSETS;
      const selectedTicker: string =
        portfolioRes.data?.selected_ticker ?? assets[0]?.ticker ?? '';

      const transactions: Transaction[] = (txRes.data ?? []).map((row) => ({
        id: row.id as string,
        ticker: row.ticker as string,
        type: row.type as 'buy' | 'sell',
        shares: row.shares as number,
        pricePerShare: row.price_per_share as number,
        date: row.date as string,
      }));

      useAssetStore.getState().loadPortfolio(assets, transactions, selectedTicker);

      // Subscribe any tickers to the WS manager (works whether WS is
      // already open or not — subscribeTicker updates the internal list).
      assets.forEach((a) => finnhubWsManager.subscribeTicker(a.ticker));

      // Fetch REST quotes for all loaded assets
      const tickers = assets.map((a) => a.ticker).join(',');
      fetch(`/api/quotes?tickers=${encodeURIComponent(tickers)}`)
        .then((r) => r.json())
        .then((data) => useAssetStore.getState().initPrices(data))
        .catch(console.error);

      initialLoadDone.current = true;
      setReady(true);
    }

    load().catch(console.error);
  }, [userId]);

  // ── Write-back subscription ─────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();

    const unsub = useAssetStore.subscribe((state, prevState) => {
      // Guard: don't write during the initial load itself
      if (!initialLoadDone.current) return;

      // New transaction added (transactions are append-only)
      if (state.transactions.length > prevState.transactions.length) {
        const newTx = state.transactions[state.transactions.length - 1];
        supabase
          .from('transactions')
          .insert({
            id: newTx.id,
            user_id: userId,
            ticker: newTx.ticker,
            type: newTx.type,
            shares: newTx.shares,
            price_per_share: newTx.pricePerShare,
            date: newTx.date,
          })
          .then(({ error }) => {
            if (error) console.error('Failed to save transaction:', error);
          });
      }

      // Asset list or selected ticker changed → upsert portfolio row
      if (
        state.assets !== prevState.assets ||
        state.selectedTicker !== prevState.selectedTicker
      ) {
        supabase
          .from('portfolios')
          .upsert({
            user_id: userId,
            assets: state.assets,
            selected_ticker: state.selectedTicker,
            updated_at: new Date().toISOString(),
          })
          .then(({ error }) => {
            if (error) console.error('Failed to save portfolio:', error);
          });
      }
    });

    return unsub;
  }, [userId]);

  return { ready };
}
