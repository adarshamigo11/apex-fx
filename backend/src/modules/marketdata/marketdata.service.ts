// ============================================================================
//  marketdata.service.ts
//  FCS API (forex/commodities) + Binance (crypto) + Yahoo Finance (free) with MOCK fallback.
//  Priority: FCS API → Binance → Yahoo Finance (always free) → Mock random-walk.
// ============================================================================
import { DEFAULT_SYMBOLS, MOCK_PRICES } from './symbols';
import { env } from '../../config/env';

export interface RawQuote { symbol: string; price: number; ts: number; }
export interface OHLC { time: number; open: number; high: number; low: number; close: number; }

const TF_MS: Record<string, number> = {
  M1: 60_000, M5: 300_000, M15: 900_000, H1: 3_600_000, H4: 14_400_000, D1: 86_400_000,
};

const lastPrice: Record<string, number> = { ...MOCK_PRICES };

// ---- FCS API batch quote cache (free tier: 3 req/min) -----------------------
// Batch all forex symbols in one request, cache results for 30s
const fcsCache: Record<string, { price: number; ts: number }> = {};
let fcsBatchLastFetch = 0;
const FCS_BATCH_INTERVAL = 25_000; // fetch batch every 25s (stays within 3/min)

async function fetchFcsBatch(): Promise<void> {
  if (!env.FCS_API_KEY) return;
  const now = Date.now();
  if (now - fcsBatchLastFetch < FCS_BATCH_INTERVAL) return;
  fcsBatchLastFetch = now;
  try {
    // Batch forex symbols in one call
    const forexSymbols = DEFAULT_SYMBOLS.filter(s => s.source === 'fcsapi' && s.kind !== 'METAL').map(s => s.externalSymbol).join(',');
    if (forexSymbols) {
      const url = `https://api-v4.fcsapi.com/forex/latest?symbol=${forexSymbols}&access_key=${env.FCS_API_KEY}`;
      const r = await fetch(url);
      if (r.ok) {
        const j: any = await r.json();
        if (j.status !== false && j.response) {
          const items = Array.isArray(j.response) ? j.response : [j.response];
          for (const item of items) {
            const ticker = item?.profile?.symbol || item?.ticker;
            const price = parseFloat(item?.active?.c || item?.c || '0');
            if (ticker && price > 0) {
              // Map back to our symbol name
              const spec = DEFAULT_SYMBOLS.find(s => s.externalSymbol === ticker);
              if (spec) fcsCache[spec.name] = { price, ts: now };
            }
          }
        }
      }
    }
    // Separate call for commodities (gold)
    const commoditySymbols = DEFAULT_SYMBOLS.filter(s => s.source === 'fcsapi' && s.kind === 'METAL').map(s => s.externalSymbol).join(',');
    if (commoditySymbols) {
      const url = `https://api-v4.fcsapi.com/forex/latest?symbol=${commoditySymbols}&type=commodity&access_key=${env.FCS_API_KEY}`;
      const r = await fetch(url);
      if (r.ok) {
        const j: any = await r.json();
        if (j.status !== false && j.response) {
          const items = Array.isArray(j.response) ? j.response : [j.response];
          for (const item of items) {
            const ticker = item?.profile?.symbol || item?.ticker;
            const price = parseFloat(item?.active?.c || item?.c || '0');
            if (ticker && price > 0) {
              const spec = DEFAULT_SYMBOLS.find(s => s.externalSymbol === ticker);
              if (spec) fcsCache[spec.name] = { price, ts: now };
            }
          }
        }
      }
    }
  } catch { /* batch fetch failed */ }
}

async function fetchFcsApiQuote(symbolName: string, externalSymbol: string): Promise<{ price: number; ts: number } | null> {
  if (!env.FCS_API_KEY) return null;
  // Trigger batch fetch (rate-limited internally)
  await fetchFcsBatch();
  // Return from cache
  const cached = fcsCache[symbolName];
  if (cached && (Date.now() - cached.ts) < 60_000) return cached;
  return null;
}

// ---- FCS API candles (history) ----------------------------------------------
async function fetchFcsApiCandles(externalSymbol: string, timeframe: string, limit: number, isCommodity: boolean): Promise<OHLC[] | null> {
  if (!env.FCS_API_KEY) return null;
  try {
    const periodMap: Record<string, string> = {
      M1: '1m', M5: '5m', M15: '15m', H1: '1h', H4: '4h', D1: '1D',
    };
    const period = periodMap[timeframe] ?? '1h';
    const type = isCommodity ? '&type=commodity' : '';
    const url = `https://api-v4.fcsapi.com/forex/history?symbol=${externalSymbol}&period=${period}&length=${limit}${type}&access_key=${env.FCS_API_KEY}`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const j: any = await r.json();
    const data = j.response;
    if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) return null;
    // History response is object keyed by timestamp or array
    const candles: OHLC[] = [];
    if (Array.isArray(data)) {
      for (const c of data) {
        candles.push({
          time: parseInt(c.t) || Math.floor(Date.now() / 1000),
          open: parseFloat(c.o), high: parseFloat(c.h),
          low: parseFloat(c.l), close: parseFloat(c.c),
        });
      }
    } else {
      // Object keyed by timestamp
      for (const [key, c] of Object.entries(data) as [string, any][]) {
        candles.push({
          time: parseInt(c.t || key),
          open: parseFloat(c.o), high: parseFloat(c.h),
          low: parseFloat(c.l), close: parseFloat(c.c),
        });
      }
    }
    if (candles.length > 0) return candles.slice(-limit);
  } catch { /* fall through */ }
  return null;
}

