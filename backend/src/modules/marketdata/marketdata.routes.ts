import { Router } from 'express';
import { redis } from '../../config/redis';
import { DEFAULT_SYMBOLS } from './symbols';
import { fetchCandles, isLive } from './marketdata.service';
import { asyncHandler } from '../../common/asyncHandler';

const r = Router();

r.get('/symbols', (_req, res) => res.json({ live: isLive(), symbols: DEFAULT_SYMBOLS }));

r.get('/prices', asyncHandler(async (_req, res) => {
  const out = await Promise.all(DEFAULT_SYMBOLS.map(async (s) => {
    const cached = await redis.get(`price:${s.name}`).catch(() => null);
    return cached ? JSON.parse(cached) : { symbol: s.name };
  }));
  res.json(out);
}));

r.get('/candles/:symbol/:tf', asyncHandler(async (req, res) =>
  res.json(await fetchCandles(req.params.symbol, req.params.tf, Number(req.query.limit) || 300))));

export default r;

r.get('/search', asyncHandler(async (req, res) =>
  res.json(await (await import('../../db/search')).searchSymbols(String(req.query.q ?? '')))));
