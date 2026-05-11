'use client';

import { computeHoldings, computePnL } from '@/lib/portfolio';
import { useAssetStore } from '@/store/useAssetStore';
import { useMemo } from 'react';

/**
 * Computes holdings and P&L maps once from the Zustand store.
 * Avoids duplicating these memoized calculations across AssetSidebar
 * and FocusView.
 */
export function usePortfolio() {
  const transactions = useAssetStore((s) => s.transactions);
  const prices = useAssetStore((s) => s.prices);

  const holdings = useMemo(() => computeHoldings(transactions), [transactions]);
  const pnlMap = useMemo(() => computePnL(holdings, prices), [holdings, prices]);

  const { totalValue, totalCost } = useMemo(
    () => ({
      totalValue: Object.values(pnlMap).reduce((sum, p) => sum + p.currentValue, 0),
      totalCost: Object.values(holdings).reduce((sum, h) => sum + h.totalCost, 0),
    }),
    [pnlMap, holdings],
  );

  return { holdings, pnlMap, totalValue, totalCost };
}
