"use client";

import type { SearchResult } from "@/app/api/search/route";
import { useCurrency } from "@/hooks/useCurrency";
import { usePortfolio } from "@/hooks/usePortfolio";
import { finnhubWsManager } from "@/lib/finnhubWs";
import { createClient } from "@/lib/supabase/client";
import { useAssetStore } from "@/store/useAssetStore";
import { useCurrencyStore } from "@/store/useCurrencyStore";
import type { Asset } from "@/types";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AssetRow } from "./AssetRow";
import { PortfolioModal } from "./PortfolioModal";

interface Props {
  onTradeClick: (ticker: string) => void;
  /** Called when the mobile close (✕) button is pressed. */
  onClose?: () => void;
}

export function AssetSidebar({ onTradeClick, onClose }: Props) {
  const assets = useAssetStore((s) => s.assets);
  const router = useRouter();

  const { holdings, pnlMap, totalValue, totalCost } = usePortfolio();
  const totalPnL = totalValue - totalCost;

  const { currency, fmt, fmtPnL } = useCurrency();
  const setCurrency = useCurrencyStore((s) => s.setCurrency);

  const [portfolioOpen, setPortfolioOpen] = useState(false);

  // ── Add-ticker form state ────────────────────────────────────────────────
  const [addInput, setAddInput] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // ── Suggestion dropdown state ────────────────────────────────────────────
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdown when clicking outside the form
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (formRef.current && !formRef.current.contains(e.target as Node)) {
        setSuggestionsOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function handleInputChange(raw: string) {
    const val = raw.toUpperCase();
    setAddInput(val);
    setAddError(null);
    setActiveIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!val.trim()) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(val)}`);
        if (!res.ok) return;
        const data = (await res.json()) as SearchResult[];
        setSuggestions(data);
        setSuggestionsOpen(data.length > 0);
      } catch {
        // ignore search errors — user can still type manually
      }
    }, 250);
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (suggestionsOpen && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, -1));
        return;
      }
      if (e.key === "Escape") {
        setSuggestionsOpen(false);
        setActiveIndex(-1);
        return;
      }
      if (e.key === "Enter") {
        if (activeIndex >= 0) {
          e.preventDefault();
          selectSuggestion(suggestions[activeIndex]);
          return;
        }
      }
    }
    if (e.key === "Enter") handleAdd();
  }

  function selectSuggestion(result: SearchResult) {
    setAddInput(result.ticker);
    setSuggestionsOpen(false);
    setActiveIndex(-1);
    setSuggestions([]);
    // Immediately add it
    addTicker(result.ticker);
  }

  async function addTicker(sym: string) {
    if (!sym) return;
    if (assets.some((a) => a.ticker === sym)) {
      setAddError("Already tracked");
      return;
    }
    setIsAdding(true);
    setAddError(null);
    try {
      const res = await fetch(`/api/ticker?symbol=${encodeURIComponent(sym)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setAddError((body as { error?: string }).error ?? "Symbol not found");
        return;
      }
      const asset = (await res.json()) as Asset;
      useAssetStore.getState().addAsset(asset);
      finnhubWsManager.subscribeTicker(sym);
      fetch(`/api/quotes?tickers=${encodeURIComponent(sym)}`)
        .then((r) => r.json())
        .then((data) => useAssetStore.getState().initPrices(data))
        .catch(console.error);
      setAddInput("");
      inputRef.current?.focus();
    } catch {
      setAddError("Lookup failed");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleAdd() {
    const sym = addInput.trim().toUpperCase();
    await addTicker(sym);
  }

  function handleRemove(ticker: string) {
    useAssetStore.getState().removeAsset(ticker);
    finnhubWsManager.unsubscribeTicker(ticker);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <aside
        id="asset-sidebar"
        className="w-full max-w-xs md:w-64 shrink-0 flex flex-col h-full border-r border-white/10 bg-[#0d1117]"
      >
        {/* Header */}
        <div className="px-4 py-4 border-b border-white/10 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-gray-100 tracking-tight">
                Portfolio
              </h1>
              {/* Currency toggle */}
              <div className="flex items-center rounded overflow-hidden border border-white/10 text-[10px] font-semibold">
                {(["USD", "SGD"] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    aria-pressed={currency === c}
                    className={`px-1.5 py-0.5 transition-colors ${
                      currency === c
                        ? "bg-blue-600/30 text-blue-300"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {assets.length} tracked asset{assets.length !== 1 ? "s" : ""}
            </p>
          </div>
          {/* Close button — only shown on mobile */}
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden text-gray-500 hover:text-gray-200 transition-colors text-lg leading-none mt-0.5"
              aria-label="Close sidebar"
            >
              ✕
            </button>
          )}
        </div>

        {/* Add ticker form — at the top, below the header */}
        <div className="border-b border-white/10 px-3 py-2.5" ref={formRef}>
          <div className="relative">
            <div className="flex gap-1.5">
              <input
                ref={inputRef}
                id="ticker-search"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={suggestionsOpen}
                aria-controls="ticker-suggestions"
                aria-activedescendant={
                  activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined
                }
                value={addInput}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleInputKeyDown}
                onFocus={() => {
                  if (suggestions.length > 0) setSuggestionsOpen(true);
                }}
                placeholder="Add ticker, e.g. AAPL"
                maxLength={40}
                disabled={isAdding}
                autoComplete="off"
                className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500/60 disabled:opacity-50"
              />
              <button
                onClick={handleAdd}
                disabled={isAdding || !addInput.trim()}
                className="px-2 py-1 rounded bg-blue-600/80 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-xs text-white transition-colors"
              >
                {isAdding ? "…" : "+"}
              </button>
            </div>

            {/* Suggestions dropdown */}
            {suggestionsOpen && suggestions.length > 0 && (
              <ul
                id="ticker-suggestions"
                role="listbox"
                aria-label="Ticker suggestions"
                className="absolute left-0 right-0 top-full mt-1 z-40 bg-[#161b22] border border-white/10 rounded-lg shadow-xl overflow-hidden"
              >
                {suggestions.map((s, i) => (
                  <li
                    key={s.ticker}
                    id={`suggestion-${i}`}
                    role="option"
                    aria-selected={i === activeIndex}
                    onPointerDown={(e) => {
                      // prevent input blur before click fires
                      e.preventDefault();
                      selectSuggestion(s);
                    }}
                    className={`flex items-center justify-between gap-2 px-3 py-2 cursor-pointer transition-colors ${
                      i === activeIndex
                        ? "bg-blue-600/20 text-gray-100"
                        : "hover:bg-white/5 text-gray-300"
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-semibold text-gray-100 shrink-0">
                        {s.ticker}
                      </span>
                      <span className="text-[11px] text-gray-500 truncate">
                        {s.name}
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      {s.type === "etf" && (
                        <span className="text-[10px] px-1 py-0.5 rounded bg-white/10 text-gray-400">
                          ETF
                        </span>
                      )}
                      <span className="text-[10px] text-gray-600 uppercase">
                        {s.exchange}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {addError && (
            <p className="text-[10px] text-red-400 mt-1">{addError}</p>
          )}
        </div>

        {/* Asset list */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/5">
          {assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
              <p className="text-sm text-gray-500">No assets tracked yet.</p>
              <p className="text-xs text-gray-600">
                Type a ticker above and press{" "}
                <kbd className="px-1 py-0.5 rounded bg-white/5 text-gray-400 font-mono text-[10px]">
                  Enter
                </kbd>{" "}
                to add one.
              </p>
            </div>
          ) : (
            assets.map((asset) => (
              <AssetRow
                key={asset.ticker}
                asset={asset}
                holding={holdings[asset.ticker]}
                pnl={pnlMap[asset.ticker]}
                onTradeClick={onTradeClick}
                onRemove={handleRemove}
              />
            ))
          )}
        </div>

        {/* Portfolio total — clickable to open modal */}
        {totalCost > 0 && (
          <button
            onClick={() => setPortfolioOpen(true)}
            className="border-t border-white/10 px-4 py-3 w-full text-left hover:bg-white/[0.03] transition-colors group"
          >
            <p className="text-[11px] text-gray-500 uppercase tracking-wider flex items-center justify-between">
              Total Portfolio
              <span className="text-[10px] text-gray-600 group-hover:text-blue-400 transition-colors">
                View details →
              </span>
            </p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-sm font-mono text-gray-100">
                {fmt(totalValue)}
              </span>
              <span
                className={`text-sm font-mono ${totalPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}
              >
                {fmtPnL(totalPnL)}
              </span>
            </div>
          </button>
        )}

        {/* Sign-out */}
        <button
          onClick={handleSignOut}
          className="border-t border-white/10 px-4 py-3 w-full text-left text-xs text-gray-500 hover:text-gray-300 hover:bg-white/[0.03] transition-colors flex items-center gap-2"
        >
          <span>↩</span> Sign out
        </button>
      </aside>

      {portfolioOpen && (
        <PortfolioModal onClose={() => setPortfolioOpen(false)} />
      )}
    </>
  );
}
