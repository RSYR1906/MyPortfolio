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

  /** Bulk-load portfolio data from Supabase on mount. */
  loadPortfolio: (
    assets: Asset[],
    transactions: Transaction[],
    selectedTicker: string,
  ) => void;
  setSelectedTicker: (ticker: string) => void;
  updatePrice: (ticker: string, data: Partial<PriceData>) => void;
  initPrices: (quotes: Record<string, PriceData>) => void;
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  addAsset: (asset: Asset) => void;
  removeAsset: (ticker: string) => void;
}

export const useAssetStore = create<AssetStore>()((set) => ({
  assets: ASSETS,
  selectedTicker: 'V',
  prices: {},
  transactions: [],

  loadPortfolio: (assets, transactions, selectedTicker) =>
    set({ assets, transactions, selectedTicker }),

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
      return {
        assets: remaining,
        prices: newPrices,
        selectedTicker:
          state.selectedTicker === ticker
            ? (remaining[0]?.ticker ?? '')
            : state.selectedTicker,
      };
    }),
}));
