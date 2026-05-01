import { create } from 'zustand';

export type Currency = 'USD' | 'SGD';

interface CurrencyStore {
  currency: Currency;
  /** Live USD → SGD rate; defaults to a reasonable fallback until fetched. */
  fxRate: number;
  rateLoaded: boolean;
  setCurrency: (c: Currency) => void;
  setFxRate: (rate: number) => void;
}

export const useCurrencyStore = create<CurrencyStore>()((set) => ({
  currency: 'USD',
  fxRate: 1.33,
  rateLoaded: false,
  setCurrency: (currency) => set({ currency }),
  setFxRate: (rate) => set({ fxRate: rate, rateLoaded: true }),
}));
