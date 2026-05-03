/**
 * SSE price proxy — connects to Finnhub WebSocket on the server and
 * streams live trade ticks to the browser as Server-Sent Events.
 *
 * The Finnhub WS key stays on the server; the browser never sees it.
 * Using Edge runtime to avoid serverless function timeout limits.
 */
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const TICKER_RE = /^[A-Z0-9.]{1,12}$/;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tickersParam = url.searchParams.get('tickers');

  if (!tickersParam) {
    return new Response(JSON.stringify({ error: 'Missing tickers param' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const tickers = tickersParam
    .split(',')
    .map((t) => t.trim().toUpperCase())
    .filter((t) => TICKER_RE.test(t))
    .slice(0, 50);

  if (tickers.length === 0) {
    return new Response(JSON.stringify({ error: 'No valid tickers' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Use FINNHUB_WS_KEY, fall back to FINNHUB_API_KEY (same key in Finnhub's system)
  const wsKey =
    process.env.FINNHUB_WS_KEY ?? process.env.FINNHUB_API_KEY;

  if (!wsKey) {
    return new Response(
      JSON.stringify({ error: 'Finnhub WS key not configured' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const ws = new WebSocket(`wss://ws.finnhub.io?token=${wsKey}`);

      ws.addEventListener('open', () => {
        for (const ticker of tickers) {
          ws.send(JSON.stringify({ type: 'subscribe', symbol: ticker }));
        }
      });

      ws.addEventListener('message', (event) => {
        try {
          const msg = JSON.parse(event.data as string) as {
            type: string;
            data?: Array<{ s: string; p: number }>;
          };
          if (msg.type === 'trade' && Array.isArray(msg.data)) {
            for (const trade of msg.data) {
              const payload = JSON.stringify({ ticker: trade.s, price: trade.p });
              controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
            }
          }
        } catch {
          // ignore malformed messages
        }
      });

      ws.addEventListener('error', () => {
        try {
          controller.close();
        } catch {
          // already closed
        }
      });

      ws.addEventListener('close', () => {
        try {
          controller.close();
        } catch {
          // already closed
        }
      });

      // Clean up when the client disconnects
      req.signal.addEventListener('abort', () => {
        for (const ticker of tickers) {
          try {
            ws.send(JSON.stringify({ type: 'unsubscribe', symbol: ticker }));
          } catch {
            // ignore if already closed
          }
        }
        ws.close();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
    },
  });
}
