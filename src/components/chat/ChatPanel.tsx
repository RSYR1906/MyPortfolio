"use client";

import { usePortfolio } from "@/hooks/usePortfolio";
import { useAssetStore } from "@/store/useAssetStore";
import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import { TradeConfirmCard } from "./TradeConfirmCard";

interface Trade {
  ticker: string;
  type: "buy" | "sell";
  shares: number;
  pricePerShare: number;
  date: string;
}

interface Props {
  onClose: () => void;
}

export function ChatPanel({ onClose }: Props) {
  const assets = useAssetStore((s) => s.assets);
  const addTransaction = useAssetStore((s) => s.addTransaction);
  const { holdings } = usePortfolio();

  // Track which tool call IDs have already been confirmed/cancelled so we
  // don't re-render the card after the user acts.
  const [handled, setHandled] = useState<Set<string>>(new Set());

  const { messages, input, handleInputChange, handleSubmit, status } = useChat({
    api: "/api/chat",
    body: { assets, holdings },
  });

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to latest message whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleConfirm(toolCallId: string, trade: Trade) {
    addTransaction({
      id: crypto.randomUUID(),
      ticker: trade.ticker,
      type: trade.type,
      shares: trade.shares,
      pricePerShare: trade.pricePerShare,
      date: trade.date
        ? new Date(trade.date).toISOString()
        : new Date().toISOString(),
    });
    setHandled((prev) => new Set(prev).add(toolCallId));
  }

  function handleCancel(toolCallId: string) {
    setHandled((prev) => new Set(prev).add(toolCallId));
  }

  const isLoading = status === "streaming" || status === "submitted";

  return (
    <div className="flex flex-col bg-[#161b22] border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm h-120 sm:h-130">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-100">
            AI Assistant
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-medium">
            Gemini
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close chat"
          className="text-gray-500 hover:text-gray-200 transition-colors text-lg leading-none"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
            <div className="w-10 h-10 rounded-full bg-blue-500/15 flex items-center justify-center text-xl">
              ✦
            </div>
            <p className="text-sm text-gray-400">
              Ask me to record a trade, e.g.
            </p>
            <div className="space-y-1.5 w-full">
              {[
                "I bought 10 shares of NVDA at $120",
                "Sold 5 AAPL at $195 yesterday",
                "Add 3 shares of SPY at $580 on May 1st",
              ].map((ex) => (
                <button
                  key={ex}
                  onClick={() =>
                    handleInputChange({
                      target: { value: ex },
                    } as React.ChangeEvent<HTMLInputElement>)
                  }
                  className="w-full text-left text-xs text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded-lg px-3 py-2 transition-colors border border-white/5"
                >
                  &ldquo;{ex}&rdquo;
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => {
          const isUser = msg.role === "user";

          // Collect any unhandled record_trade tool invocations from this message
          const pendingTrades =
            msg.role === "assistant"
              ? (msg.toolInvocations ?? []).filter(
                  (inv) =>
                    inv.toolName === "record_trade" &&
                    inv.state === "result" &&
                    !handled.has(inv.toolCallId),
                )
              : [];

          return (
            <div key={msg.id}>
              {msg.content && (
                <div
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      isUser
                        ? "bg-blue-600 text-white rounded-br-sm"
                        : "bg-white/8 text-gray-200 rounded-bl-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              )}

              {pendingTrades.map((inv) => {
                if (inv.state !== "result") return null;
                const trade = inv.result as Trade;
                return (
                  <TradeConfirmCard
                    key={inv.toolCallId}
                    trade={trade}
                    onConfirm={() => handleConfirm(inv.toolCallId, trade)}
                    onCancel={() => handleCancel(inv.toolCallId)}
                  />
                );
              })}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/8 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 px-3 py-3 border-t border-white/10 shrink-0"
      >
        <input
          ref={inputRef}
          value={input}
          onChange={handleInputChange}
          placeholder="e.g. I bought 10 NVDA at $120…"
          disabled={isLoading}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-gray-100 placeholder:text-gray-600 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          aria-label="Send"
          className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shrink-0 transition-colors"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </div>
  );
}
