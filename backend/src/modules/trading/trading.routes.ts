import { Router } from 'express';
import { z } from 'zod';
import * as svc from './trading.service';
import { fetchCandles } from '../marketdata/marketdata.service';
import { getAccount } from '../accounts/accounts.service';
import { asyncHandler } from '../../common/asyncHandler';
import { validate } from '../../common/validate';
import { authGuard } from '../../middleware/auth';

const r = Router();

// Public routes — no auth required
r.get('/candles/:symbol/:tf',
  asyncHandler(async (req, res) => res.json(await fetchCandles(req.params.symbol, req.params.tf, 300))));

// Auth-required routes below
r.use(authGuard);

r.get('/accounts/:id/snapshot', asyncHandler(async (req, res) => {
  await getAccount(req.user!.sub, req.params.id);
  res.json(await svc.accountSnapshot(req.params.id));
}));

r.post('/accounts/:id/orders/market', validate(z.object({
  symbol: z.string(), side: z.enum(['BUY', 'SELL']), lots: z.number().positive(),
  stopLoss: z.number().optional(), takeProfit: z.number().optional(), comment: z.string().optional(),
})), asyncHandler(async (req, res) => {
  await getAccount(req.user!.sub, req.params.id);
  res.status(201).json(await svc.placeMarketOrder(req.params.id, req.body));
}));

r.post('/positions/:id/close',
  asyncHandler(async (req, res) => res.json(await svc.closePosition(req.params.id))));

r.get('/accounts/:id/analytics', asyncHandler(async (req, res) => {
  await getAccount(req.user!.sub, req.params.id);
  res.json(await svc.analytics(req.params.id));
}));

export default r;
