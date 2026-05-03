import { finnhubFetch } from '@/lib/finnhub';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import type { InsiderTransaction } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

interface FinnhubInsiderTransaction {
  name: string;
  share: number;
  change: number;
  transactionDate: string;
  transactionCode: string;
  transactionPrice: number;
}

interface FinnhubInsiderResponse {
  data: FinnhubInsiderTransaction[];
  symbol: string;
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
    const raw = await finnhubFetch<FinnhubInsiderResponse>(
      '/stock/insider-transactions',
      { symbol },
      1800,
    );

    const transactions: InsiderTransaction[] = (raw?.data ?? [])
      .filter((t) => t.transactionDate && t.transactionCode)
      .slice(0, 20)
      .map((t) => ({
        name: t.name,
        share: t.share,
        change: t.change,
        transactionDate: t.transactionDate,
        transactionCode: t.transactionCode,
        transactionPrice: t.transactionPrice,
      }));

    return NextResponse.json(transactions);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch insider transactions' }, { status: 502 });
  }
}
