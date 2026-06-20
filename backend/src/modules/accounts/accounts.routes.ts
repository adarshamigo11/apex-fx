import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../common/asyncHandler';
import { validate } from '../../common/validate';
import { authGuard } from '../../middleware/auth';
import * as svc from './accounts.service';

const r = Router();
r.use(authGuard);

// GET available account types (admin-configured)
r.get('/types', asyncHandler(async (_req, res) => {
  res.json(await svc.getAvailableAccountTypes());
}));

r.get('/', asyncHandler(async (req, res) => {
  res.json(await svc.listAccounts(req.user!.sub));
}));

r.post('/', validate(z.object({
  accountTypeId: z.string().min(1, 'Account type is required'),
  leverage: z.number().int().positive().max(2000).optional(),
  currency: z.string().length(3).optional(),
})), asyncHandler(async (req, res) => {
  res.status(201).json(await svc.createAccount(req.user!.sub, req.body));
}));

r.get('/:id', asyncHandler(async (req, res) => {
  res.json(await svc.getAccount(req.user!.sub, req.params.id));
}));

export default r;
