import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../common/asyncHandler';
import { validate } from '../../common/validate';
import { authGuard } from '../../middleware/auth';
import * as svc from './wallet.service';

const r = Router();
r.use(authGuard);

r.get('/', asyncHandler(async (req, res) => {
  const userId = req.user!.sub;
  res.json(await svc.getWallet(userId));
}));

r.post('/deposit', validate(z.object({ amount: z.number().positive() })), asyncHandler(async (req, res) => {
  const userId = req.user!.sub;
  res.json(await svc.deposit(userId, req.body.amount));
}));

r.post('/withdraw', validate(z.object({ amount: z.number().positive() })), asyncHandler(async (req, res) => {
  const userId = req.user!.sub;
  res.json(await svc.withdraw(userId, req.body.amount));
}));

export default r;
