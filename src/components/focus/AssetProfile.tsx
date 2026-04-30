"use client";

import { ETF_METADATA } from "@/lib/constants";
import { useAssetStore } from "@/store/useAssetStore";
import { useEffect, useState } from "react";

interface StockProfile {
  name?: string;
  country?: string;
  currency?: string;
  exchange?: string;
  ipo?: string;
  marketCapitalization?: number;
  finnhubIndustry?: string;
  weburl?: string;
  isEtf: false;
}

interface EtfProfile {
  isEtf: true;
  ticker: string;
  description: string;
  expense: string;
  aum: string;
  benchmark: string;
}

type Profile = StockProfile | EtfProfile;

interface StatItem {
  label: string;
  value: string;
}

function Stat({ label, value }: StatItem) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-gray-500 uppercase tracking-wider">
        {label}
      </span>
      <span className="text-sm font-mono text-gray-200">{value}</span>
    </div>
  );
}

interface Props {
  ticker: string;
}

export function AssetProfile({ ticker }: Props) {
  const price = useAssetStore((s) => s.prices[ticker]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ticker) return;

    // ETF metadata is already bundled client-side — skip the API round-trip
    if (ETF_METADATA[ticker]) {
      setProfile({ isEtf: true, ticker, ...ETF_METADATA[ticker] });
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setProfile(null);

    fetch(`/api/profile?symbol=${ticker}`)
      .then((r) => r.json())
      .then((data: Profile) => {
        if (!cancelled) {
          setProfile(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ticker]);

  const priceStats: StatItem[] = price
    ? [
        { label: "Open", value: `$${price.open.toFixed(2)}` },
        { label: "Day High", value: `$${price.high.toFixed(2)}` },
        { label: "Day Low", value: `$${price.low.toFixed(2)}` },
        { label: "Prev Close", value: `$${price.prevClose.toFixed(2)}` },
        {
          label: "Change",
          value: `${price.change >= 0 ? "+" : ""}$${price.change.toFixed(2)}`,
        },
        {
          label: "Change %",
          value: `${price.changePct >= 0 ? "+" : ""}${price.changePct.toFixed(2)}%`,
        },
      ]
    : [];

  const profileStats: StatItem[] = [];
  if (profile) {
    if (profile.isEtf) {
      profileStats.push(
        { label: "Expense Ratio", value: profile.expense },
        { label: "AUM", value: profile.aum },
        { label: "Benchmark", value: profile.benchmark },
      );
    } else {
      if (profile.exchange)
        profileStats.push({ label: "Exchange", value: profile.exchange });
      if (profile.country)
        profileStats.push({ label: "Country", value: profile.country });
      if (profile.currency)
        profileStats.push({ label: "Currency", value: profile.currency });
      if (profile.ipo)
        profileStats.push({ label: "IPO Date", value: profile.ipo });
      if (profile.marketCapitalization) {
        const mcap = profile.marketCapitalization;
        const formatted =
          mcap >= 1000
            ? `$${(mcap / 1000).toFixed(1)}B`
            : `$${mcap.toFixed(0)}M`;
        profileStats.push({ label: "Mkt Cap", value: formatted });
      }
      if (profile.finnhubIndustry)
        profileStats.push({ label: "Sector", value: profile.finnhubIndustry });
    }
  }

  const etfMeta = ETF_METADATA[ticker];

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-4">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        Asset Profile
      </h3>

      {/* ETF description */}
      {etfMeta && (
        <p className="text-[13px] text-gray-400 leading-relaxed">
          {etfMeta.description}
        </p>
      )}

      {loading && (
        <div className="grid grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-8 rounded bg-white/5 animate-pulse" />
          ))}
        </div>
      )}

      {/* Price stats */}
      {priceStats.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {priceStats.map((s) => (
            <Stat key={s.label} {...s} />
          ))}
        </div>
      )}

      {/* Profile stats */}
      {profileStats.length > 0 && (
        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/5">
          {profileStats.map((s) => (
            <Stat key={s.label} {...s} />
          ))}
        </div>
      )}
    </div>
  );
}
