// ── Asset ─────────────────────────────────────────────────────────────────────
export interface Asset {
  ticker: string;
  name: string;
  type: 'stock' | 'etf';
  accentColor: string;
}

// ── Price ──────────────────────────────────────────────────────────────────────
export interface PriceData {
  price: number;
  change: number;
  changePct: number;
  high: number;
  low: number;
  open: number;
  prevClose: number;
}

// ── Chart ──────────────────────────────────────────────────────────────────────
export interface Candle {
  time: number; // unix timestamp (seconds)
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export type Timeframe = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'YTD';
export type ChartType = 'line' | 'candlestick';

// ── News ───────────────────────────────────────────────────────────────────────
export interface NewsItem {
  id: number;
  datetime: number; // unix timestamp
  headline: string;
  summary: string;
  source: string;
  url: string;
}

// ── Transactions ───────────────────────────────────────────────────────────────
export interface Transaction {
  id: string;
  ticker: string;
  type: 'buy' | 'sell';
  shares: number;
  pricePerShare: number;
  date: string; // ISO string
}

// ── Portfolio ──────────────────────────────────────────────────────────────────
export interface Holding {
  ticker: string;
  netShares: number;
  avgCostBasis: number;
  totalCost: number;
}

export interface PnL {
  ticker: string;
  currentValue: number;
  unrealizedPnL: number;
  unrealizedPnLPct: number;
}

export interface RealizedPnL {
  ticker: string;
  realizedPnL: number;
  /** Total sale proceeds for closed/partial positions. */
  proceeds: number;
  /** Cost basis of shares that were sold. */
  costBasis: number;
  realizedPnLPct: number;
}
