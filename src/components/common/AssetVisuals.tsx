"use client";

import type { ReactNode } from "react";

function cx(...parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(" ");
}

interface AssetDotProps {
  accentColor: string;
  className?: string;
}

export function AssetDot({ accentColor, className }: AssetDotProps) {
  return (
    <span
      className={cx("rounded-full shrink-0", className)}
      style={{ backgroundColor: accentColor }}
      aria-hidden="true"
    />
  );
}

interface EtfBadgeProps {
  className?: string;
  children?: ReactNode;
}

export function EtfBadge({ className, children = "ETF" }: EtfBadgeProps) {
  return (
    <span className={cx("rounded bg-white/10 text-gray-400", className)}>
      {children}
    </span>
  );
}

interface SectionHeadingProps {
  children: ReactNode;
  className?: string;
}

export function SectionHeading({ children, className }: SectionHeadingProps) {
  return (
    <h3
      className={cx(
        "text-xs font-semibold text-gray-400 uppercase tracking-wider",
        className,
      )}
    >
      {children}
    </h3>
  );
}