// Yahoo Finance symbol map — free, no API key required
const YAHOO_SYMBOL_MAP: Record<string, string> = {
  XAUUSD: 'GC=F',       // Gold futures
  EURUSD: 'EURUSD=X',
  GBPUSD: 'GBPUSD=X',
  USDJPY: 'JPY=X',
  US30:   '^DJI',       // Dow Jones Industrial Average
  NAS100: '^IXIC',      // NASDAQ Composite
  BTCUSD: 'BTC-USD',
};

// ---- Yahoo Finance quote (single price) ------------------------------------
async function fetchYahooQuote(symbolName: string): Promise<{ price: number; ts: number } | null> {
  const yahooSym = YAHOO_SYMBOL_MAP[symbolName];
  if (!yahooSym) return null;
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=1m&range=1d`;
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!r.ok) return null;
    const j: any = await r.json();
    const result = j?.chart?.result?.[0];
    const price = result?.meta?.regularMarketPrice;
    if (typeof price === 'number' && price > 0) return { price, ts: Date.now() };
  } catch { /* fall through */ }
  return null;
}

// ---- Yahoo Finance candles -------------------------------------------------
async function fetchYahooCandles(symbolName: string, timeframe: string, limit: number): Promise<OHLC[] | null> {
  const yahooSym = YAHOO_SYMBOL_MAP[symbolName];
  if (!yahooSym) return null;
  try {
    // Yahoo uses different interval formats
    const intervalMap: Record<string, string> = {
      M1: '1m', M5: '5m', M15: '15m', H1: '1h', H4: '1h', D1: '1d',
    };
    const interval = intervalMap[timeframe] ?? '1h';
    // Yahoo limits range: 1m max 7d, 5m max 60d, 1h max 730d
    const rangeMap: Record<string, string> = {
      M1: '1d', M5: '5d', M15: '5d', H1: '1mo', H4: '6mo', D1: '1y',
    };
    const range = rangeMap[timeframe] ?? '1mo';
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=${interval}&range=${range}`;
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!r.ok) return null;
    const j: any = await r.json();
    const result = j?.chart?.result?.[0];
    if (!result?.timestamp || !result?.indicators?.quote?.[0]) return null;
    const ts: number[] = result.timestamp;
    const q = result.indicators.quote[0];
    const candles: OHLC[] = [];
    for (let i = 0; i < ts.length; i++) {
      if (q.open[i] == null || q.close[i] == null) continue;
      candles.push({
        time: ts[i],
        open: q.open[i], high: q.high[i] ?? q.open[i],
        low: q.low[i] ?? q.close[i], close: q.close[i],
      });
    }
    // For H4, aggregate 4 consecutive H1 candles
    if (timeframe === 'H4' && candles.length > 0) {
      const h4: OHLC[] = [];
      for (let i = 0; i < candles.length; i += 4) {
        const chunk = candles.slice(i, i + 4);
        if (chunk.length === 0) break;
        h4.push({
          time: chunk[0].time,
          open: chunk[0].open,
          high: Math.max(...chunk.map(c => c.high)),
          low: Math.min(...chunk.map(c => c.low)),
          close: chunk[chunk.length - 1].close,
        });
      }
      return h4.slice(-limit);
    }
    return candles.slice(-limit);
  } catch { /* fall through */ }
  return null;
}

