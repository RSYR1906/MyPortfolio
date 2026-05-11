"use client";

import { Modal } from "@/components/Modal";
import { useCurrency } from "@/hooks/useCurrency";
import {
  computeHoldings,
  computePnL,
  computeRealizedPnL,
  formatPct,
} from "@/lib/portfolio";
import { useAssetStore } from "@/store/useAssetStore";
import { useMemo } from "react";

// ── SVG donut helpers ────────────────────────────────────────────────────────

function polar(cx: number, cy: number, r: number, a: number) {
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function donutPath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number,
): string {
  const sweep = Math.min(endAngle - startAngle, 2 * Math.PI - 0.0001);
  const end = startAngle + sweep;
  const large = sweep > Math.PI ? 1 : 0;
  const o1 = polar(cx, cy, outerR, startAngle);
  const o2 = polar(cx, cy, outerR, end);
  const i1 = polar(cx, cy, innerR, end);
  const i2 = polar(cx, cy, innerR, startAngle);
  return [
    `M ${o1.x.toFixed(2)} ${o1.y.toFixed(2)}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${o2.x.toFixed(2)} ${o2.y.toFixed(2)}`,
    `L ${i1.x.toFixed(2)} ${i1.y.toFixed(2)}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${i2.x.toFixed(2)} ${i2.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

// ── Component ────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
}

export function PortfolioModal({ onClose }: Props) {
  const assets = useAssetStore((s) => s.assets);
  const transactions = useAssetStore((s) => s.transactions);
  const prices = useAssetStore((s) => s.prices);

  const holdings = useMemo(() => computeHoldings(transactions), [transactions]);
  const pnlMap = useMemo(
    () => computePnL(holdings, prices),
    [holdings, prices],
  );
  const realizedMap = useMemo(
    () => computeRealizedPnL(transactions),
    [transactions],
  );

  const holdingList = useMemo(
    () =>
      Object.values(holdings).sort(
        (a, b) =>
          (pnlMap[b.ticker]?.currentValue ?? 0) -
          (pnlMap[a.ticker]?.currentValue ?? 0),
      ),
    [holdings, pnlMap],
  );

  const totalValue = holdingList.reduce(
    (s, h) => s + (pnlMap[h.ticker]?.currentValue ?? 0),
    0,
  );
  const totalCost = holdingList.reduce((s, h) => s + h.totalCost, 0);
  const totalUnrealizedPnL = totalValue - totalCost;
  const totalUnrealizedPnLPct =
    totalCost > 0 ? (totalUnrealizedPnL / totalCost) * 100 : 0;

  const totalRealizedPnL = Object.values(realizedMap).reduce(
    (s, r) => s + r.realizedPnL,
    0,
  );

  // Build donut slices — start at 12 o'clock
  const CX = 80,
    CY = 80,
    OUTER = 70,
    INNER = 44;
  let angle = -Math.PI / 2;
  const slices = holdingList.map((h) => {
    const value = pnlMap[h.ticker]?.currentValue ?? 0;
    const sweep = totalValue > 0 ? (value / totalValue) * 2 * Math.PI : 0;
    const path = donutPath(CX, CY, OUTER, INNER, angle, angle + sweep);
    const pct = totalValue > 0 ? (value / totalValue) * 100 : 0;
    const color =
      assets.find((a) => a.ticker === h.ticker)?.accentColor ?? "#6366f1";
    angle += sweep;
    return { ticker: h.ticker, path, color, pct };
  });

  const hasRealized = Object.keys(realizedMap).length > 0;

  const { symbol, fmt, fmtPnL, convert } = useCurrency();

  return (
    <Modal onClose={onClose} labelId="portfolio-modal-title" sheet>
      <div className="bg-[#161b22] border-t border-x border-white/10 rounded-t-2xl md:rounded-xl md:border w-full max-w-4xl max-h-[88svh] md:max-h-[92vh] overflow-y-auto shadow-2xl anim-modal-in">
        {/* Drag handle (mobile only) */}
        <div className="md:hidden flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-8 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 sm:py-4 border-b border-white/10 shrink-0">
          <h2
            id="portfolio-modal-title"
            className="text-sm sm:text-base font-bold text-gray-100"
          >
            Portfolio Overview
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-200 transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div className="p-3 sm:p-6 space-y-3 sm:space-y-6">
          {/* Summary stats */}
          <div
            className={`grid gap-2 sm:gap-3 ${hasRealized ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}
          >
            {(
              [
                { label: "Total Value", value: fmt(totalValue) },
                { label: "Total Cost", value: fmt(totalCost) },
                {
                  label: "Unrealized P&L",
                  value: fmtPnL(totalUnrealizedPnL),
                  sub: formatPct(totalUnrealizedPnLPct),
                  color:
                    totalUnrealizedPnL >= 0
                      ? "text-emerald-400"
                      : "text-red-400",
                },
                ...(hasRealized
                  ? [
                      {
                        label: "Realized P&L",
                        value: fmtPnL(totalRealizedPnL),
                        color:
                          totalRealizedPnL >= 0
                            ? "text-emerald-400"
                            : "text-red-400",
                      },
                    ]
                  : []),
              ] as {
                label: string;
                value: string;
                sub?: string;
                color?: string;
              }[]
            ).map(({ label, value, sub, color }) => (
              <div
                key={label}
                className="rounded-lg bg-white/3 border border-white/5 px-3 py-2 sm:px-4 sm:py-3"
              >
                <p className="text-[10px] sm:text-[11px] text-gray-500 uppercase tracking-wider">
                  {label}
                </p>
                <p
                  className={`text-xs sm:text-sm font-mono font-semibold mt-0.5 sm:mt-1 ${color ?? "text-gray-100"}`}
                >
                  {value}
                </p>
                {sub && (
                  <p
                    className={`text-[10px] font-mono ${color ?? "text-gray-400"} opacity-80`}
                  >
                    {sub}
                  </p>
                )}
              </div>
            ))}
          </div>

          {holdingList.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-8">
              No holdings yet — add transactions to see your breakdown.
            </p>
          ) : (
            <div className="flex flex-col md:flex-row gap-4 sm:gap-6 items-start">
              {/* Donut + legend — side-by-side on mobile, stacked on md */}
              <div className="shrink-0 flex flex-row md:flex-col items-center gap-3 sm:gap-4 w-full md:w-auto">
                <svg
                  className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 shrink-0"
                  viewBox="0 0 160 160"
                >
                  {slices.map((s, i) => (
                    <path
                      key={s.ticker}
                      d={s.path}
                      fill={s.color}
                      opacity={0.9}
                      stroke="#161b22"
                      strokeWidth={slices.length === 1 && i === 0 ? 0 : 1.5}
                    />
                  ))}
                  <text
                    x="80"
                    y="76"
                    textAnchor="middle"
                    style={{ fontSize: 10, fill: "#9ca3af" }}
                  >
                    Portfolio
                  </text>
                  <text
                    x="80"
                    y="93"
                    textAnchor="middle"
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      fill: "#f3f4f6",
                      fontFamily: "monospace",
                    }}
                  >
                    {symbol}
                    {convert(totalValue).toFixed(0)}
                  </text>
                </svg>

                <div className="flex flex-col gap-1 sm:gap-1.5 flex-1 md:w-full md:min-w-30">
                  {slices.map((s) => (
                    <div key={s.ticker} className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: s.color }}
                      />
                      <span className="text-[11px] text-gray-300 font-semibold">
                        {s.ticker}
                      </span>
                      <span className="text-[11px] text-gray-500 ml-auto pl-2">
                        {s.pct.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Holdings table */}
              <div className="flex-1 min-w-0 overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="text-gray-500 border-b border-white/10">
                      <th className="pb-2 font-medium pr-3 text-left">
                        Ticker
                      </th>
                      <th className="pb-2 font-medium pr-3 text-right">
                        Shares
                      </th>
                      <th className="pb-2 font-medium pr-3 text-right hidden sm:table-cell">
                        Avg Cost
                      </th>
                      <th className="pb-2 font-medium pr-3 text-right hidden sm:table-cell">
                        Price
                      </th>
                      <th className="pb-2 font-medium pr-3 text-right">
                        Value
                      </th>
                      <th className="pb-2 font-medium pr-3 text-right">
                        P&amp;L
                      </th>
                      <th className="pb-2 font-medium text-right hidden sm:table-cell">
                        Rlzd P&amp;L
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {holdingList.map((h) => {
                      const pnl = pnlMap[h.ticker];
                      const price = prices[h.ticker]?.price;
                      const realized = realizedMap[h.ticker];
                      return (
                        <tr key={h.ticker} className="text-gray-300">
                          <td className="py-2 font-semibold pr-3">
                            {h.ticker}
                          </td>
                          <td className="py-2 text-right font-mono pr-3">
                            {h.netShares % 1 === 0
                              ? h.netShares
                              : h.netShares.toFixed(4)}
                          </td>
                          <td className="py-2 text-right font-mono pr-3 hidden sm:table-cell">
                            {fmt(h.avgCostBasis)}
                          </td>
                          <td className="py-2 text-right font-mono pr-3 hidden sm:table-cell">
                            {price !== undefined ? fmt(price) : "—"}
                          </td>
                          <td className="py-2 text-right font-mono pr-3">
                            {pnl ? fmt(pnl.currentValue) : "—"}
                          </td>
                          <td
                            className={`py-2 text-right font-mono pr-3 ${
                              (pnl?.unrealizedPnL ?? 0) >= 0
                                ? "text-emerald-400"
                                : "text-red-400"
                            }`}
                          >
                            {pnl ? (
                              <>
                                <span>{fmtPnL(pnl.unrealizedPnL)}</span>
                                <span className="hidden sm:inline">
                                  {" "}
                                  ({formatPct(pnl.unrealizedPnLPct)})
                                </span>
                              </>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td
                            className={`py-2 text-right font-mono hidden sm:table-cell ${
                              realized
                                ? realized.realizedPnL >= 0
                                  ? "text-emerald-400"
                                  : "text-red-400"
                                : "text-gray-600"
                            }`}
                          >
                            {realized ? fmtPnL(realized.realizedPnL) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
