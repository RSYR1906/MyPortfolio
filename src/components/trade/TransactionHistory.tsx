"use client";

import { computeRealizedPnL, formatPct, formatPnL } from "@/lib/portfolio";
import { useAssetStore } from "@/store/useAssetStore";
import { useMemo, useState } from "react";

interface Props {
  ticker: string;
}

export function TransactionHistory({ ticker }: Props) {
  // Select the full array (stable store reference) and filter in the component
  // body. An inline .filter() inside the selector creates a new array on every
  // getServerSnapshot call, which triggers React's infinite-loop guard.
  const allTransactions = useAssetStore((s) => s.transactions);
  const removeTransaction = useAssetStore((s) => s.removeTransaction);
  const transactions = allTransactions.filter((t) => t.ticker === ticker);
  const [showAll, setShowAll] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Realized P&L for this ticker
  const realizedMap = useMemo(
    () => computeRealizedPnL(allTransactions),
    [allTransactions],
  );
  const realized = realizedMap[ticker];

  const sorted = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const visible = showAll ? sorted : sorted.slice(0, 8);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Transaction History
        </h3>
        <span className="text-xs text-gray-600">
          {transactions.length} total
        </span>
      </div>

      {transactions.length === 0 ? (
        <p className="text-sm text-gray-600">
          No transactions recorded for {ticker} yet.
        </p>
      ) : (
        <>
          {/* Realized P&L summary (only shown if there are sell transactions) */}
          {realized && (
            <div className="flex items-center justify-between rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2">
              <span className="text-xs text-gray-500">Realized P&amp;L</span>
              <span
                className={`text-xs font-mono font-semibold ${
                  realized.realizedPnL >= 0
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {formatPnL(realized.realizedPnL)} (
                {formatPct(realized.realizedPnLPct)})
              </span>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-gray-600 text-[11px] uppercase tracking-wider">
                  <th className="text-left pb-2 font-medium">Date</th>
                  <th className="text-left pb-2 font-medium">Type</th>
                  <th className="text-right pb-2 font-medium">Shares</th>
                  <th className="text-right pb-2 font-medium">Price</th>
                  <th className="text-right pb-2 font-medium">Total</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {visible.map((tx) => (
                  <tr key={tx.id} className="group/row">
                    <td className="py-2 text-gray-500 whitespace-nowrap pr-4">
                      {formatDate(tx.date)}
                    </td>
                    <td className="py-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[11px] font-semibold uppercase ${
                          tx.type === "buy"
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-red-500/15 text-red-400"
                        }`}
                      >
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-2 text-right font-mono text-gray-300">
                      {tx.shares % 1 === 0 ? tx.shares : tx.shares.toFixed(4)}
                    </td>
                    <td className="py-2 text-right font-mono text-gray-300">
                      ${tx.pricePerShare.toFixed(2)}
                    </td>
                    <td className="py-2 text-right font-mono text-gray-200">
                      ${(tx.shares * tx.pricePerShare).toFixed(2)}
                    </td>
                    <td className="py-2 pl-3">
                      {confirmDeleteId === tx.id ? (
                        <span className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              removeTransaction(tx.id);
                              setConfirmDeleteId(null);
                            }}
                            className="text-[11px] text-red-400 hover:text-red-300"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-[11px] text-gray-500 hover:text-gray-300"
                          >
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(tx.id)}
                          className="text-[11px] text-gray-600 hover:text-red-400 opacity-0 group-hover/row:opacity-100 sm:opacity-100 transition-opacity"
                          aria-label="Delete transaction"
                        >
                          ×
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sorted.length > 8 && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              {showAll ? "Show less" : `Show all ${sorted.length} transactions`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