// ---- live single quote -----------------------------------------------------
export async function fetchQuote(symbolName: string): Promise<RawQuote> {
  const spec = DEFAULT_SYMBOLS.find((s) => s.name === symbolName);
  if (!spec) throw new Error(`unknown symbol ${symbolName}`);
  try {
    // 1) FCS API for forex/commodities (primary source)
    if (spec.source === 'fcsapi') {
      const fcs = await fetchFcsApiQuote(symbolName, spec.externalSymbol);
      if (fcs) { lastPrice[symbolName] = fcs.price; return { symbol: symbolName, price: fcs.price, ts: fcs.ts }; }
    }
    // 2) Binance for crypto (always free)
    if (spec.source === 'binance') {
      const r = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${spec.externalSymbol}`);
      if (r.ok) { const j: any = await r.json(); const p = parseFloat(j.price); lastPrice[symbolName] = p; return { symbol: symbolName, price: p, ts: Date.now() }; }
    }
    // 3) Twelve Data for indices (rate-limited free tier)
    if (spec.source === 'twelvedata' && env.TWELVE_DATA_API_KEY) {
      const r = await fetch(`https://api.twelvedata.com/price?symbol=${encodeURIComponent(spec.externalSymbol)}&apikey=${env.TWELVE_DATA_API_KEY}`);
      if (r.ok) {
        const j: any = await r.json();
        if (j.price && !j.code) { const p = parseFloat(j.price); lastPrice[symbolName] = p; return { symbol: symbolName, price: p, ts: Date.now() }; }
      }
    }
    // 4) Yahoo Finance — free, no key, works for all symbols
    const yahoo = await fetchYahooQuote(symbolName);
    if (yahoo) { lastPrice[symbolName] = yahoo.price; return { symbol: symbolName, price: yahoo.price, ts: yahoo.ts }; }
  } catch (e) { /* fall through to mock */ }
  return mockTick(symbolName);
}

// ---- historical candles ----------------------------------------------------
export async function fetchCandles(symbolName: string, timeframe: string, limit = 300): Promise<OHLC[]> {
  const spec = DEFAULT_SYMBOLS.find((s) => s.name === symbolName);
  if (!spec) throw new Error(`unknown symbol ${symbolName}`);
  try {
    // 1) FCS API for forex/commodities
    if (spec.source === 'fcsapi') {
      const isCommodity = spec.kind === 'METAL';
      const fcs = await fetchFcsApiCandles(spec.externalSymbol, timeframe, limit, isCommodity);
      if (fcs && fcs.length > 0) return fcs;
    }
    // 2) Binance for crypto
    if (spec.source === 'binance') {
      const map: Record<string, string> = { M1:'1m',M5:'5m',M15:'15m',H1:'1h',H4:'4h',D1:'1d' };
      const r = await fetch(`https://api.binance.com/api/v3/klines?symbol=${spec.externalSymbol}&interval=${map[timeframe]}&limit=${limit}`);
      if (r.ok) { const rows: any[] = await r.json(); return rows.map((k) => ({ time: Math.floor(k[0]/1000), open:+k[1], high:+k[2], low:+k[3], close:+k[4] })); }
    }
    // 3) Twelve Data for indices
    if (spec.source === 'twelvedata' && env.TWELVE_DATA_API_KEY) {
      const map: Record<string,string> = { M1:'1min',M5:'5min',M15:'15min',H1:'1h',H4:'4h',D1:'1day' };
      const r = await fetch(`https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(spec.externalSymbol)}&interval=${map[timeframe]}&outputsize=${limit}&apikey=${env.TWELVE_DATA_API_KEY}`);
      if (r.ok) { const j: any = await r.json(); if (Array.isArray(j.values) && !j.code) return j.values.map((v: any) => ({ time: Math.floor(new Date(v.datetime).getTime()/1000), open:+v.open, high:+v.high, low:+v.low, close:+v.close })).reverse(); }
    }
    // 4) Yahoo Finance candles — free, no key
    const yahoo = await fetchYahooCandles(symbolName, timeframe, limit);
    if (yahoo && yahoo.length > 0) return yahoo;
  } catch (e) { /* fall through */ }
  return mockCandles(symbolName, timeframe, limit);
}

// ---- mock generators -------------------------------------------------------
function mockTick(symbolName: string): RawQuote {
  const base = lastPrice[symbolName] ?? MOCK_PRICES[symbolName] ?? 100;
  const vol = base * 0.0005; // 5 bps random walk
  const next = Math.max(0.00001, base + (Math.random() - 0.5) * 2 * vol);
  lastPrice[symbolName] = next;
  return { symbol: symbolName, price: next, ts: Date.now() };
}

function mockCandles(symbolName: string, timeframe: string, limit: number): OHLC[] {
  const step = TF_MS[timeframe] ?? 60_000;
  const now = Date.now();
  let price = MOCK_PRICES[symbolName] ?? 100;
  const out: OHLC[] = [];
  for (let i = limit; i > 0; i--) {
    const t = Math.floor((now - i * step) / 1000);
    const open = price;
    const drift = (Math.random() - 0.5) * price * 0.004;
    const close = Math.max(0.00001, open + drift);
    const high = Math.max(open, close) * (1 + Math.random() * 0.002);
    const low = Math.min(open, close) * (1 - Math.random() * 0.002);
    out.push({ time: t, open, high, low, close });
    price = close;
  }
  lastPrice[symbolName] = price;
  return out;
}

export function isLive(): boolean {
  return true; // Yahoo Finance is always available as live source
}
