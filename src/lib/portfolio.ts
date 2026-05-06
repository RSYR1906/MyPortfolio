import type { Holding, PnL, PriceData, RealizedPnL, Transaction } from '@/types';

/** Compute per-ticker holdings (net shares, avg cost basis) from transaction history. */
export function computeHoldings(transactions: Transaction[]): Record<string, Holding> {
  const map: Record<string, { totalShares: number; totalCost: number }> = {};

  for (const tx of transactions) {
    if (!map[tx.ticker]) map[tx.ticker] = { totalShares: 0, totalCost: 0 };
    if (tx.type === 'buy') {
      map[tx.ticker].totalShares += tx.shares;
      map[tx.ticker].totalCost += tx.shares * tx.pricePerShare;
    } else {
      const entry = map[tx.ticker];
      const ratio = Math.min(tx.shares, entry.totalShares) / (entry.totalShares || 1);
      entry.totalCost -= entry.totalCost * ratio;
      entry.totalShares -= tx.shares;
    }
  }

  const holdings: Record<string, Holding> = {};
  for (const [ticker, { totalShares, totalCost }] of Object.entries(map)) {
    const netShares = Math.max(0, totalShares);
    if (netShares === 0) continue;
    holdings[ticker] = {
      ticker,
      netShares,
      avgCostBasis: netShares > 0 ? totalCost / netShares : 0,
      totalCost,
    };
  }
  return holdings;
}

/** Compute unrealized P&L from holdings and current prices. */
export function computePnL(
  holdings: Record<string, Holding>,
  prices: Record<string, PriceData>
): Record<string, PnL> {
  const pnl: Record<string, PnL> = {};
  for (const [ticker, holding] of Object.entries(holdings)) {
    const price = prices[ticker]?.price ?? 0;
    const currentValue = holding.netShares * price;
    const unrealizedPnL = currentValue - holding.totalCost;
    const unrealizedPnLPct = holding.totalCost > 0 ? (unrealizedPnL / holding.totalCost) * 100 : 0;
    pnl[ticker] = { ticker, currentValue, unrealizedPnL, unrealizedPnLPct };
  }
  return pnl;
}

/** Return the net shares for a single ticker from transactions. */
export function netSharesFor(transactions: Transaction[], ticker: string): number {
  return transactions
    .filter((t) => t.ticker === ticker)
    .reduce((acc, t) => (t.type === 'buy' ? acc + t.shares : acc - t.shares), 0);
}

/** Format a dollar amount with sign and 2 decimal places. */
export function formatPnL(value: number): string {
  const abs = Math.abs(value).toFixed(2);
  return value >= 0 ? `+$${abs}` : `-$${abs}`;
}

/** Format a percentage with sign and 2 decimal places. */
export function formatPct(value: number): string {
  const abs = Math.abs(value).toFixed(2);
  return value >= 0 ? `+${abs}%` : `-${abs}%`;
}

/**
 * Compute per-ticker realized P&L by replaying transactions in order.
 * Each sell uses the proportional (average-cost) cost basis at the time of sale.
 */
export function computeRealizedPnL(transactions: Transaction[]): Record<string, RealizedPnL> {
  const running: Record<string, { totalShares: number; totalCost: number }> = {};
  const realized: Record<string, RealizedPnL> = {};

  for (const tx of transactions) {
    if (!running[tx.ticker]) running[tx.ticker] = { totalShares: 0, totalCost: 0 };

    if (tx.type === 'buy') {
      running[tx.ticker].totalShares += tx.shares;
      running[tx.ticker].totalCost += tx.shares * tx.pricePerShare;
    } else {
      const entry = running[tx.ticker];
      const sharesSold = Math.min(tx.shares, entry.totalShares);
      const ratio = entry.totalShares > 0 ? sharesSold / entry.totalShares : 0;
      const costOfSold = entry.totalCost * ratio;
      const saleProceeds = sharesSold * tx.pricePerShare;

      if (!realized[tx.ticker]) {
        realized[tx.ticker] = { ticker: tx.ticker, realizedPnL: 0, proceeds: 0, costBasis: 0, realizedPnLPct: 0 };
      }
      realized[tx.ticker].realizedPnL += saleProceeds - costOfSold;
      realized[tx.ticker].proceeds += saleProceeds;
      realized[tx.ticker].costBasis += costOfSold;

      entry.totalCost -= costOfSold;
      entry.totalShares -= sharesSold;
    }
  }

  // Compute percentage and exclude tickers with no realized activity
  for (const r of Object.values(realized)) {
    r.realizedPnLPct = r.costBasis > 0 ? (r.realizedPnL / r.costBasis) * 100 : 0;
  }
  return Object.fromEntries(Object.entries(realized).filter(([, r]) => r.proceeds > 0));
}
