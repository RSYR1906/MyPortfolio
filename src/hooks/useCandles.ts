'use client';

import type { Candle, Timeframe } from '@/types';
import { useEffect, useRef, useState } from 'react';

// ── In-memory cache (per session) ────────────────────────────────────────────
interface CacheEntry { data: Candle[]; expiry: number }
const candleCache = new Map<string, CacheEntry>();

const CACHE_TTL_MS: Record<Timeframe, number> = {
  '1D':  60_000,       // 1 minute  — intraday data changes frequently
  '1W':  300_000,      // 5 minutes
  '1M':  3_600_000,    // 1 hour
  '3M':  3_600_000,
  '6M':  3_600_000,
  '1Y':  3_600_000,
  'YTD': 3_600_000,
};

// ── US market hours check (NYSE/NASDAQ: Mon–Fri 09:30–16:00 ET) ──────────────
function isUsMarketOpen(): boolean {
  const now = new Date();
  const day = now.getUTCDay(); // 0 = Sun, 6 = Sat
  if (day === 0 || day === 6) return false;

  // Determine ET offset: EDT (UTC-4) Mar–Nov, EST (UTC-5) Nov–Mar
  // Approximate: EDT starts 2nd Sunday March, EST starts 1st Sunday November
  const year = now.getUTCFullYear();
  const edtStart = new Date(Date.UTC(year, 2, 8 + ((7 - new Date(Date.UTC(year, 2, 8)).getUTCDay()) % 7), 7)); // 2nd Sun Mar 02:00 ET
  const estStart = new Date(Date.UTC(year, 10, 1 + ((7 - new Date(Date.UTC(year, 10, 1)).getUTCDay()) % 7), 6)); // 1st Sun Nov 02:00 ET
  const offsetHours = now >= edtStart && now < estStart ? 4 : 5;

  const etHour = (now.getUTCHours() - offsetHours + 24) % 24;
  const etMinute = now.getUTCMinutes();
  const etTotalMins = etHour * 60 + etMinute;

  return etTotalMins >= 9 * 60 + 30 && etTotalMins < 16 * 60;
}

/** Poll interval for 1D during market hours (ms). */
const MARKET_POLL_MS = 60_000;

// ── Timeframe → API params ────────────────────────────────────────────────────
function timeframeParams(tf: Timeframe): { resolution: string; from: number; to: number } {
  const now = Math.floor(Date.now() / 1000);
  switch (tf) {
    case '1D':  return { resolution: '5',  from: now - 86_400,        to: now };
    case '1W':  return { resolution: '60', from: now - 7 * 86_400,    to: now };
    case '1M':  return { resolution: 'D',  from: now - 30 * 86_400,   to: now };
    case '3M':  return { resolution: 'D',  from: now - 90 * 86_400,   to: now };
    case '6M':  return { resolution: 'D',  from: now - 180 * 86_400,  to: now };
    case '1Y':  return { resolution: 'W',  from: now - 365 * 86_400,  to: now };
    case 'YTD': {
      const start = new Date(new Date().getFullYear(), 0, 1);
      return { resolution: 'D', from: Math.floor(start.getTime() / 1000), to: now };
    }
  }
}

export function useCandles(ticker: string, timeframe: Timeframe) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  // Track whether this is a manual retry so we bypass cache
  const isRetry = useRef(false);

  useEffect(() => {
    if (!ticker) return;
    let cancelled = false;

    const cacheKey = `${ticker}:${timeframe}`;
    const cached = candleCache.get(cacheKey);
    const bypassCache = isRetry.current;
    isRetry.current = false;

    if (!bypassCache && cached && Date.now() < cached.expiry) {
      setCandles(cached.data);
      setLoading(false);
      setError(null);
      return;
    }

    const { resolution, from, to } = timeframeParams(timeframe);
    const url = `/api/candles?symbol=${ticker}&resolution=${resolution}&from=${from}&to=${to}`;

    setLoading(true);
    setError(null);

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Candle[]>;
      })
      .then((data) => {
        if (!cancelled) {
          const result = Array.isArray(data) ? data : [];
          candleCache.set(cacheKey, { data: result, expiry: Date.now() + CACHE_TTL_MS[timeframe] });
          setCandles(result);
          setLoading(false);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to fetch candles');
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [ticker, timeframe, retryCount]);

  const retry = () => {
    isRetry.current = true;
    setRetryCount((c) => c + 1);
  };

  // Auto-refresh 1D chart every minute while the US market is open
  useEffect(() => {
    if (timeframe !== '1D') return;

    const id = setInterval(() => {
      if (isUsMarketOpen()) {
        // Bypass cache so we always fetch fresh intraday data
        isRetry.current = true;
        setRetryCount((c) => c + 1);
      }
    }, MARKET_POLL_MS);

    return () => clearInterval(id);
  }, [timeframe]);

  return { candles, loading, error, retry };
}
