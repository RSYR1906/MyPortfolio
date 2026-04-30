"use client";

import type { Timeframe } from "@/types";

const TIMEFRAMES: Timeframe[] = ["1D", "1W", "1M", "3M", "6M", "1Y", "YTD"];

interface Props {
  value: Timeframe;
  onChange: (tf: Timeframe) => void;
}

export function TimeframeSelector({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5 flex-wrap">
      {TIMEFRAMES.map((tf) => (
        <button
          key={tf}
          onClick={() => onChange(tf)}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            value === tf
              ? "bg-blue-500 text-white shadow-sm"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          {tf}
        </button>
      ))}
    </div>
  );
}
