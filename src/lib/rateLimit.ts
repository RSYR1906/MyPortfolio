/**
 * Simple in-memory IP-based rate limiter for Next.js API routes.
 *
 * NOTE: This works for single-process deployments (local dev, single-server).
 * In a serverless / multi-instance environment each instance has its own Map,
 * so the effective limit is MAX_REQUESTS * numInstances. For production you
 * would replace the Map with a Redis/KV store.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

/** Number of requests allowed per IP per WINDOW_MS. */
const MAX_REQUESTS = 60;
/** Rolling window in milliseconds. */
const WINDOW_MS = 60_000;

/** Prune expired entries to prevent unbounded memory growth. */
function pruneExpired() {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) store.delete(key);
  }
}

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();

  // Periodically clean up stale entries (every ~100 calls)
  if (Math.random() < 0.01) pruneExpired();

  const entry = store.get(ip);

  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS - 1 };
  }

  if (entry.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: MAX_REQUESTS - entry.count };
}

/** Extract best-effort client IP from a Next.js request header. */
export function getClientIp(req: { headers: { get(name: string): string | null } }): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return '127.0.0.1';
}
