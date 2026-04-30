'use client';

import type { NewsItem } from '@/types';
import { useEffect, useRef, useState } from 'react';

function dateStr(daysAgo: number): string {
  const d = new Date(Date.now() - daysAgo * 86400 * 1000);
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

// ── Client-side cache (per session, same pattern as useCandles) ───────────────
interface NewsCacheEntry { data: NewsItem[]; expiry: number }
const newsCache = new Map<string, NewsCacheEntry>();
const NEWS_TTL_MS = 300_000; // 5 minutes

export function useNews(ticker: string, isEtf: boolean) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const isRetry = useRef(false);

  useEffect(() => {
    if (!ticker) return;
    let cancelled = false;

    const windowDays = isEtf ? 14 : 7;
    const from = dateStr(windowDays);
    const to = dateStr(0);
    const cacheKey = `${ticker}:${from}:${to}`;

    const bypassCache = isRetry.current;
    isRetry.current = false;

    if (!bypassCache) {
      const cached = newsCache.get(cacheKey);
      if (cached && Date.now() < cached.expiry) {
        setNews(cached.data);
        setLoading(false);
        setError(null);
        return;
      }
    }

    const url = `/api/news?symbol=${ticker}&from=${from}&to=${to}`;
    setLoading(true);
    setError(null);

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<NewsItem[]>;
      })
      .then((data) => {
        if (!cancelled) {
          const result = Array.isArray(data) ? data : [];
          newsCache.set(cacheKey, { data: result, expiry: Date.now() + NEWS_TTL_MS });
          setNews(result);
          setLoading(false);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to fetch news');
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [ticker, isEtf, retryCount]);

  const retry = () => {
    isRetry.current = true;
    setRetryCount((c) => c + 1);
  };

  return { news, loading, error, retry };
}
