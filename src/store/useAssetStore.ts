import { ASSETS } from '@/lib/constants';
import type { Asset, PriceData, Transaction } from '@/types';
import { create } from 'zustand';

interface AssetStore {
  // Dynamic asset watch-list
  assets: Asset[];
  // Currently selected ticker in the focus view
  selectedTicker: string;
  // Live price map (populated by REST init + WebSocket updates)
  prices: Record<string, PriceData>;
  // All transactions
  transactions: Transaction[];
  // Per-ticker freeform notes
  notes: Record<string, string>;

  /** Bulk-load portfolio data from Supabase on mount. */
  loadPortfolio: (
    assets: Asset[],
    transactions: Transaction[],
    selectedTicker: string,
    notes?: Record<string, string>,
  ) => void;
  setSelectedTicker: (ticker: string) => void;
  updatePrice: (ticker: string, data: Partial<PriceData>) => void;
  initPrices: (quotes: Record<string, PriceData>) => void;
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  removeTransaction: (id: string) => void;
  addAsset: (asset: Asset) => void;
  removeAsset: (ticker: string) => void;
  setNote: (ticker: string, note: string) => void;
}

export const useAssetStore = create<AssetStore>()((set) => ({
  assets: ASSETS,
  selectedTicker: ASSETS[0]?.ticker ?? '',
  prices: {},
  transactions: [],
  notes: {},

  loadPortfolio: (assets, transactions, selectedTicker, notes = {}) =>
    set({ assets, transactions, selectedTicker, notes }),

  setSelectedTicker: (ticker) => set({ selectedTicker: ticker }),

  updatePrice: (ticker, data) =>
    set((state) => ({
      prices: {
        ...state.prices,
        [ticker]: { ...(state.prices[ticker] ?? {}), ...data } as PriceData,
      },
    })),

  initPrices: (quotes) =>
    set((state) => ({
      prices: { ...state.prices, ...quotes },
    })),

  addTransaction: (tx) =>
    set((state) => ({
      transactions: [
        ...state.transactions,
        { ...tx, id: crypto.randomUUID() },
      ],
    })),

  removeTransaction: (id) =>
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
    })),

  addAsset: (asset) =>
    set((state) => {
      if (state.assets.some((a) => a.ticker === asset.ticker)) return state;
      return { assets: [...state.assets, asset] };
    }),

  removeAsset: (ticker) =>
    set((state) => {
      const remaining = state.assets.filter((a) => a.ticker !== ticker);
      const newPrices = { ...state.prices };
      delete newPrices[ticker];
      const newNotes = { ...state.notes };
      delete newNotes[ticker];
      return {
        assets: remaining,
        prices: newPrices,
        notes: newNotes,
        // Cascade-delete all transactions for this ticker
        transactions: state.transactions.filter((t) => t.ticker !== ticker),
        selectedTicker:
          state.selectedTicker === ticker
            ? (remaining[0]?.ticker ?? '')
            : state.selectedTicker,
      };
    }),

  setNote: (ticker, note) =>
    set((state) => ({
      notes: { ...state.notes, [ticker]: note },
    })),
}));
