"use client";

import { useCurrency } from "@/hooks/useCurrency";
import type {
  AnalystRecommendation,
  EarningsEvent,
  PriceTarget,
} from "@/types";
import { useEffect, useRef, useState } from "react";

interface AnalystData {
  recommendations: AnalystRecommendation[];
  priceTarget: PriceTarget | null;
}

// Module-level cache — persists for the session, TTL 1h
const analystCache = new Map<string, { data: AnalystData; expiry: number }>();
const earningsCache = new Map<
  string,
  { data: EarningsEvent[]; expiry: number }
>();
const CACHE_TTL = 3_600_000; // 1 hour

interface Props {
  ticker: string;
}

export function AnalystRatings({ ticker }: Props) {
  const [analyst, setAnalyst] = useState<AnalystData | null>(null);
  const [earnings, setEarnings] = useState<EarningsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const { fmt } = useCurrency();

  useEffect(() => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);

    const cachedA = analystCache.get(ticker);
    const cachedE = earningsCache.get(ticker);
    const now = Date.now();

    if (cachedA && cachedA.expiry > now && cachedE && cachedE.expiry > now) {
      setAnalyst(cachedA.data);
      setEarnings(cachedE.data);
      setLoading(false);
      return;
    }

    Promise.all([
      fetch(`/api/analyst?symbol=${encodeURIComponent(ticker)}`, {
        signal: ac.signal,
      })
        .then((r) => (r.ok ? (r.json() as Promise<AnalystData>) : null))
        .catch(() => null),
      fetch(`/api/earnings?symbol=${encodeURIComponent(ticker)}`, {
        signal: ac.signal,
      })
        .then((r) => (r.ok ? (r.json() as Promise<EarningsEvent[]>) : null))
        .catch(() => null),
    ]).then(([analystData, earningsData]) => {
      if (ac.signal.aborted) return;
      const a = analystData ?? { recommendations: [], priceTarget: null };
      const e = earningsData ?? [];
      analystCache.set(ticker, { data: a, expiry: now + CACHE_TTL });
      earningsCache.set(ticker, { data: e, expiry: now + CACHE_TTL });
      setAnalyst(a);
      setEarnings(e);
      setLoading(false);
    });
  }, [ticker]);

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3 animate-pulse">
        <div className="h-3 w-24 bg-white/10 rounded" />
        <div className="h-8 w-full bg-white/5 rounded" />
        <div className="h-4 w-3/4 bg-white/5 rounded" />
      </div>
    );
  }

  const rec = analyst?.recommendations?.[0];
  const target = analyst?.priceTarget;
  const hasData = rec || target || earnings.length > 0;
  if (!hasData) return null;

  const totalRec = rec
    ? rec.strongBuy + rec.buy + rec.hold + rec.sell + rec.strongSell
    : 0;

  const consensus: Array<{ label: string; count: number; color: string }> = rec
    ? [
        { label: "Strong Buy", count: rec.strongBuy, color: "bg-emerald-500" },
        { label: "Buy", count: rec.buy, color: "bg-green-400" },
        { label: "Hold", count: rec.hold, color: "bg-yellow-400" },
        { label: "Sell", count: rec.sell, color: "bg-orange-400" },
        { label: "Strong Sell", count: rec.strongSell, color: "bg-red-500" },
      ]
    : [];

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-4">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        Analyst Ratings
      </h3>

      {/* Price Target */}
      {target && (
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] text-gray-500 mb-0.5">Mean Target</p>
            <p className="text-lg font-mono font-semibold text-gray-100">
              {fmt(target.targetMean)}
            </p>
            <p className="text-[11px] text-gray-600 font-mono">
              {fmt(target.targetLow)} – {fmt(target.targetHigh)}
            </p>
          </div>
          {target.lastUpdated && (
            <p className="text-[10px] text-gray-600 text-right shrink-0">
              Updated {target.lastUpdated}
            </p>
          )}
        </div>
      )}

      {/* Consensus bar */}
      {rec && totalRec > 0 && (
        <div className="space-y-1.5">
          <div className="flex h-2 rounded overflow-hidden gap-px">
            {consensus.map((c) =>
              c.count > 0 ? (
                <div
                  key={c.label}
                  className={`${c.color}`}
                  style={{ width: `${(c.count / totalRec) * 100}%` }}
                  title={`${c.label}: ${c.count}`}
                />
              ) : null,
            )}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            {consensus.map((c) =>
              c.count > 0 ? (
                <span
                  key={c.label}
                  className="text-[10px] text-gray-500 flex items-center gap-1"
                >
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-sm ${c.color}`}
                  />
                  {c.label} ({c.count})
                </span>
              ) : null,
            )}
          </div>
          {rec.period && (
            <p className="text-[10px] text-gray-600">
              Consensus as of {rec.period}
            </p>
          )}
        </div>
      )}

      {/* Recent EPS */}
      {earnings.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">
            EPS History
          </p>
          <div className="grid grid-cols-4 gap-1 text-[10px] text-gray-600 pb-0.5 border-b border-white/5">
            <span>Quarter</span>
            <span className="text-right">Actual</span>
            <span className="text-right">Estimate</span>
            <span className="text-right">Surprise</span>
          </div>
          {earnings.slice(0, 4).map((e) => {
            const surprise =
              e.epsActual != null && e.epsEstimate != null
                ? e.epsActual - e.epsEstimate
                : null;
            const beat = surprise != null && surprise >= 0;
            return (
              <div
                key={e.date}
                className="grid grid-cols-4 gap-1 text-[11px] font-mono"
              >
                <span className="text-gray-500">
                  Q{e.quarter} {e.year}
                </span>
                <span className="text-right text-gray-300">
                  {e.epsActual != null ? e.epsActual.toFixed(2) : "—"}
                </span>
                <span className="text-right text-gray-500">
                  {e.epsEstimate != null ? e.epsEstimate.toFixed(2) : "—"}
                </span>
                <span
                  className={`text-right ${
                    surprise == null
                      ? "text-gray-600"
                      : beat
                        ? "text-emerald-400"
                        : "text-red-400"
                  }`}
                >
                  {surprise != null
                    ? `${beat ? "+" : ""}${surprise.toFixed(2)}`
                    : "—"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
