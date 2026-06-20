// ============================================================================
//  trading.service.ts — MongoDB native driver + aggregation pipelines.
//  Engine math stays pure; persistence + joins use $lookup aggregation.
// ============================================================================
import { ObjectId } from 'mongodb';
import { col, COL, nextSequence, oid } from '../../db/collections';
import { TradingAccountDoc, PositionDoc } from '../../db/models';
import { env } from '../../config/env';
import { badRequest, notFound } from '../../common/errors';
import * as engine from './engine';
import { DEFAULT_SYMBOLS } from '../marketdata/symbols';
import { fetchQuote } from '../marketdata/marketdata.service';

function specOf(name: string): engine.SymbolSpec {
  const s = DEFAULT_SYMBOLS.find((x) => x.name === name);
  if (!s) throw badRequest(`Unknown symbol ${name}`);
  return s;
}
async function quoteOf(name: string): Promise<engine.Quote> {
  const raw = await fetchQuote(name);
  return engine.applySpread(raw.price, specOf(name));
}

export async function placeMarketOrder(accountId: string, input: {
  symbol: string; side: engine.Side; lots: number; stopLoss?: number; takeProfit?: number; comment?: string;
}) {
  const account = await col<TradingAccountDoc>(COL.tradingAccounts).findOne({ _id: oid(accountId) });
  if (!account) throw notFound('Account not found');
  const symbol = await col(COL.symbols).findOne({ name: input.symbol, enabled: true });
  if (!symbol) throw badRequest('Symbol not enabled');

  const spec = specOf(input.symbol);
  const q = await quoteOf(input.symbol);
  const price = engine.executionPrice(input.side, q);
  const margin = engine.requiredMargin(spec, input.lots, price, account.leverage);

  const snap = await accountSnapshot(accountId);
  if (margin > snap.freeMargin) throw badRequest('Not enough free margin');

  const ticket = await nextSequence('position');
  const doc: PositionDoc = {
    ticket, accountId: account._id!, symbolName: input.symbol, side: input.side, status: 'OPEN',
    lots: input.lots, openPrice: price, stopLoss: input.stopLoss ?? null, takeProfit: input.takeProfit ?? null,
    marginUsed: margin, commission: engine.commissionFor(spec, input.lots), swap: 0,
    comment: input.comment, openTime: new Date(),
  };
  const { insertedId } = await col<PositionDoc>(COL.positions).insertOne(doc);
  return { ...doc, _id: insertedId };
}

// Multi-document ACID transaction (Atlas replica set).
export async function closePosition(positionId: string, reason: string = 'MANUAL') {
  const pos = await col<PositionDoc>(COL.positions).findOne({ _id: oid(positionId) });
  if (!pos || pos.status === 'CLOSED') throw notFound('Position not open');

  const spec = specOf(pos.symbolName);
  const q = await quoteOf(pos.symbolName);
  const state: engine.OpenPositionState = {
    side: pos.side, lots: pos.lots, openPrice: pos.openPrice, marginUsed: pos.marginUsed,
    commission: pos.commission, swap: pos.swap, symbol: spec, stopLoss: pos.stopLoss, takeProfit: pos.takeProfit,
  };
  const profit = engine.positionPnL(state, q);
  const closePrice = pos.side === 'BUY' ? q.bid : q.ask;

  const { getClient } = await import('../../config/mongo');
  const session = getClient().startSession();
  try {
    await session.withTransaction(async () => {
      await col(COL.positions).updateOne({ _id: pos._id }, { $set: { status: 'CLOSED' } }, { session });
      await col(COL.tradingAccounts).updateOne({ _id: pos.accountId }, { $inc: { balance: profit } }, { session });
      await col(COL.tradeHistory).insertOne({
        ticket: pos.ticket, accountId: pos.accountId, symbolName: pos.symbolName, positionId: pos._id,
        side: pos.side, lots: pos.lots, openPrice: pos.openPrice, closePrice,
        stopLoss: pos.stopLoss, takeProfit: pos.takeProfit, profit, commission: pos.commission, swap: pos.swap,
        closeReason: reason, openTime: pos.openTime, closeTime: new Date(),
      } as any, { session });
    });
  } finally { await session.endSession(); }
  return { ticket: pos.ticket, profit, closePrice };
}

// AGGREGATION PIPELINE: join open positions with their symbol metadata.
export async function accountSnapshot(accountId: string): Promise<engine.AccountSnapshot> {
  const account = await col<TradingAccountDoc>(COL.tradingAccounts).findOne({ _id: oid(accountId) });
  if (!account) throw notFound('Account not found');

  const positions = await col(COL.positions).aggregate([
    { $match: { accountId: account._id, status: 'OPEN' } },
    { $lookup: { from: COL.symbols, localField: 'symbolName', foreignField: 'name', as: 'sym' } },
    { $unwind: '$sym' },
    { $project: { side: 1, lots: 1, openPrice: 1, marginUsed: 1, commission: 1, swap: 1, symbolName: 1 } },
  ]).toArray();

  const enriched = await Promise.all(positions.map(async (p: any) => {
    const spec = specOf(p.symbolName);
    const q = await quoteOf(p.symbolName);
    const pos: engine.OpenPositionState = {
      side: p.side, lots: p.lots, openPrice: p.openPrice, marginUsed: p.marginUsed,
      commission: p.commission, swap: p.swap, symbol: spec,
    };
    return { pos, quote: q };
  }));
  return engine.buildSnapshot(account.balance, enriched);
}

// AGGREGATION PIPELINE: trade analytics ($facet for parallel sub-aggregations).
export async function analytics(accountId: string) {
  const [res] = await col(COL.tradeHistory).aggregate([
    { $match: { accountId: oid(accountId) } },
    { $facet: {
      totals: [{ $group: { _id: null, totalTrades: { $sum: 1 }, grossProfit: { $sum: { $cond: [{ $gt: ['$profit', 0] }, '$profit', 0] } }, grossLoss: { $sum: { $cond: [{ $lt: ['$profit', 0] }, '$profit', 0] } }, net: { $sum: '$profit' } } }],
      wins: [{ $match: { profit: { $gt: 0 } } }, { $count: 'n' }],
      losses: [{ $match: { profit: { $lte: 0 } } }, { $count: 'n' }],
      equityCurve: [{ $sort: { closeTime: 1 } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$closeTime' } }, dayPnL: { $sum: '$profit' } } }, { $sort: { _id: 1 } }],
    } },
  ]).toArray() as any[];

  const totals = res?.totals?.[0] ?? { totalTrades: 0, grossProfit: 0, grossLoss: 0, net: 0 };
  const wins = res?.wins?.[0]?.n ?? 0;
  const losses = res?.losses?.[0]?.n ?? 0;
  const profitFactor = totals.grossLoss !== 0 ? Math.abs(totals.grossProfit / totals.grossLoss) : totals.grossProfit;
  return {
    totalTrades: totals.totalTrades, winningTrades: wins, losingTrades: losses,
    winRate: totals.totalTrades ? engine.round((wins / totals.totalTrades) * 100, 2) : 0,
    profitFactor: engine.round(profitFactor, 2), netProfit: engine.round(totals.net, 2),
    equityCurve: res?.equityCurve ?? [],
  };
}

export const marginLevels = { warn70: 70, marginCall: env.MARGIN_CALL_LEVEL, stopOut: env.STOP_OUT_LEVEL };
