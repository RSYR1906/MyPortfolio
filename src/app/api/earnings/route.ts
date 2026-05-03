import { finnhubFetch } from '@/lib/finnhub';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import type { EarningsEvent } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

interface FinnhubEarnings {
  actual: number | null;
  estimate: number | null;
  period: string; // "2024-03-30"
  quarter: number;
  year: number;
}

const SYMBOL_RE = /^[A-Z0-9.]{1,12}$/;

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const symbol = req.nextUrl.searchParams.get('symbol')?.trim().toUpperCase();
  if (!symbol || !SYMBOL_RE.test(symbol)) {
    return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 });
  }

  try {
    const raw = await finnhubFetch<FinnhubEarnings[]>('/stock/earnings', { symbol }, 3600);

    const events: EarningsEvent[] = (raw ?? []).slice(0, 8).map((e) => ({
      date: e.period,
      epsActual: e.actual ?? null,
      epsEstimate: e.estimate ?? null,
      quarter: e.quarter,
      year: e.year,
    }));

    return NextResponse.json(events);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch earnings' }, { status: 502 });
  }
}
