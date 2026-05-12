"use client";

interface Trade {
  ticker: string;
  type: "buy" | "sell";
  shares: number;
  pricePerShare: number;
  date: string;
}

interface Props {
  trade: Trade;
  onConfirm: () => void;
  onCancel: () => void;
}

export function TradeConfirmCard({ trade, onConfirm, onCancel }: Props) {
  const { ticker, type, shares, pricePerShare, date } = trade;
  const total = shares * pricePerShare;
  const isBuy = type === "buy";

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 mt-2 text-sm">
      <div className="flex items-center gap-2 mb-3">
        <span
          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
            isBuy
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-red-500/20 text-red-400"
          }`}
        >
          {type}
        </span>
        <span className="font-bold text-gray-100">{ticker}</span>
      </div>

      <div className="space-y-1.5 text-xs mb-3.5">
        <div className="flex justify-between text-gray-400">
          <span>Shares</span>
          <span className="font-mono text-gray-100">
            {shares % 1 === 0 ? shares : shares.toFixed(4)}
          </span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>Price per share</span>
          <span className="font-mono text-gray-100">
            ${pricePerShare.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between text-gray-400 border-t border-white/5 pt-1.5">
          <span>Total</span>
          <span className="font-mono font-semibold text-gray-100">
            ${total.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>Date</span>
          <span className="font-mono text-gray-300">{date}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onConfirm}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
            isBuy
              ? "bg-emerald-600 hover:bg-emerald-500 text-white"
              : "bg-red-600 hover:bg-red-500 text-white"
          }`}
        >
          Confirm {type}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 py-2 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
