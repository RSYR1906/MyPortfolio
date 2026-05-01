"use client";

import { Modal } from "@/components/Modal";
import {
  computeHoldings,
  computePnL,
  computeRealizedPnL,
  formatPct,
  formatPnL,
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

  return (
    <Modal onClose={onClose} labelId="portfolio-modal-title">
      <div className="bg-[#161b22] border border-white/10 rounded-xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl anim-modal-in">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10">
          <h2
            id="portfolio-modal-title"
            className="text-base font-bold text-gray-100"
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

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Summary stats */}
          <div
            className={`grid gap-3 ${hasRealized ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}
          >
            {(
              [
                { label: "Total Value", value: `$${totalValue.toFixed(2)}` },
                { label: "Total Cost", value: `$${totalCost.toFixed(2)}` },
                {
                  label: "Unrealized P&L",
                  value: `${formatPnL(totalUnrealizedPnL)} (${formatPct(totalUnrealizedPnLPct)})`,
                  color:
                    totalUnrealizedPnL >= 0
                      ? "text-emerald-400"
                      : "text-red-400",
                },
                ...(hasRealized
                  ? [
                      {
                        label: "Realized P&L",
                        value: formatPnL(totalRealizedPnL),
                        color:
                          totalRealizedPnL >= 0
                            ? "text-emerald-400"
                            : "text-red-400",
                      },
                    ]
                  : []),
              ] as { label: string; value: string; color?: string }[]
            ).map(({ label, value, color }) => (
              <div
                key={label}
                className="rounded-lg bg-white/[0.03] border border-white/5 px-4 py-3"
              >
                <p className="text-[11px] text-gray-500 uppercase tracking-wider">
                  {label}
                </p>
                <p
                  className={`text-sm font-mono font-semibold mt-1 ${color ?? "text-gray-100"}`}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>

          {holdingList.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-8">
              No holdings yet — add transactions to see your breakdown.
            </p>
          ) : (
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Donut + legend */}
              <div className="shrink-0 flex flex-col items-center gap-4">
                <svg width="160" height="160" viewBox="0 0 160 160">
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
                    ${totalValue.toFixed(0)}
                  </text>
                </svg>

                <div className="flex flex-col gap-1.5 w-full min-w-[120px]">
                  {slices.map((s) => (
                    <div key={s.ticker} className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
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
                      {[
                        "Ticker",
                        "Shares",
                        "Avg Cost",
                        "Price",
                        "Value",
                        "Unrlzd P&L",
                        "Rlzd P&L",
                      ].map((h, i) => (
                        <th
                          key={h}
                          className={`pb-2 font-medium pr-3 ${i === 0 ? "text-left" : "text-right"}`}
                        >
                          {h}
                        </th>
                      ))}
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
                          <td className="py-2 text-right font-mono pr-3">
                            ${h.avgCostBasis.toFixed(2)}
                          </td>
                          <td className="py-2 text-right font-mono pr-3">
                            {price !== undefined ? `$${price.toFixed(2)}` : "—"}
                          </td>
                          <td className="py-2 text-right font-mono pr-3">
                            {pnl ? `$${pnl.currentValue.toFixed(2)}` : "—"}
                          </td>
                          <td
                            className={`py-2 text-right font-mono pr-3 ${
                              (pnl?.unrealizedPnL ?? 0) >= 0
                                ? "text-emerald-400"
                                : "text-red-400"
                            }`}
                          >
                            {pnl
                              ? `${formatPnL(pnl.unrealizedPnL)} (${formatPct(pnl.unrealizedPnLPct)})`
                              : "—"}
                          </td>
                          <td
                            className={`py-2 text-right font-mono ${
                              realized
                                ? realized.realizedPnL >= 0
                                  ? "text-emerald-400"
                                  : "text-red-400"
                                : "text-gray-600"
                            }`}
                          >
                            {realized ? formatPnL(realized.realizedPnL) : "—"}
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
