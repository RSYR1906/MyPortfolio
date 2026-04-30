import type { Asset } from '@/types';

export const ASSETS: Asset[] = [
  { ticker: 'V',    name: 'Visa Inc.',                   type: 'stock', accentColor: '#1A1F71' },
  { ticker: 'IREN', name: 'Iris Energy',                 type: 'stock', accentColor: '#F7931A' },
  { ticker: 'AMD',  name: 'Advanced Micro Devices',      type: 'stock', accentColor: '#ED1C24' },
  { ticker: 'GLD',  name: 'SPDR Gold ETF',               type: 'etf',   accentColor: '#FFD700' },
  { ticker: 'SLV',  name: 'iShares Silver ETF',          type: 'etf',   accentColor: '#C0C0C0' },
];

export const ETF_METADATA: Record<string, { description: string; expense: string; aum: string; benchmark: string }> = {
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
