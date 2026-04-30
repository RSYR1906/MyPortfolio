import { beforeEach, describe, expect, it } from 'vitest';
import type { Transaction } from '@/types';
import {
  computeHoldings,
  computePnL,
  formatPct,
  formatPnL,
  netSharesFor,
} from './portfolio';

// ── Helpers ──────────────────────────────────────────────────────────────────

let _id = 0;
function tx(
  overrides: Partial<Transaction> & Pick<Transaction, 'type' | 'shares' | 'pricePerShare'>,
): Transaction {
  return {
    id: String(++_id),
    ticker: 'AAPL',
    date: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => { _id = 0; });

// ── computeHoldings ───────────────────────────────────────────────────────────

describe('computeHoldings', () => {
  it('returns empty object for no transactions', () => {
    expect(computeHoldings([])).toEqual({});
  });

  it('tracks a single buy', () => {
    const result = computeHoldings([tx({ type: 'buy', shares: 10, pricePerShare: 100 })]);
    expect(result['AAPL']).toMatchObject({
      ticker: 'AAPL',
      netShares: 10,
      avgCostBasis: 100,
      totalCost: 1000,
    });
  });

  it('averages cost basis across multiple buys', () => {
    const result = computeHoldings([
      tx({ type: 'buy', shares: 10, pricePerShare: 100 }),
      tx({ type: 'buy', shares: 10, pricePerShare: 200 }),
    ]);
    expect(result['AAPL'].avgCostBasis).toBe(150);
    expect(result['AAPL'].netShares).toBe(20);
    expect(result['AAPL'].totalCost).toBe(3000);
  });

  it('reduces shares and cost proportionally on sell', () => {
    const result = computeHoldings([
      tx({ type: 'buy', shares: 10, pricePerShare: 100 }),
      tx({ type: 'sell', shares: 4, pricePerShare: 150 }),
    ]);
    expect(result['AAPL'].netShares).toBe(6);
    expect(result['AAPL'].totalCost).toBeCloseTo(600);
    expect(result['AAPL'].avgCostBasis).toBeCloseTo(100);
  });

  it('excludes fully sold positions', () => {
    const result = computeHoldings([
      tx({ type: 'buy', shares: 5, pricePerShare: 100 }),
      tx({ type: 'sell', shares: 5, pricePerShare: 120 }),
    ]);
    expect(result['AAPL']).toBeUndefined();
  });

  it('tracks multiple tickers independently', () => {
    const result = computeHoldings([
      tx({ ticker: 'AAPL', type: 'buy', shares: 10, pricePerShare: 100 }),
      tx({ ticker: 'GOOG', type: 'buy', shares: 5, pricePerShare: 200 }),
    ]);
    expect(result['AAPL'].netShares).toBe(10);
    expect(result['GOOG'].netShares).toBe(5);
  });

  it('does not create negative share positions', () => {
    const result = computeHoldings([
      tx({ type: 'buy', shares: 5, pricePerShare: 100 }),
      tx({ type: 'sell', shares: 10, pricePerShare: 100 }), // oversell
    ]);
    expect(result['AAPL']).toBeUndefined(); // netShares = max(0, -5) = 0 → excluded
  });
});

// ── computePnL ────────────────────────────────────────────────────────────────

describe('computePnL', () => {
  it('calculates positive unrealized P&L', () => {
    const holdings = computeHoldings([tx({ type: 'buy', shares: 10, pricePerShare: 100 })]);
    const prices = { AAPL: { price: 150, change: 0, changePct: 0, high: 0, low: 0, open: 0, prevClose: 0 } };
    const pnl = computePnL(holdings, prices);
    expect(pnl['AAPL'].currentValue).toBe(1500);
    expect(pnl['AAPL'].unrealizedPnL).toBe(500);
    expect(pnl['AAPL'].unrealizedPnLPct).toBe(50);
  });

  it('calculates negative unrealized P&L', () => {
    const holdings = computeHoldings([tx({ type: 'buy', shares: 10, pricePerShare: 100 })]);
    const prices = { AAPL: { price: 80, change: 0, changePct: 0, high: 0, low: 0, open: 0, prevClose: 0 } };
    const pnl = computePnL(holdings, prices);
    expect(pnl['AAPL'].unrealizedPnL).toBe(-200);
    expect(pnl['AAPL'].unrealizedPnLPct).toBeCloseTo(-20);
  });

  it('uses 0 price when ticker not in prices', () => {
    const holdings = computeHoldings([tx({ type: 'buy', shares: 10, pricePerShare: 100 })]);
    const pnl = computePnL(holdings, {});
    expect(pnl['AAPL'].currentValue).toBe(0);
    expect(pnl['AAPL'].unrealizedPnL).toBe(-1000);
  });

  it('returns empty object when no holdings', () => {
    expect(computePnL({}, {})).toEqual({});
  });
});

// ── formatPnL ─────────────────────────────────────────────────────────────────

describe('formatPnL', () => {
  it('prefixes positive values with +$', () => {
    expect(formatPnL(500)).toBe('+$500.00');
  });
  it('prefixes negative values with -$', () => {
    expect(formatPnL(-200.5)).toBe('-$200.50');
  });
  it('treats zero as positive', () => {
    expect(formatPnL(0)).toBe('+$0.00');
  });
});

// ── formatPct ─────────────────────────────────────────────────────────────────

describe('formatPct', () => {
  it('prefixes positive percentages with +', () => {
    expect(formatPct(12.5)).toBe('+12.50%');
  });
  it('prefixes negative percentages with -', () => {
    expect(formatPct(-8.33)).toBe('-8.33%');
  });
  it('treats zero as positive', () => {
    expect(formatPct(0)).toBe('+0.00%');
  });
});

// ── netSharesFor ──────────────────────────────────────────────────────────────

describe('netSharesFor', () => {
  it('returns 0 for empty transactions', () => {
    expect(netSharesFor([], 'AAPL')).toBe(0);
  });
  it('returns 0 for a different ticker', () => {
    expect(netSharesFor([tx({ type: 'buy', shares: 10, pricePerShare: 100 })], 'GOOG')).toBe(0);
  });
  it('sums buys and subtracts sells', () => {
    const txs = [
      tx({ type: 'buy', shares: 10, pricePerShare: 100 }),
      tx({ type: 'sell', shares: 3, pricePerShare: 110 }),
    ];
    expect(netSharesFor(txs, 'AAPL')).toBe(7);
  });
  it('ignores transactions for other tickers', () => {
    const txs = [
      tx({ ticker: 'AAPL', type: 'buy', shares: 10, pricePerShare: 100 }),
      tx({ ticker: 'GOOG', type: 'buy', shares: 5, pricePerShare: 200 }),
    ];
    expect(netSharesFor(txs, 'AAPL')).toBe(10);
  });
});
