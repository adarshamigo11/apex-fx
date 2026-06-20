// ============================================================================
//  engine.ts — Internal paper-trading execution engine (pure functions)
//
//  All money math is in account currency (USD). Pure & unit-testable so the
//  same logic can later wrap an MT5/broker adapter without changing callers.
// ============================================================================

export interface SymbolSpec {
  name: string;
  kind: 'FOREX' | 'METAL' | 'INDEX' | 'CRYPTO';
  base: string;
  quote: string;          // account currency conversion handled vs USD
  contractSize: number;   // units per 1.0 lot (FX=100000, XAU=100, indices=1, BTC=1)
  digits: number;
  spreadPoints: number;   // spread in points (1 point = 10^-digits)
  commission: number;     // per lot per side
  marginPercent?: number; // optional override (e.g. 0.5 => 0.5% required)
}

export interface Quote {
  bid: number;
  ask: number;
}

export type Side = 'BUY' | 'SELL';
export type OrderKind = 'MARKET' | 'BUY_LIMIT' | 'SELL_LIMIT' | 'BUY_STOP' | 'SELL_STOP';

export interface OpenPositionState {
  side: Side;
  lots: number;
  openPrice: number;
  marginUsed: number;
  commission: number;
  swap: number;
  symbol: SymbolSpec;
  stopLoss?: number | null;
  takeProfit?: number | null;
}

export interface AccountSnapshot {
  balance: number;
  equity: number;
  usedMargin: number;
  freeMargin: number;
  marginLevel: number; // percent; Infinity when no used margin
  floatingPnL: number;
}

// 1 point in price terms
export function pointSize(spec: SymbolSpec): number {
  return Math.pow(10, -spec.digits);
}

// Apply admin-configured spread around a raw mid/bid feed.
// Many feeds give a single price; we synthesize bid/ask from spreadPoints.
export function applySpread(raw: number, spec: SymbolSpec): Quote {
  const half = (spec.spreadPoints * pointSize(spec)) / 2;
  return { bid: round(raw - half, spec.digits), ask: round(raw + half, spec.digits) };
}

export function spreadValue(q: Quote, spec: SymbolSpec): number {
  return round((q.ask - q.bid) / pointSize(spec), 1); // in points
}

// Execution price for a market order: BUY at ask, SELL at bid.
export function executionPrice(side: Side, q: Quote): number {
  return side === 'BUY' ? q.ask : q.bid;
}

// ---------------------------------------------------------------------------
//  MARGIN
//  notional = lots * contractSize * priceInUSD
//  required margin = notional / leverage  (or notional * marginPercent/100)
//  For pairs where quote != USD a conversion is applied; here we treat the
//  USD-quoted majors directly and convert via the provided usdRate for others.
// ---------------------------------------------------------------------------
export function requiredMargin(
  spec: SymbolSpec,
  lots: number,
  price: number,
  leverage: number,
  usdRate = 1, // price of 1 unit of base in USD if quote != USD; default 1
): number {
  const notionalUSD = lots * spec.contractSize * price * usdRate;
  if (spec.marginPercent && spec.marginPercent > 0) {
    return round((notionalUSD * spec.marginPercent) / 100, 2);
  }
  return round(notionalUSD / leverage, 2);
}

// ---------------------------------------------------------------------------
//  PROFIT / LOSS for an open position at the current quote.
//  BUY closes at bid, SELL closes at ask.
//  pnl = (closePrice - openPrice) * direction * lots * contractSize * usdRate
// ---------------------------------------------------------------------------
export function positionPnL(pos: OpenPositionState, q: Quote, usdRate = 1): number {
  const closePrice = pos.side === 'BUY' ? q.bid : q.ask;
  const dir = pos.side === 'BUY' ? 1 : -1;
  const gross = (closePrice - pos.openPrice) * dir * pos.lots * pos.symbol.contractSize * usdRate;
  return round(gross - pos.commission + pos.swap, 2);
}

