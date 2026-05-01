import { finnhubFetch } from '@/lib/finnhub';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import type { NewsItem } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

interface FinnhubNewsItem {
  id: number;
  datetime: number;
  headline: string;
  summary: string;
  source: string;
  url: string;
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { searchParams } = req.nextUrl;
  const symbol = searchParams.get('symbol');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!symbol || !from || !to) {
    return NextResponse.json({ error: 'Missing required params: symbol, from, to' }, { status: 400 });
  }

  try {
    const items = await finnhubFetch<FinnhubNewsItem[]>('/company-news', { symbol, from, to }, 300);
    const news: NewsItem[] = Array.isArray(items)
      ? items.slice(0, 25).map((n) => ({
          id: n.id,
          datetime: n.datetime,
          headline: n.headline,
          summary: n.summary,
          source: n.source,
          url: n.url,
        }))
      : [];
    return NextResponse.json(news);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
  }
}
