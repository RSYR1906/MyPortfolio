export const HIDDEN_VALUE_MASK = "••••";

export function formatShareCount(shares: number, fractionalDigits = 4): string {
  return Number.isInteger(shares) ? String(shares) : shares.toFixed(fractionalDigits);
}

export function formatShareLabel(
  shares: number,
  options?: { fractionalDigits?: number; suffix?: string },
): string {
  const fractionalDigits = options?.fractionalDigits ?? 4;
  const suffix = options?.suffix ?? "shares";
  return `${formatShareCount(shares, fractionalDigits)} ${suffix}`;
}

export function maskIfHidden(hidden: boolean, visibleValue: string): string {
  return hidden ? HIDDEN_VALUE_MASK : visibleValue;
}