// ---------------------------------------------------------------------------
//  ACCOUNT AGGREGATION
// ---------------------------------------------------------------------------
export function buildSnapshot(
  balance: number,
  positions: { pos: OpenPositionState; quote: Quote; usdRate?: number }[],
): AccountSnapshot {
  let floating = 0;
  let used = 0;
  for (const p of positions) {
    floating += positionPnL(p.pos, p.quote, p.usdRate ?? 1);
    used += p.pos.marginUsed;
  }
  const equity = round(balance + floating, 2);
  const freeMargin = round(equity - used, 2);
  const marginLevel = used > 0 ? round((equity / used) * 100, 2) : Infinity;
  return {
    balance: round(balance, 2),
    equity,
    usedMargin: round(used, 2),
    freeMargin,
    marginLevel,
    floatingPnL: round(floating, 2),
  };
}

// ---------------------------------------------------------------------------
//  RISK-BASED LOT SIZING
//  Given risk % of equity and SL distance, return suggested lots.
//  riskAmount = equity * risk%/100
//  lossPerLot = |open - SL| * contractSize * usdRate
// ---------------------------------------------------------------------------
export function lotsForRisk(
  spec: SymbolSpec,
  equity: number,
  riskPercent: number,
  entry: number,
  stopLoss: number,
  usdRate = 1,
): number {
  const slDist = Math.abs(entry - stopLoss);
  if (slDist <= 0) return 0;
  const riskAmount = (equity * riskPercent) / 100;
  const lossPerLot = slDist * spec.contractSize * usdRate;
  if (lossPerLot <= 0) return 0;
  return round(riskAmount / lossPerLot, 2);
}

// ---------------------------------------------------------------------------
//  SL / TP HIT DETECTION  (evaluate on each tick)
// ---------------------------------------------------------------------------
export function shouldHitStopLoss(pos: OpenPositionState, q: Quote): boolean {
  if (pos.stopLoss == null) return false;
  // BUY exits at bid; SL below entry. SELL exits at ask; SL above entry.
  return pos.side === 'BUY' ? q.bid <= pos.stopLoss : q.ask >= pos.stopLoss;
}

export function shouldHitTakeProfit(pos: OpenPositionState, q: Quote): boolean {
  if (pos.takeProfit == null) return false;
  return pos.side === 'BUY' ? q.bid >= pos.takeProfit : q.ask <= pos.takeProfit;
}

// ---------------------------------------------------------------------------
//  PENDING ORDER TRIGGER
//  Limit: price returns to a better level. Stop: price breaks through.
// ---------------------------------------------------------------------------
export function shouldTriggerPending(kind: OrderKind, trigger: number, q: Quote): boolean {
  switch (kind) {
    case 'BUY_LIMIT':  return q.ask <= trigger; // buy when ask drops to/below
    case 'SELL_LIMIT': return q.bid >= trigger; // sell when bid rises to/above
    case 'BUY_STOP':   return q.ask >= trigger; // buy on breakout up
    case 'SELL_STOP':  return q.bid <= trigger; // sell on breakdown
    default: return false;
  }
}

// ---------------------------------------------------------------------------
//  MARGIN CALL / STOP OUT
//  Levels are configurable (percent). Returns the most severe state.
// ---------------------------------------------------------------------------
export interface MarginLevels {
  warn70: number;   // soft warning, default 100? config — here name is illustrative
  marginCall: number; // default 100
  stopOut: number;    // default 50
}

export type MarginState = 'OK' | 'WARNING' | 'MARGIN_CALL' | 'STOP_OUT';

export function evaluateMargin(snap: AccountSnapshot, levels: MarginLevels): MarginState {
  if (snap.usedMargin <= 0) return 'OK';
  const ml = snap.marginLevel;
  if (ml <= levels.stopOut) return 'STOP_OUT';
  if (ml <= levels.marginCall) return 'MARGIN_CALL';
  if (ml <= levels.warn70) return 'WARNING';
  return 'OK';
}

// When stop-out triggers, the engine closes the most-losing positions until
// the margin level recovers above the stop-out threshold.
export function selectStopOutCandidates(
  positions: { id: string; pnl: number }[],
): string[] {
  return [...positions].sort((a, b) => a.pnl - b.pnl).map((p) => p.id); // worst first
}

// ---------------------------------------------------------------------------
//  helpers
// ---------------------------------------------------------------------------
export function round(n: number, digits = 2): number {
  const f = Math.pow(10, digits);
  return Math.round((n + Number.EPSILON) * f) / f;
}

export function commissionFor(spec: SymbolSpec, lots: number): number {
  // per lot per side; charged on open and close
  return round(spec.commission * lots, 2);
}
