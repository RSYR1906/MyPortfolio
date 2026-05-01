'use client';

import { useCurrencyStore } from '@/store/useCurrencyStore';
import { useEffect } from 'react';

/**
 * Provides currency conversion + formatting helpers.
 * Fetches the live USD/SGD rate once per session on first call.
 */
export function useCurrency() {
  const currency = useCurrencyStore((s) => s.currency);
  const fxRate = useCurrencyStore((s) => s.fxRate);
  const rateLoaded = useCurrencyStore((s) => s.rateLoaded);
  const setFxRate = useCurrencyStore((s) => s.setFxRate);

  // Fetch rate once per session (Zustand is a singleton, so this runs once)
  useEffect(() => {
    if (rateLoaded) return;
    fetch('/api/fx-rate')
      .then((r) => r.json())
      .then(({ rate }: { rate: number }) => setFxRate(rate))
      .catch(() => {
        /* keep fallback */
      });
  }, [rateLoaded, setFxRate]);

  const symbol = currency === 'USD' ? '$' : 'S$';

  /** Convert a USD value to the currently selected currency. */
  function convert(usd: number): number {
    return currency === 'USD' ? usd : usd * fxRate;
  }

  /** Format a USD value as a currency string, e.g. "$1,234.56" or "S$1,234.56". */
  function fmt(usd: number): string {
    return `${symbol}${convert(usd).toFixed(2)}`;
  }

  /**
   * Format a USD P&L value with a leading sign,
   * e.g. "+$123.45", "-S$67.89".
   */
  function fmtPnL(usd: number): string {
    const val = convert(usd);
    const abs = Math.abs(val).toFixed(2);
    return val >= 0 ? `+${symbol}${abs}` : `-${symbol}${abs}`;
  }

  return { currency, symbol, fxRate, convert, fmt, fmtPnL };
}
