"use client";

import { Modal } from "@/components/Modal";
import { useCurrency } from "@/hooks/useCurrency";
import { useAssetStore } from "@/store/useAssetStore";
import { useState } from "react";

interface Props {
  onClose: () => void;
}

type CashType = "deposit" | "withdrawal";

export function CashModal({ onClose }: Props) {
  const addTransaction = useAssetStore((s) => s.addTransaction);
  const allTransactions = useAssetStore((s) => s.transactions);
  const cashTxs = allTransactions
    .filter((t) => t.ticker === "$CASH")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const { fmt } = useCurrency();

  const [cashType, setCashType] = useState<CashType>("deposit");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const amountNum = parseFloat(amount);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Amount must be a positive number.");
      return;
    }

    addTransaction({
      ticker: "$CASH",
      type: cashType,
      shares: 1,
      pricePerShare: amountNum,
      date: new Date(date).toISOString(),
    });

    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setAmount("");
    }, 1200);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <Modal onClose={onClose} labelId="cash-modal-title">
      <div className="w-full max-w-sm bg-[#161b22] border border-white/10 rounded-2xl shadow-2xl p-5 space-y-4 anim-modal-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2
              id="cash-modal-title"
              className="text-base font-semibold text-gray-100"
            >
              Cash
            </h2>
            <p className="text-xs text-gray-500">
              Record a deposit or withdrawal
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Deposit / Withdrawal toggle */}
          <div className="flex rounded-lg overflow-hidden border border-white/10">
            {(["deposit", "withdrawal"] as CashType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setCashType(type);
                  setError(null);
                }}
                className={`flex-1 py-2 text-sm font-semibold capitalize transition-colors ${
                  cashType === type
                    ? type === "deposit"
                      ? "bg-emerald-500/20 text-emerald-400 border-b-2 border-emerald-500"
                      : "bg-amber-500/20 text-amber-400 border-b-2 border-amber-500"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Amount (USD)</label>
            <input
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              autoFocus
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* Date */}
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

          {/* Error */}
          {error && <p className="text-sm text-red-400">{error}</p>}

          {/* Submit */}
          <button
            type="submit"
            className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              submitted
                ? "bg-emerald-600 text-white"
                : cashType === "deposit"
                  ? "bg-emerald-500 hover:bg-emerald-400 text-white"
                  : "bg-amber-500 hover:bg-amber-400 text-white"
            }`}
          >
            {submitted
              ? "✓ Recorded!"
              : `Confirm ${cashType === "deposit" ? "Deposit" : "Withdrawal"}`}
          </button>
        </form>

        {/* Recent cash transactions */}
        {cashTxs.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-white/10">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider">
              Recent
            </p>
            {cashTxs.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between text-xs"
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                      tx.type === "deposit"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-amber-500/15 text-amber-400"
                    }`}
                  >
                    {tx.type}
                  </span>
                  <span className="text-gray-500">{formatDate(tx.date)}</span>
                </span>
                <span className="font-mono text-gray-300">
                  {fmt(tx.pricePerShare)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
