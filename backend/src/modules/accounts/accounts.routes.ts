import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../common/asyncHandler';
import { validate } from '../../common/validate';
import { authGuard } from '../../middleware/auth';
import * as svc from './accounts.service';

const r = Router();

// ── Public endpoints (no auth required) ──────────────────────────────────

// GET /types — All enabled account types
r.get('/types', asyncHandler(async (_req, res) => {
  res.json(await svc.getAvailableAccountTypes());
}));

// GET /types/live — Only LIVE account types (for Create Account flow)
r.get('/types/live', asyncHandler(async (_req, res) => {
  res.json(await svc.getLiveAccountTypes());
}));

// GET /types/demo — Only DEMO account types
r.get('/types/demo', asyncHandler(async (_req, res) => {
  res.json(await svc.getDemoAccountTypes());
}));

// ── Authenticated endpoints ──────────────────────────────────────────────
r.use(authGuard);

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
