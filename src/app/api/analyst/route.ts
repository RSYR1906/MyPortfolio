import { finnhubFetch } from '@/lib/finnhub';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import type { AnalystRecommendation, PriceTarget } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

interface FinnhubRecommendation {
  period: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

interface FinnhubPriceTarget {
  targetHigh: number;
  targetLow: number;
  targetMean: number;
  targetMedian: number;
  lastUpdated: string;
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
    const [rawRecs, rawTarget] = await Promise.all([
      finnhubFetch<FinnhubRecommendation[]>('/stock/recommendation', { symbol }, 3600),
      finnhubFetch<FinnhubPriceTarget>('/stock/price-target', { symbol }, 3600),
    ]);

    const recommendations: AnalystRecommendation[] = (rawRecs ?? []).slice(0, 4).map((r) => ({
      period: r.period,
      strongBuy: r.strongBuy,
      buy: r.buy,
      hold: r.hold,
      sell: r.sell,
      strongSell: r.strongSell,
    }));

    const priceTarget: PriceTarget | null =
      rawTarget?.targetMean
        ? {
            targetHigh: rawTarget.targetHigh,
            targetLow: rawTarget.targetLow,
            targetMean: rawTarget.targetMean,
            targetMedian: rawTarget.targetMedian,
            lastUpdated: rawTarget.lastUpdated,
          }
        : null;

    return NextResponse.json({ recommendations, priceTarget });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch analyst data' }, { status: 502 });
  }
}
