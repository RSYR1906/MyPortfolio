import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import type { Asset } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

interface YahooMeta {
  symbol: string;
  shortName?: string;
  longName?: string;
  instrumentType?: string; // "EQUITY" | "ETF" | "CRYPTOCURRENCY" | etc.
}

interface YahooChartResponse {
  chart: {
    result: Array<{ meta: YahooMeta }> | null;
    error: { code: string; description: string } | null;
  };
}

// Deterministic accent colour from ticker symbol
const ACCENT_PALETTE = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#3b82f6', '#ef4444', '#14b8a6', '#f97316', '#84cc16',
];
function tickerAccentColor(ticker: string): string {
  let hash = 0;
  for (const ch of ticker) hash = ((hash * 31) + ch.charCodeAt(0)) >>> 0;
  return ACCENT_PALETTE[hash % ACCENT_PALETTE.length];
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const symbol = req.nextUrl.searchParams.get('symbol')?.toUpperCase();
  if (!symbol) {
    return NextResponse.json({ error: 'Missing symbol param' }, { status: 400 });
  }

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      // Ticker validation results are stable — cache for 24 hours
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Yahoo Finance returned ${res.status}` }, { status: 404 });
    }

    const data = (await res.json()) as YahooChartResponse;

    if (data.chart.error || !data.chart.result?.length) {
      return NextResponse.json({ error: `Symbol "${symbol}" not found` }, { status: 404 });
    }

    const meta = data.chart.result[0].meta;
    const name = meta.shortName ?? meta.longName ?? symbol;
    const instrumentType = (meta.instrumentType ?? 'EQUITY').toUpperCase();
    const type: Asset['type'] = instrumentType === 'ETF' ? 'etf' : 'stock';

    const asset: Asset = {
      ticker: symbol,
      name,
      type,
      accentColor: tickerAccentColor(symbol),
    };

    return NextResponse.json(asset);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
