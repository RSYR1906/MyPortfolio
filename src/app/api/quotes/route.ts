import { ASSETS } from '@/lib/constants';
import { finnhubFetch } from '@/lib/finnhub';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import type { PriceData } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

interface FinnhubQuote {
  c: number;  // current price
  d: number;  // daily change
  dp: number; // daily change percent
  h: number;  // day high
  l: number;  // day low
  o: number;  // day open
  pc: number; // previous close
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  // Accept ?tickers=V,AMD,GLD or fall back to the default asset list
  const tickersParam = req.nextUrl.searchParams.get('tickers');
  const raw = tickersParam
    ? tickersParam.split(',').map((t) => t.trim()).filter(Boolean)
    : ASSETS.map((a) => a.ticker);

  // Validate: each ticker must be 1-12 uppercase alphanumeric chars (+ dot for BRK.B)
  const TICKER_RE = /^[A-Z0-9.]{1,12}$/;
  const tickers = raw.filter((t) => TICKER_RE.test(t.toUpperCase()));
  if (tickers.length === 0) {
    return NextResponse.json({ error: 'No valid ticker symbols provided' }, { status: 400 });
  }

  try {
    const results = await Promise.all(
      tickers.map(async (ticker) => {
        const q = await finnhubFetch<FinnhubQuote>('/quote', { symbol: ticker }, 15);
        const data: PriceData = {
          price: q.c,
          change: q.d,
          changePct: q.dp,
          high: q.h,
          low: q.l,
          open: q.o,
          prevClose: q.pc,
        };
        return [ticker, data] as const;
      })
    );
    return NextResponse.json(Object.fromEntries(results));
  } catch {
    return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 });
  }
}
