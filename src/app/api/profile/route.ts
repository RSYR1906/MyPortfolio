import { ETF_METADATA } from '@/lib/constants';
import { finnhubFetch } from '@/lib/finnhub';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { NextRequest, NextResponse } from 'next/server';

interface FinnhubProfile {
  name?: string;
  ticker?: string;
  country?: string;
  currency?: string;
  exchange?: string;
  ipo?: string;
  marketCapitalization?: number;
  shareOutstanding?: number;
  logo?: string;
  phone?: string;
  weburl?: string;
  finnhubIndustry?: string;
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { searchParams } = req.nextUrl;
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ error: 'Missing required param: symbol' }, { status: 400 });
  }

  // ETFs use static metadata — Finnhub profile2 doesn't cover funds
  if (ETF_METADATA[symbol]) {
    return NextResponse.json({ ticker: symbol, isEtf: true, ...ETF_METADATA[symbol] });
  }

  try {
    const profile = await finnhubFetch<FinnhubProfile>('/stock/profile2', { symbol }, 3600);
    return NextResponse.json({ ...profile, isEtf: false });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}
