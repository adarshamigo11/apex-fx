import { Router } from 'express';
import { z } from 'zod';
import * as svc from './auth.service';
import { asyncHandler } from '../../common/asyncHandler';
import { validate } from '../../common/validate';
import { authLimiter } from '../../middleware/rateLimit';
import { authGuard } from '../../middleware/auth';

const r = Router();
const ctx = (req: any) => ({ ip: req.ip, ua: req.headers['user-agent'] });

r.post('/register', authLimiter, validate(z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be 8+ chars'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  referredByCode: z.string().optional(),
})), asyncHandler(async (req, res) => res.status(201).json(await svc.register(req.body))));

r.post('/login', authLimiter, validate(z.object({
  email: z.string().email(), password: z.string().min(1),
})), asyncHandler(async (req, res) => res.json(await svc.login(req.body.email, req.body.password, ctx(req)))));

r.post('/refresh', validate(z.object({ refreshToken: z.string() })),
  asyncHandler(async (req, res) => res.json(await svc.refresh(req.body.refreshToken, ctx(req)))));

r.post('/logout', validate(z.object({ refreshToken: z.string() })),
  asyncHandler(async (req, res) => { await svc.logout(req.body.refreshToken); res.json({ ok: true }); }));

r.get('/me', authGuard, asyncHandler(async (req, res) => res.json(req.user)));

export default r;
