"use client";

import type { Candle, ChartType } from "@/types";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  CrosshairMode,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type SeriesType,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useRef, useState } from "react";

interface Props {
  candles: Candle[];
  loading: boolean;
  accentColor: string;
  error?: string | null;
  onRetry?: () => void;
}

export function PriceChart({
  candles,
  loading,
  accentColor,
  error,
  onRetry,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<SeriesType> | null>(null);
  const [chartType, setChartType] = useState<ChartType>("line");

  // Create chart once on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      // autoSize lets Lightweight Charts manage its own ResizeObserver so the
      // chart never starts at 0×0, even under React Strict Mode double-mount.
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9ca3af",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "#1f2937" },
        horzLines: { color: "#1f2937" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "#374151" },
      timeScale: {
        borderColor: "#374151",
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: true,
      handleScale: true,
    });
    chartRef.current = chart;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // Update series data when candles or chartType changes
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    // Remove old series
    if (seriesRef.current) {
      chart.removeSeries(seriesRef.current);
      seriesRef.current = null;
    }

    if (!candles.length) return;

    if (chartType === "candlestick") {
      const series = chart.addSeries(CandlestickSeries, {
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderUpColor: "#22c55e",
        borderDownColor: "#ef4444",
        wickUpColor: "#22c55e",
        wickDownColor: "#ef4444",
      });
      series.setData(
        candles.map((c) => ({
          time: c.time as UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        })),
      );
      seriesRef.current = series;
    } else {
      const series = chart.addSeries(LineSeries, {
        color:
          accentColor === "#FFD700" || accentColor === "#C0C0C0"
            ? accentColor
            : "#60a5fa",
        lineWidth: 2,
        crosshairMarkerVisible: true,
      });
      series.setData(
        candles.map((c) => ({
          time: c.time as UTCTimestamp,
          value: c.close,
        })),
      );
      seriesRef.current = series;
    }

    chart.timeScale().fitContent();
  }, [candles, chartType, accentColor]);

  return (
    <div className="relative w-full h-full">
      {/* Chart type toggle */}
      <div className="absolute top-2 right-2 z-10 flex gap-1 bg-[#0d1117]/80 rounded-md p-0.5">
        {(["line", "candlestick"] as ChartType[]).map((type) => (
          <button
            key={type}
            onClick={() => setChartType(type)}
            className={`px-2 py-0.5 text-[11px] rounded transition-colors capitalize ${
              chartType === type
                ? "bg-white/15 text-gray-100"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {type === "line" ? "Line" : "Candle"}
          </button>
        ))}
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0d1117]/60 rounded-lg">
          <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <p className="text-sm text-red-500">Chart error: {error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && !candles.length && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-gray-600">
            No chart data available for this period
          </p>
        </div>
      )}

      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
