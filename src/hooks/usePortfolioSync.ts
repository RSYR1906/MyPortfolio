'use client';

import { ASSETS } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import { useAssetStore } from '@/store/useAssetStore';
import type { Asset, Transaction } from '@/types';
import { useEffect, useRef, useState } from 'react';

interface SupabaseTransactionRow {
  id: string;
  ticker: string;
  type: 'buy' | 'sell';
  shares: number;
  price_per_share: number;
  date: string;
}

function logSyncError(context: string, err: unknown) {
  console.error(`Portfolio sync: ${context}`, err);
}

function mapTransactionRow(row: SupabaseTransactionRow): Transaction {
  return {
    id: row.id,
    ticker: row.ticker,
    type: row.type,
    shares: row.shares,
    pricePerShare: row.price_per_share,
    date: row.date,
  };
}

async function loadQuotesForAssets(assets: Asset[]) {
  const tickers = assets.map((a) => a.ticker);
  if (tickers.length === 0) return;

  try {
    const res = await fetch(
      `/api/quotes?tickers=${encodeURIComponent(tickers.join(','))}`,
    );
    if (!res.ok) {
      logSyncError(`quote bootstrap failed (${res.status})`, null);
      return;
    }
    const data = await res.json();
    useAssetStore.getState().initPrices(data);
  } catch (err) {
    logSyncError('quote bootstrap failed', err);
  }
}

/**
 * Loads the user's portfolio from Supabase on mount, then subscribes to
 * in-memory store changes and writes them back to Supabase.
 *
 * Returns `ready: true` once the initial load is complete so the parent
 * can gate rendering until data is available.
 */
export function usePortfolioSync(userId: string | null): { ready: boolean; error: string | null } {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialLoadDone = useRef(false);

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();

    async function load() {
      const [portfolioRes, txRes] = await Promise.all([
        supabase
          .from('portfolios')
          .select('assets, selected_ticker, notes')
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
      const notes: Record<string, string> =
        (portfolioRes.data?.notes as Record<string, string> | null) ?? {};

      const transactions: Transaction[] = ((txRes.data ?? []) as SupabaseTransactionRow[])
        .map(mapTransactionRow);

      useAssetStore.getState().loadPortfolio(assets, transactions, selectedTicker, notes);

      // Fetch REST quotes for all loaded assets
      await loadQuotesForAssets(assets);

      initialLoadDone.current = true;
      setReady(true);
    }

    load().catch((err) => {
      logSyncError('initial load failed', err);
      setError('Failed to load portfolio. Please refresh.');
      setReady(true); // unblock the loading spinner
    });
  }, [userId]);

  // ── Write-back subscription ─────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();

    return useAssetStore.subscribe((state, prevState) => {
      // Guard: don't write during the initial load itself
      if (!initialLoadDone.current) return;

      // New transaction added
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
            if (error) logSyncError('failed to save transaction', error);
          });
      }

      // Transaction deleted
      if (state.transactions.length < prevState.transactions.length) {
        const prevIds = new Set(prevState.transactions.map((t) => t.id));
        const currIds = new Set(state.transactions.map((t) => t.id));
        for (const id of prevIds) {
          if (!currIds.has(id)) {
            supabase
              .from('transactions')
              .delete()
              .eq('id', id)
              .then(({ error }) => {
                if (error) logSyncError('failed to delete transaction', error);
              });
          }
        }
      }

      // Asset list, selected ticker, or notes changed → upsert portfolio row
      if (
        state.assets !== prevState.assets ||
        state.selectedTicker !== prevState.selectedTicker ||
        state.notes !== prevState.notes
      ) {
        supabase
          .from('portfolios')
          .upsert({
            user_id: userId,
            assets: state.assets,
            selected_ticker: state.selectedTicker,
            notes: state.notes,
            updated_at: new Date().toISOString(),
          })
          .then(({ error }) => {
            if (error) logSyncError('failed to save portfolio', error);
          });
      }
    });

  }, [userId]);

  return { ready, error };
}
