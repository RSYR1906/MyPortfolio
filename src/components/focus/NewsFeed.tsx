"use client";

import type { NewsItem } from "@/types";

interface Props {
  news: NewsItem[];
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
}

function timeAgo(unix: number): string {
  const diff = Math.floor(Date.now() / 1000) - unix;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function NewsFeed({ news, loading, error, onRetry }: Props) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        Latest News
      </h3>

      {loading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3.5 w-3/4 bg-white/5 rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-white/5 rounded animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3">
          <p className="text-sm text-red-400">Failed to load news: {error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors shrink-0"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {!loading && !error && news.length === 0 && (
        <p className="text-sm text-gray-600">
          No recent news found for this asset.
        </p>
      )}

      {!loading &&
        news.map((item) => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block group"
          >
            <p className="text-[13px] text-gray-300 group-hover:text-blue-400 transition-colors leading-snug line-clamp-2">
              {item.headline}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] text-gray-600">{item.source}</span>
              <span className="text-[11px] text-gray-700">·</span>
              <span className="text-[11px] text-gray-600">
                {timeAgo(item.datetime)}
              </span>
            </div>
          </a>
        ))}
    </div>
  );
}
