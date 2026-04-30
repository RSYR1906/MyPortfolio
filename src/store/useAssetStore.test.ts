import type { Asset, PriceData } from '@/types';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useAssetStore } from './useAssetStore';

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockAsset = (ticker: string): Asset => ({
  ticker,
  name: `${ticker} Corp`,
  type: 'stock',
  accentColor: '#ff0000',
});

const mockPrice = (price: number): PriceData => ({
  price,
  change: 1,
  changePct: 0.5,
  high: price + 2,
  low: price - 2,
  open: price - 1,
  prevClose: price - 1,
});

function resetStore() {
  useAssetStore.setState({
    assets: [mockAsset('AAPL'), mockAsset('GOOG')],
    selectedTicker: 'AAPL',
    prices: {},
    transactions: [],
  });
}

beforeEach(() => {
  resetStore();
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

// ── setSelectedTicker ─────────────────────────────────────────────────────────

describe('setSelectedTicker', () => {
  it('updates the selected ticker', () => {
    useAssetStore.getState().setSelectedTicker('GOOG');
    expect(useAssetStore.getState().selectedTicker).toBe('GOOG');
  });
});

// ── updatePrice ───────────────────────────────────────────────────────────────

describe('updatePrice', () => {
  it('sets a full price for a ticker', () => {
    useAssetStore.getState().updatePrice('AAPL', mockPrice(175));
    expect(useAssetStore.getState().prices['AAPL'].price).toBe(175);
  });

  it('merges partial price updates without overwriting other fields', () => {
    useAssetStore.getState().updatePrice('AAPL', mockPrice(175));
    useAssetStore.getState().updatePrice('AAPL', { price: 180 });
    const p = useAssetStore.getState().prices['AAPL'];
    expect(p.price).toBe(180);
    expect(p.change).toBe(1); // original value preserved
  });

  it('does not affect prices for other tickers', () => {
    useAssetStore.getState().updatePrice('AAPL', mockPrice(100));
    useAssetStore.getState().updatePrice('GOOG', mockPrice(200));
    expect(useAssetStore.getState().prices['AAPL'].price).toBe(100);
    expect(useAssetStore.getState().prices['GOOG'].price).toBe(200);
  });
});

// ── initPrices ────────────────────────────────────────────────────────────────

describe('initPrices', () => {
  it('merges a batch of quotes into prices', () => {
    useAssetStore.getState().initPrices({ AAPL: mockPrice(150), GOOG: mockPrice(180) });
    expect(useAssetStore.getState().prices['AAPL'].price).toBe(150);
    expect(useAssetStore.getState().prices['GOOG'].price).toBe(180);
  });

  it('does not remove existing prices for other tickers', () => {
    useAssetStore.getState().updatePrice('AAPL', mockPrice(100));
    useAssetStore.getState().initPrices({ GOOG: mockPrice(200) });
    expect(useAssetStore.getState().prices['AAPL'].price).toBe(100);
  });
});

// ── addTransaction ────────────────────────────────────────────────────────────

describe('addTransaction', () => {
  it('adds a transaction and assigns a unique id', () => {
    useAssetStore.getState().addTransaction({
      ticker: 'AAPL',
      type: 'buy',
      shares: 10,
      pricePerShare: 150,
      date: '2024-01-01T00:00:00.000Z',
    });
    const txs = useAssetStore.getState().transactions;
    expect(txs).toHaveLength(1);
    expect(txs[0].id).toBeTruthy();
    expect(txs[0].ticker).toBe('AAPL');
  });

  it('accumulates multiple transactions', () => {
    const base = { ticker: 'AAPL', type: 'buy' as const, pricePerShare: 100, date: '' };
    useAssetStore.getState().addTransaction({ ...base, shares: 5 });
    useAssetStore.getState().addTransaction({ ...base, shares: 3 });
    expect(useAssetStore.getState().transactions).toHaveLength(2);
  });

  it('assigns unique ids to each transaction', () => {
    const base = { ticker: 'AAPL', type: 'buy' as const, pricePerShare: 100, date: '', shares: 1 };
    useAssetStore.getState().addTransaction(base);
    useAssetStore.getState().addTransaction(base);
    const [t1, t2] = useAssetStore.getState().transactions;
    expect(t1.id).not.toBe(t2.id);
  });
});

// ── addAsset ──────────────────────────────────────────────────────────────────

describe('addAsset', () => {
  it('appends a new asset to the list', () => {
    useAssetStore.getState().addAsset(mockAsset('AMD'));
    expect(useAssetStore.getState().assets.map((a) => a.ticker)).toContain('AMD');
  });

  it('does not add duplicate tickers', () => {
    useAssetStore.getState().addAsset(mockAsset('AAPL'));
    expect(useAssetStore.getState().assets.filter((a) => a.ticker === 'AAPL')).toHaveLength(1);
  });
});

// ── removeAsset ───────────────────────────────────────────────────────────────

describe('removeAsset', () => {
  it('removes the specified asset', () => {
    useAssetStore.getState().removeAsset('GOOG');
    expect(useAssetStore.getState().assets.find((a) => a.ticker === 'GOOG')).toBeUndefined();
  });

  it('falls back selectedTicker to first remaining asset when selected is removed', () => {
    useAssetStore.setState({ selectedTicker: 'AAPL' });
    useAssetStore.getState().removeAsset('AAPL');
    expect(useAssetStore.getState().selectedTicker).toBe('GOOG');
  });

  it('keeps selectedTicker unchanged when a different asset is removed', () => {
    useAssetStore.setState({ selectedTicker: 'AAPL' });
    useAssetStore.getState().removeAsset('GOOG');
    expect(useAssetStore.getState().selectedTicker).toBe('AAPL');
  });

  it('clears the price entry for the removed ticker', () => {
    useAssetStore.getState().updatePrice('AAPL', mockPrice(175));
    useAssetStore.getState().removeAsset('AAPL');
    expect(useAssetStore.getState().prices['AAPL']).toBeUndefined();
  });

  it('sets selectedTicker to empty string when last asset is removed', () => {
    useAssetStore.setState({ assets: [mockAsset('SOLO')], selectedTicker: 'SOLO' });
    useAssetStore.getState().removeAsset('SOLO');
    expect(useAssetStore.getState().selectedTicker).toBe('');
  });
});

// ── Persistence ───────────────────────────────────────────────────────────────

describe('persistence (localStorage)', () => {
  it('writes assets and transactions to localStorage on state change', () => {
    useAssetStore.getState().addAsset(mockAsset('TSLA'));
    useAssetStore.getState().addTransaction({
      ticker: 'TSLA',
      type: 'buy',
      shares: 5,
      pricePerShare: 200,
      date: '',
    });

    const raw = localStorage.getItem('portfolio-data');
    expect(raw).not.toBeNull();
    const stored = JSON.parse(raw!);
    expect(stored.state.assets.some((a: Asset) => a.ticker === 'TSLA')).toBe(true);
    expect(stored.state.transactions).toHaveLength(1);
  });

  it('does NOT persist prices to localStorage', () => {
    useAssetStore.getState().updatePrice('AAPL', mockPrice(200));
    const raw = localStorage.getItem('portfolio-data');
    if (raw) {
      const stored = JSON.parse(raw);
      expect(stored.state.prices).toBeUndefined();
    }
    // If nothing was written yet that's fine too — prices alone don't trigger a write
    // that would include them since they're not in partialize.
  });

  it('restores assets and transactions after rehydration', async () => {
    // Populate state — persist middleware writes to localStorage
    useAssetStore.getState().addAsset(mockAsset('NVDA'));
    useAssetStore.getState().addTransaction({
      ticker: 'NVDA',
      type: 'buy',
      shares: 2,
      pricePerShare: 800,
      date: '',
    });

    // Capture the localStorage snapshot before resetStore() overwrites it
    const savedData = localStorage.getItem('portfolio-data');
    expect(savedData).not.toBeNull();

    // Reset in-memory state to simulate a page refresh (this also writes to localStorage)
    resetStore();

    // Restore the snapshot so rehydrate() sees the NVDA data
    localStorage.setItem('portfolio-data', savedData!);

    // Verify the in-memory state no longer has NVDA
    expect(useAssetStore.getState().assets.find((a) => a.ticker === 'NVDA')).toBeUndefined();
    expect(useAssetStore.getState().transactions).toHaveLength(0);

    // Rehydrate from localStorage — as page.tsx does on mount
    await useAssetStore.persist.rehydrate();

    expect(useAssetStore.getState().assets.find((a) => a.ticker === 'NVDA')).toBeDefined();
    expect(useAssetStore.getState().transactions).toHaveLength(1);
    expect(useAssetStore.getState().transactions[0].ticker).toBe('NVDA');
  });
});
