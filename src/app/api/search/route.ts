import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { NextRequest, NextResponse } from 'next/server';

export interface SearchResult {
  ticker: string;
  name: string;
  type: 'stock' | 'etf' | 'other';
  exchange: string;
}

interface YahooQuote {
  symbol: string;
  shortname?: string;
  longname?: string;
  quoteType?: string;
  exchange?: string;
}

interface YahooSearchResponse {
  quotes: YahooQuote[];
}

const ALLOWED_TYPES = new Set(['EQUITY', 'ETF', 'MUTUALFUND']);

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 1) {
    return NextResponse.json([] as SearchResult[]);
  }

  // Basic sanity check — only allow alphanumeric + common ticker chars
  const SAFE_RE = /^[A-Za-z0-9 .^&\-]{1,40}$/;
  if (!SAFE_RE.test(q)) {
    return NextResponse.json([] as SearchResult[]);
  }

  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0&listsCount=0`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return NextResponse.json([] as SearchResult[]);
    }

    const data = (await res.json()) as YahooSearchResponse;

    const results: SearchResult[] = (data.quotes ?? [])
      .filter((q) => ALLOWED_TYPES.has((q.quoteType ?? '').toUpperCase()))
      .slice(0, 7)
      .map((q) => ({
        ticker: q.symbol,
        name: q.shortname ?? q.longname ?? q.symbol,
        type: q.quoteType?.toUpperCase() === 'ETF' ? 'etf' : 'stock',
        exchange: q.exchange ?? '',
      }));

    return NextResponse.json(results);
  } catch {
    return NextResponse.json([] as SearchResult[]);
  }
}
