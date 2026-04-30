"use client";

import { netSharesFor } from "@/lib/portfolio";
import { useAssetStore } from "@/store/useAssetStore";
import type { Transaction } from "@/types";
import { useState } from "react";

interface Props {
  ticker: string;
  onClose?: () => void;
}

type TradeType = "buy" | "sell";

export function TradeForm({ ticker, onClose }: Props) {
  const addTransaction = useAssetStore((s) => s.addTransaction);
  const livePrice = useAssetStore((s) => s.prices[ticker]?.price);
  const transactions = useAssetStore((s) => s.transactions);

  const heldShares = netSharesFor(transactions, ticker);

  const [tradeType, setTradeType] = useState<TradeType>("buy");
  const [shares, setShares] = useState("");
  const [pricePerShare, setPricePerShare] = useState(
    livePrice !== undefined ? livePrice.toFixed(2) : "",
  );
  const [date, setDate] = useState(() => {
    const now = new Date();
    // Format as datetime-local value: YYYY-MM-DDTHH:mm
    return now.toISOString().slice(0, 16);
  });
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const sharesNum = parseFloat(shares);
  const priceNum = parseFloat(pricePerShare);
  const totalValue =
    !isNaN(sharesNum) && !isNaN(priceNum) ? sharesNum * priceNum : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (isNaN(sharesNum) || sharesNum <= 0) {
      setError("Shares must be a positive number.");
      return;
    }
    if (isNaN(priceNum) || priceNum <= 0) {
      setError("Price per share must be a positive number.");
      return;
    }
    if (tradeType === "sell" && sharesNum > heldShares) {
      setError(
        `You only hold ${heldShares % 1 === 0 ? heldShares : heldShares.toFixed(4)} shares of ${ticker}.`,
      );
      return;
    }

    const tx: Omit<Transaction, "id"> = {
      ticker,
      type: tradeType,
      shares: sharesNum,
      pricePerShare: priceNum,
      date: new Date(date).toISOString(),
    };

    addTransaction(tx);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setShares("");
      if (onClose) onClose();
    }, 1200);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Buy / Sell toggle */}
      <div className="flex rounded-lg overflow-hidden border border-white/10">
        {(["buy", "sell"] as TradeType[]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => {
              setTradeType(type);
              setError(null);
            }}
            className={`flex-1 py-2 text-sm font-semibold capitalize transition-colors ${
              tradeType === type
                ? type === "buy"
                  ? "bg-emerald-500/20 text-emerald-400 border-b-2 border-emerald-500"
                  : "bg-red-500/20 text-red-400 border-b-2 border-red-500"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Ticker badge */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Asset</span>
        <span className="px-2 py-0.5 rounded bg-white/10 text-sm font-semibold text-gray-200">
          {ticker}
        </span>
        {tradeType === "sell" && heldShares > 0 && (
          <span className="text-xs text-gray-500 ml-auto">
            Max:{" "}
            <button
              type="button"
              className="text-blue-400 hover:underline"
              onClick={() =>
                setShares(
                  heldShares % 1 === 0
                    ? String(heldShares)
                    : heldShares.toFixed(4),
                )
              }
            >
              {heldShares % 1 === 0 ? heldShares : heldShares.toFixed(4)} shares
            </button>
          </span>
        )}
      </div>

      {/* Shares */}
      <div className="space-y-1">
        <label className="text-xs text-gray-500">Shares</label>
        <input
          type="number"
          min="0"
          step="any"
          value={shares}
          onChange={(e) => setShares(e.target.value)}
          placeholder="0.00"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500"
          required
        />
      </div>

      {/* Price per share */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-xs text-gray-500">Price per Share ($)</label>
          {livePrice !== undefined && (
            <button
              type="button"
              className="text-[11px] text-blue-400 hover:underline"
              onClick={() => setPricePerShare(livePrice.toFixed(2))}
            >
              Use live: ${livePrice.toFixed(2)}
            </button>
          )}
        </div>
        <input
          type="number"
          min="0"
          step="any"
          value={pricePerShare}
          onChange={(e) => setPricePerShare(e.target.value)}
          placeholder="0.00"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500"
          required
        />
      </div>

      {/* Date/time */}
      <div className="space-y-1">
        <label className="text-xs text-gray-500">Date &amp; Time</label>
        <input
          type="datetime-local"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-blue-500 [color-scheme:dark]"
          required
        />
      </div>

      {/* Total preview */}
      {totalValue !== null && (
        <div className="flex items-center justify-between text-sm bg-white/5 rounded-lg px-3 py-2">
          <span className="text-gray-500">Total</span>
          <span className="font-mono font-semibold text-gray-100">
            ${totalValue.toFixed(2)}
          </span>
        </div>
      )}

      {/* Error */}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* Submit */}
      <button
        type="submit"
        className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors ${
          submitted
            ? "bg-emerald-600 text-white"
            : tradeType === "buy"
              ? "bg-emerald-500 hover:bg-emerald-400 text-white"
              : "bg-red-500 hover:bg-red-400 text-white"
        }`}
      >
        {submitted
          ? "✓ Recorded!"
          : `Confirm ${tradeType === "buy" ? "Buy" : "Sell"}`}
      </button>
    </form>
  );
}
