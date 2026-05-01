import { NextResponse } from 'next/server';

interface YahooMeta {
  regularMarketPrice?: number;
}

interface YahooChartResponse {
  chart: {
    result: Array<{ meta: YahooMeta }> | null;
    error: unknown;
  };
}

const FALLBACK_RATE = 1.33;

export async function GET() {
  try {
    const res = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/USDSGD=X?range=1d&interval=1d',
      {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 300 }, // cache for 5 minutes
      },
    );

    if (!res.ok) {
      return NextResponse.json({ rate: FALLBACK_RATE });
    }

    const data = (await res.json()) as YahooChartResponse;
    const rate =
      data.chart.result?.[0]?.meta?.regularMarketPrice ?? FALLBACK_RATE;

    if (typeof rate !== 'number' || !isFinite(rate) || rate <= 0) {
      return NextResponse.json({ rate: FALLBACK_RATE });
    }

    return NextResponse.json({ rate });
  } catch {
    return NextResponse.json({ rate: FALLBACK_RATE });
  }
}
