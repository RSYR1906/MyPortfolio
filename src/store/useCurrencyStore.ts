import { create } from 'zustand';

export type Currency = 'USD' | 'SGD';

interface CurrencyStore {
  currency: Currency;
  /** Live USD → SGD rate; defaults to a reasonable fallback until fetched. */
  fxRate: number;
  rateLoaded: boolean;
  /** When true, monetary values are masked with ●●●● in the UI. */
  balanceHidden: boolean;
  setCurrency: (c: Currency) => void;
  setFxRate: (rate: number) => void;
  toggleBalanceHidden: () => void;
}

export const useCurrencyStore = create<CurrencyStore>()((set) => ({
  currency: 'USD',
  fxRate: 1.33,
  rateLoaded: false,
  balanceHidden: false,
  setCurrency: (currency) => set({ currency }),
  setFxRate: (rate) => set({ fxRate: rate, rateLoaded: true }),
  toggleBalanceHidden: () => set((s) => ({ balanceHidden: !s.balanceHidden })),
}));
