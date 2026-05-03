// NOTE: Finnhub /stock/candle requires a paid plan.
// This route uses the Yahoo Finance unofficial chart API as the primary source
// and falls back to Finnhub if Yahoo returns an error or empty result.
import { finnhubFetch } from '@/lib/finnhub';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import type { Candle } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

interface YahooQuote {
  open: (number | null)[];
  high: (number | null)[];
  low: (number | null)[];
  close: (number | null)[];
  volume: (number | null)[];
}

interface YahooChartResult {
  timestamp: number[];
  indicators: { quote: YahooQuote[] };
}

interface YahooResponse {
  chart: {
    result: YahooChartResult[] | null;
    error: { code: string; description: string } | null;
  };
}

// Map our resolution param to Yahoo Finance interval strings
const RESOLUTION_TO_INTERVAL: Record<string, string> = {
  '1': '1m',
  '5': '5m',
  '15': '15m',
  '30': '30m',
  '60': '60m',
  'D': '1d',
  'W': '1wk',
  'M': '1mo',
};

interface FinnhubCandleResponse {
  o: number[];
  h: number[];
  l: number[];
  c: number[];
  v: number[];
  t: number[];
  s: 'ok' | 'no_data';
}

async function fetchFinnhubCandles(
  symbol: string,
  resolution: string,
  from: string,
  to: string,
  revalidate: number,
): Promise<Candle[]> {
  try {
    const data = await finnhubFetch<FinnhubCandleResponse>(
      '/stock/candle',
      { symbol, resolution, from, to },
      revalidate,
    );
    if (data.s !== 'ok' || !data.t?.length) return [];
    const candles: Candle[] = [];
    for (let i = 0; i < data.t.length; i++) {
      const o = data.o[i], h = data.h[i], l = data.l[i], c = data.c[i];
      if (o == null || h == null || l == null || c == null) continue;
      candles.push({ time: data.t[i], open: o, high: h, low: l, close: c, volume: data.v?.[i] ?? 0 });
    }
    return candles;
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { searchParams } = req.nextUrl;
  const symbol = searchParams.get('symbol');
  const resolution = searchParams.get('resolution') ?? 'D';
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!symbol || !from || !to) {
    return NextResponse.json({ error: 'Missing required params: symbol, from, to' }, { status: 400 });
  }

  const interval = RESOLUTION_TO_INTERVAL[resolution] ?? '1d';
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&period1=${from}&period2=${to}&events=div,split`;

  const revalidate = resolution === '5' || resolution === '60' ? 60 : 3600;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate },
    });

    if (!res.ok) {
      const fallback = await fetchFinnhubCandles(symbol, resolution, from, to, revalidate);
      return NextResponse.json(fallback);
    }

    const data = (await res.json()) as YahooResponse;

    if (data.chart.error || !data.chart.result?.length) {
      const fallback = await fetchFinnhubCandles(symbol, resolution, from, to, revalidate);
      return NextResponse.json(fallback);
    }

    const result = data.chart.result[0];
    const timestamps = result.timestamp;
    const quote = result.indicators.quote[0];

    if (!timestamps?.length || !quote) {
      const fallback = await fetchFinnhubCandles(symbol, resolution, from, to, revalidate);
      return NextResponse.json(fallback);
    }

    const candles: Candle[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const open = quote.open[i];
      const high = quote.high[i];
      const low = quote.low[i];
      const close = quote.close[i];
      // Skip bars with null values (pre/post market gaps)
      if (open == null || high == null || low == null || close == null) continue;
      candles.push({ time: timestamps[i], open, high, low, close, volume: quote.volume[i] ?? 0 });
    }

    if (candles.length === 0) {
      const fallback = await fetchFinnhubCandles(symbol, resolution, from, to, revalidate);
      return NextResponse.json(fallback);
    }

    return NextResponse.json(candles);
  } catch {
    const fallback = await fetchFinnhubCandles(symbol, resolution, from, to, revalidate);
    return NextResponse.json(fallback.length ? fallback : { error: 'Failed to fetch candles' }, fallback.length ? undefined : { status: 500 });
  }
}
