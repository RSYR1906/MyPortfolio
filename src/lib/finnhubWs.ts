/** Callback invoked when a live trade price arrives. */
type PriceCallback = (ticker: string, price: number) => void;

interface TradeMessage {
  type: 'trade';
  data: Array<{ s: string; p: number; t: number; v: number }>;
}

interface PingMessage {
  type: 'ping';
}

type FinnhubMessage = TradeMessage | PingMessage;

const MAX_RECONNECT_ATTEMPTS = 4;
const BASE_DELAY_MS = 1500;

class FinnhubWsManager {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private tickers: string[] = [];
  private callbacks = new Set<PriceCallback>();
  private reconnectAttempts = 0;
  private destroyed = false;

  connect(token: string, tickers: string[]) {
    // Close any existing socket before opening a new one (guards against
    // React Strict Mode double-mount and repeated calls).
    if (this.ws) {
      this.ws.onclose = null; // prevent scheduleReconnect firing
      this.ws.close();
      this.ws = null;
    }
    this.token = token;
    this.tickers = tickers;
    this.destroyed = false;
    this.reconnectAttempts = 0;
    this.openSocket();
  }

  private openSocket() {
    if (!this.token || this.destroyed) return;

    const ws = new WebSocket(`wss://ws.finnhub.io?token=${this.token}`);
    this.ws = ws;

    ws.addEventListener('open', () => {
      this.reconnectAttempts = 0;
      for (const ticker of this.tickers) {
        ws.send(JSON.stringify({ type: 'subscribe', symbol: ticker }));
      }
    });

    ws.addEventListener('message', (event: MessageEvent<string>) => {
      try {
        const msg = JSON.parse(event.data) as FinnhubMessage;
        if (msg.type !== 'trade') return;
        for (const trade of msg.data) {
          for (const cb of this.callbacks) {
            cb(trade.s, trade.p);
          }
        }
      } catch {
        // ignore malformed frames
      }
    });

    ws.addEventListener('close', () => {
      if (!this.destroyed) this.scheduleReconnect();
    });

    ws.addEventListener('error', () => {
      ws.close();
    });
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS || this.destroyed) return;
    const delay = BASE_DELAY_MS * 2 ** this.reconnectAttempts;
    this.reconnectAttempts++;
    setTimeout(() => this.openSocket(), delay);
  }

  /** Subscribe to a single ticker at runtime (after initial connect). */
  subscribeTicker(ticker: string) {
    if (this.tickers.includes(ticker)) return;
    this.tickers.push(ticker);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'subscribe', symbol: ticker }));
    }
  }

  /** Unsubscribe a single ticker at runtime. */
  unsubscribeTicker(ticker: string) {
    this.tickers = this.tickers.filter((t) => t !== ticker);
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type: 'unsubscribe', symbol: ticker }));
      } catch {
        // socket may be closing
      }
    }
  }

  subscribe(cb: PriceCallback) {
    this.callbacks.add(cb);
  }

  unsubscribe(cb: PriceCallback) {
    this.callbacks.delete(cb);
  }

  disconnect() {
    this.destroyed = true;
    this.callbacks.clear();
    if (this.ws) {
      for (const ticker of this.tickers) {
        try {
          this.ws.send(JSON.stringify({ type: 'unsubscribe', symbol: ticker }));
        } catch {
          // socket may already be closing
        }
      }
      this.ws.close();
      this.ws = null;
    }
  }
}

// Singleton — one connection shared across the entire app.
export const finnhubWsManager = new FinnhubWsManager();
