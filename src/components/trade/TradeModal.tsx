"use client";

import { Modal } from "@/components/Modal";
import { useAssetStore } from "@/store/useAssetStore";
import { TradeForm } from "./TradeForm";

interface Props {
  ticker: string;
  onClose: () => void;
}

export function TradeModal({ ticker, onClose }: Props) {
  const asset = useAssetStore((s) => s.assets.find((a) => a.ticker === ticker));

  return (
    <Modal onClose={onClose}>
      <div className="w-full max-w-sm bg-[#161b22] border border-white/10 rounded-2xl shadow-2xl p-5 space-y-4 anim-modal-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-100">
              Trade {ticker}
            </h2>
            {asset && <p className="text-xs text-gray-500">{asset.name}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <TradeForm ticker={ticker} onClose={onClose} />
      </div>
    </Modal>
  );
}
