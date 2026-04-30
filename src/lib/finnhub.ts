const FINNHUB_BASE = 'https://finnhub.io/api/v1';

/**
 * Server-side Finnhub REST helper.
 * Uses FINNHUB_API_KEY from environment — never exposed to the browser.
 */
export async function finnhubFetch<T>(
  path: string,
  params: Record<string, string> = {},
  revalidate = 0,
): Promise<T> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) throw new Error('FINNHUB_API_KEY environment variable is not set');

  const url = new URL(`${FINNHUB_BASE}${path}`);
  url.searchParams.set('token', apiKey);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    next: { revalidate },
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Finnhub API error ${res.status} ${res.statusText} for ${path}`);
  }

  return res.json() as Promise<T>;
}
