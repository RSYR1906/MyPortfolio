/**
 * Returns the Finnhub WebSocket token to the browser without baking it into
 * the JS bundle.  The token comes from a server-only env var (FINNHUB_WS_KEY),
 * so it does not appear in client-side code or static assets.
 *
 * Security note: the token is still transmitted to the browser over HTTPS;
 * for full isolation you would proxy the WebSocket server-side.  This approach
 * prevents the key from being scraped from the static bundle.
 */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // never cache — always fresh

export async function GET() {
  const token = process.env.FINNHUB_WS_KEY;
  if (!token) {
    return NextResponse.json({ error: 'WebSocket key not configured' }, { status: 503 });
  }
  return NextResponse.json({ token });
}
