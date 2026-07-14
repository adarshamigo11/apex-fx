import { Router } from 'express';
import { z } from 'zod';
import * as svc from './auth.service';
import { asyncHandler } from '../../common/asyncHandler';
import { validate } from '../../common/validate';
import { authLimiter } from '../../middleware/rateLimit';
import { authGuard } from '../../middleware/auth';

const r = Router();
const ctx = (req: any) => ({ ip: req.ip, ua: req.headers['user-agent'] });

// ────────────────────────────────────────────────────────────────────────────
//  Registration endpoints
// ────────────────────────────────────────────────────────────────────────────

// POST /register/demo — Demo account registration (auto-creates demo account)
r.post('/register/demo', authLimiter, validate(z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be 8+ chars'),
  fullName: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  country: z.string().optional(),
  referredByCode: z.string().optional(),
})), asyncHandler(async (req, res) => {
  res.status(201).json(await svc.registerDemo(req.body, ctx(req)));
}));

// POST /register/live — Live account registration (with account type selection)
r.post('/register/live', authLimiter, validate(z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be 8+ chars'),
  fullName: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  country: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  accountTypeId: z.string().min(1, 'Account type is required'),
  leverage: z.number().int().positive().max(2000).optional(),
  currency: z.string().length(3).optional(),
  referredByCode: z.string().optional(),
})), asyncHandler(async (req, res) => {
  res.status(201).json(await svc.registerLive(req.body, ctx(req)));
}));

// POST /register — Legacy registration (backward compat)
r.post('/register', authLimiter, validate(z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be 8+ chars'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  referredByCode: z.string().optional(),
})), asyncHandler(async (req, res) => res.status(201).json(await svc.register(req.body))));

// ────────────────────────────────────────────────────────────────────────────
//  Authentication endpoints
// ────────────────────────────────────────────────────────────────────────────

// POST /login — Universal login (email or phone)
r.post('/login', authLimiter, validate(z.object({
  identifier: z.string().min(1, 'Email or phone is required'),
  password: z.string().min(1),
})), asyncHandler(async (req, res) => {
  res.json(await svc.login(req.body.identifier, req.body.password, ctx(req)));
}));

// POST /refresh — Refresh access token
r.post('/refresh', validate(z.object({ refreshToken: z.string() })),
  asyncHandler(async (req, res) => res.json(await svc.refresh(req.body.refreshToken, ctx(req)))));

// POST /logout — Logout and revoke refresh token
r.post('/logout', validate(z.object({ refreshToken: z.string() })),
  asyncHandler(async (req, res) => { await svc.logout(req.body.refreshToken); res.json({ ok: true }); }));

// GET /me — Get current user info
r.get('/me', authGuard, asyncHandler(async (req, res) => res.json(req.user)));

// GET /profile — Get full user profile with accounts
r.get('/profile', authGuard, asyncHandler(async (req, res) => {
  res.json(await svc.getProfile(req.user!.sub));
}));

// ────────────────────────────────────────────────────────────────────────────
//  Account operations (authenticated)
// ────────────────────────────────────────────────────────────────────────────

// POST /switch-account — Switch active trading account
r.post('/switch-account', authGuard, validate(z.object({
  accountId: z.string().min(1),
})), asyncHandler(async (req, res) => {
  res.json(await svc.switchAccount(req.user!.sub, req.body.accountId));
}));

// POST /upgrade-demo — Upgrade from demo to live account
r.post('/upgrade-demo', authGuard, validate(z.object({
  accountTypeId: z.string().min(1),
  leverage: z.number().int().positive().max(2000).optional(),
  currency: z.string().length(3).optional(),
})), asyncHandler(async (req, res) => {
  res.status(201).json(await svc.upgradeDemoToLive(req.user!.sub, req.body, ctx(req)));
}));

// ────────────────────────────────────────────────────────────────────────────
//  Password recovery
// ────────────────────────────────────────────────────────────────────────────

// POST /forgot-password — Request password reset
r.post('/forgot-password', authLimiter, validate(z.object({
  identifier: z.string().min(1, 'Email or phone is required'),
})), asyncHandler(async (req, res) => {
  res.json(await svc.forgotPassword(req.body.identifier));
}));

// POST /reset-password — Reset password with token
r.post('/reset-password', authLimiter, validate(z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8, 'Password must be 8+ chars'),
})), asyncHandler(async (req, res) => {
  res.json(await svc.resetPassword(req.body.token, req.body.newPassword));
}));

export default r;
