// ============================================================================
//  priceFeed.ts — Rate-aware real-time price feed.
//  Priority: Finnhub WS (real-time crypto) → Twelve Data REST (throttled) →
//            Binance REST (crypto) → exchangerate-api (forex, free) → Mock.
//  Twelve Data free tier = 800 calls/day → poll every 30s per symbol = ~12/min.
// ============================================================================
import { Server } from 'socket.io';
import { redis } from '../config/redis';
import { DEFAULT_SYMBOLS } from '../modules/marketdata/symbols';
import { fetchQuote } from '../modules/marketdata/marketdata.service';
import { applySpread, spreadValue } from '../modules/trading/engine';
import { startFinnhubWs, getFinnhubPrice, isFinnhubConnected } from './finnhubWs';

// In-memory price cache per symbol
interface CachedPrice { price: number; ts: number; source: string; }
const priceCache: Map<string, CachedPrice> = new Map();
const CACHE_TTL_MS = 60_000; // use cached price for 60s after fetch

// Per-symbol last fetch time for Twelve Data rate limiting
const lastFetch: Record<string, number> = {};
const TWELVE_POLL_INTERVAL = 30_000; // poll each TD symbol every 30s = ~12 calls/min for 6 symbols

const dailyExtremes: Record<string, { high: number; low: number }> = {};

// Free forex quote source (exchangerate.host - no key needed)
const FREE_FOREX_MAP: Record<string, string> = {
  EURUSD: 'EUR/USD', GBPUSD: 'GBP/USD', USDJPY: 'USD/JPY',
};

async function fetchFreeForexQuote(symbol: string): Promise<{ price: number; ts: number } | null> {
  const pair = FREE_FOREX_MAP[symbol];
  if (!pair) return null;
  try {
    const r = await fetch(`https://api.exchangerate.host/latest?base=${pair.split('/')[0]}&symbols=${pair.split('/')[1]}`);
    if (r.ok) {
      const j: any = await r.json();
      const cur = pair.split('/')[1];
      const rate = j?.rates?.[cur];
      if (rate && typeof rate === 'number') return { price: rate, ts: Date.now() };
    }
  } catch { /* fall through */ }
  return null;
}

export function startPriceFeed(io: Server, intervalMs = 1000) {
  // Start Finnhub WebSocket for real-time crypto streaming
  const symbolNames = DEFAULT_SYMBOLS.map((s) => s.name);
  startFinnhubWs(symbolNames);

  setInterval(async () => {
    const updates = await Promise.all(DEFAULT_SYMBOLS.map(async (spec) => {
      try {
        let rawPrice: number | null = null;
        let ts = Date.now();
        let source = 'mock';

        // Priority 1: Finnhub real-time WebSocket (crypto)
        const finnhubData = getFinnhubPrice(spec.name);
        if (finnhubData && (Date.now() - finnhubData.ts) < 30_000) {
          rawPrice = finnhubData.price;
          ts = finnhubData.ts;
          source = 'finnhub';
        }

        // Priority 2: FCS API for forex/commodities (rate-limited: every 30s)
        if (rawPrice === null && spec.source === 'fcsapi') {
          const now = Date.now();
          const last = lastFetch[spec.name] ?? 0;

          if (now - last >= TWELVE_POLL_INTERVAL) {
            try {
              const raw = await fetchQuote(spec.name);
              rawPrice = raw.price;
              ts = raw.ts;
              source = 'fcsapi';
              priceCache.set(spec.name, { price: raw.price, ts: raw.ts, source });
              lastFetch[spec.name] = now;
            } catch { /* fcsapi failed, use cache */ }
          }

          // Use cached price between polls
          if (rawPrice === null) {
            const cached = priceCache.get(spec.name);
            if (cached && (now - cached.ts) < CACHE_TTL_MS) {
              rawPrice = cached.price;
              ts = cached.ts;
              source = cached.source;
            }
          }
        }

        // Priority 3: Twelve Data REST (rate-limited: every 30s per symbol)
        if (rawPrice === null && spec.source === 'twelvedata') {
          const now = Date.now();
          const last = lastFetch[spec.name] ?? 0;

          if (now - last >= TWELVE_POLL_INTERVAL) {
            try {
              const raw = await fetchQuote(spec.name);
              rawPrice = raw.price;
              ts = raw.ts;
              source = 'twelvedata';
              priceCache.set(spec.name, { price: raw.price, ts: raw.ts, source });
              lastFetch[spec.name] = now;
            } catch { /* TD failed, use cache */ }
          }

          // Use cached price between polls
          if (rawPrice === null) {
            const cached = priceCache.get(spec.name);
            if (cached && (now - cached.ts) < CACHE_TTL_MS) {
              rawPrice = cached.price;
              ts = cached.ts;
              source = cached.source;
            }
          }
        }

        // Priority 3: Binance for crypto (always free)
        if (rawPrice === null && spec.source === 'binance') {
          try {
            const raw = await fetchQuote(spec.name);
            rawPrice = raw.price;
            ts = raw.ts;
            source = 'binance';
          } catch { /* Binance failed */ }
        }

        // Priority 4: Free forex API (exchangerate.host) for major pairs
        if (rawPrice === null && FREE_FOREX_MAP[spec.name]) {
          const free = await fetchFreeForexQuote(spec.name);
          if (free) {
            rawPrice = free.price;
            ts = free.ts;
            source = 'exchangerate';
          }
        }

        // Priority 5: Mock random walk (last resort)
        if (rawPrice === null) {
          const raw = await fetchQuote(spec.name);
          rawPrice = raw.price;
          ts = raw.ts;
          source = 'mock';
        }

        const q = applySpread(rawPrice, spec);
        const ex = (dailyExtremes[spec.name] ??= { high: rawPrice, low: rawPrice });
        ex.high = Math.max(ex.high, q.ask); ex.low = Math.min(ex.low, q.bid);
        const payload = {
          symbol: spec.name, bid: q.bid, ask: q.ask,
          spread: spreadValue(q, spec), high: ex.high, low: ex.low, ts, source,
        };
        await redis.set(`price:${spec.name}`, JSON.stringify(payload), { EX: 10 }).catch(() => {});
        return payload;
      } catch { return null; }
    }));
    const live = updates.filter(Boolean);
    if (live.length) io.to('market').emit('prices', live);
  }, intervalMs);

  // Log connection status
  setTimeout(() => {
    console.log(`[price-feed] finnhub ws: ${isFinnhubConnected() ? 'CONNECTED' : 'disconnected'}`);
    console.log(`[price-feed] twelve-data polling: every ${TWELVE_POLL_INTERVAL / 1000}s per symbol (~${Math.round((60_000 / TWELVE_POLL_INTERVAL) * DEFAULT_SYMBOLS.filter(s => s.source === 'twelvedata').length)} calls/min)`);
  }, 3000);
}
