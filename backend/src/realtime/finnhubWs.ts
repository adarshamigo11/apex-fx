// ============================================================================
//  finnhubWs.ts — Finnhub WebSocket client for real-time forex/crypto prices.
//  Connects to wss://ws.finnhub.io and subscribes to symbols.
//  Exposes a latest-price map that priceFeed.ts reads on each tick cycle.
// ============================================================================
import WebSocket from 'ws';
import { env } from '../config/env';

export interface FinnhubTrade {
  symbol: string;
  price: number;
  volume: number;
  timestamp: number;
}

// Maps Finnhub symbol → latest price
const latestPrices: Map<string, { price: number; ts: number }> = new Map();

let ws: WebSocket | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let isConnected = false;

// Internal → Finnhub symbol mapping
// Free tier: US stocks + crypto only. Forex (OANDA) requires premium.
const SYMBOL_MAP: Record<string, string> = {
  BTCUSD: 'BINANCE:BTCUSDT',
  // Forex symbols below require Finnhub premium — kept for future upgrade
  // EURUSD: 'OANDA:EUR_USD',
  // GBPUSD: 'OANDA:GBP_USD',
  // USDJPY: 'OANDA:USD_JPY',
  // XAUUSD: 'OANDA:XAU_USD',
};

// Reverse map for incoming data
const REVERSE_MAP: Record<string, string> = {};
for (const [internal, finnhub] of Object.entries(SYMBOL_MAP)) {
  REVERSE_MAP[finnhub] = internal;
}

function connect(symbols: string[]) {
  if (!env.FINNHUB_API_KEY) {
    console.log('[finnhub-ws] no API key, skipping');
    return;
  }

  const url = `wss://ws.finnhub.io?token=${env.FINNHUB_API_KEY}`;

  ws = new WebSocket(url);

  ws.on('open', () => {
    isConnected = true;
    console.log('[finnhub-ws] connected');
    // Subscribe to each symbol
    for (const sym of symbols) {
      const finnhubSym = SYMBOL_MAP[sym];
      if (finnhubSym && ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'subscribe', symbol: finnhubSym }));
      }
    }
  });

  ws.on('message', (data: Buffer) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'trade' && Array.isArray(msg.data)) {
        for (const trade of msg.data) {
          const internal = REVERSE_MAP[trade.s];
          if (internal) {
            latestPrices.set(internal, { price: trade.p, ts: trade.t });
          }
        }
      }
    } catch { /* ignore malformed messages */ }
  });

  ws.on('close', () => {
    isConnected = false;
    console.log('[finnhub-ws] disconnected, reconnecting in 5s...');
    scheduleReconnect(symbols);
  });

  ws.on('error', (err) => {
    console.warn('[finnhub-ws] error:', err.message);
    ws?.close();
  });
}

function scheduleReconnect(symbols: string[]) {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect(symbols);
  }, 5000);
}

export function startFinnhubWs(symbols: string[]) {
  connect(symbols);
}

export function getFinnhubPrice(symbol: string): { price: number; ts: number } | null {
  return latestPrices.get(symbol) ?? null;
}

export function isFinnhubConnected(): boolean {
  return isConnected;
}

export function stopFinnhubWs() {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  ws?.close();
  ws = null;
  isConnected = false;
}
