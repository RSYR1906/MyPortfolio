import type { Asset } from '@/types';

export const ASSETS: Asset[] = [
  { ticker: 'SPY',  name: 'SPDR S&P 500 ETF',            type: 'etf',   accentColor: '#4A90D9' },
  { ticker: 'GLD',  name: 'SPDR Gold ETF',               type: 'etf',   accentColor: '#FFD700' },
  { ticker: 'SLV',  name: 'iShares Silver ETF',          type: 'etf',   accentColor: '#C0C0C0' },
  { ticker: 'AAPL', name: 'Apple Inc.',                  type: 'stock', accentColor: '#555555' },
  { ticker: 'NVDA', name: 'NVIDIA Corporation',          type: 'stock', accentColor: '#76B900' },
];

export const ETF_METADATA: Record<string, { description: string; expense: string; aum: string; benchmark: string }> = {
  SPY: {
    description:
      'SPDR S&P 500 ETF Trust (SPY) tracks the S&P 500 Index, providing exposure to 500 of the largest US companies across all major sectors.',
    expense: '0.0945%',
    aum: '~$570B',
    benchmark: 'S&P 500 Index',
  },
  GLD: {
    description:
      'SPDR Gold Shares (GLD) tracks the spot price of gold, less expenses and liabilities. Each share represents approximately 1/10 troy oz of gold held in trust.',
    expense: '0.40%',
    aum: '~$75B',
    benchmark: 'Gold Spot Price (LBMA)',
  },
  SLV: {
    description:
      'iShares Silver Trust (SLV) tracks the spot price of silver, less expenses and liabilities. Each share represents approximately 0.926 troy oz of silver held in trust.',
    expense: '0.50%',
    aum: '~$11B',
    benchmark: 'Silver Spot Price (LBMA)',
  },
};
