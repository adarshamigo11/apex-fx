import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../common/asyncHandler';
import { validate } from '../../common/validate';
import { otpRequestLimiter, otpVerifyLimiter } from '../../middleware/rateLimit';
import * as otp from './otp.service';
import * as auth from '../auth/auth.service';

const r = Router();
const ctx = (req: any) => ({ ip: req.ip, ua: req.headers['user-agent'] });
const email = z.string().email();
const code = z.string().regex(/^\d{6}$/, 'Code must be 6 digits');
// generic response avoids leaking whether an account exists
const GENERIC = { message: 'If the details are valid, a code has been sent.' };

// ---------- REGISTER: verify email ownership ----------
r.post('/register/request', otpRequestLimiter, validate(z.object({ email })),
  asyncHandler(async (req, res) => {
    await otp.requestOtp({ identifier: req.body.email, purpose: 'REGISTER', channel: 'EMAIL', ip: req.ip });
    res.json({ ...GENERIC, expiresInSec: 300, resendInSec: 60 });
  }));

r.post('/register/verify', otpVerifyLimiter, validate(z.object({ email, code })),
  asyncHandler(async (req, res) => {
    await otp.verifyOtp({ identifier: req.body.email, purpose: 'REGISTER', code: req.body.code });
    await auth.markEmailVerified(req.body.email);
    res.json({ verified: true });
  }));

// ---------- LOGIN: password + OTP (step-up) ----------
r.post('/login/request', otpRequestLimiter, validate(z.object({ email, password: z.string().min(1) })),
  asyncHandler(async (req, res) => {
    const user = await auth.checkPassword(req.body.email, req.body.password);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.status === 'BANNED' || user.status === 'SUSPENDED') return res.status(401).json({ error: 'Account not active' });
    await otp.requestOtp({ identifier: req.body.email, purpose: 'LOGIN', channel: 'EMAIL', ip: req.ip });
    res.json({ otpRequired: true, expiresInSec: 300, resendInSec: 60 });
  }));

r.post('/login/verify', otpVerifyLimiter, validate(z.object({ email, code })),
  asyncHandler(async (req, res) => {
    await otp.verifyOtp({ identifier: req.body.email, purpose: 'LOGIN', code: req.body.code });
    const user = await auth.findByEmail(req.body.email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    res.json(await auth.issueTokensForUser(user, ctx(req)));
  }));

// ---------- PASSWORD RESET ----------
r.post('/password/request', otpRequestLimiter, validate(z.object({ email })),
  asyncHandler(async (req, res) => {
    const user = await auth.findByEmail(req.body.email);
    if (user) await otp.requestOtp({ identifier: req.body.email, purpose: 'PASSWORD_RESET', channel: 'EMAIL', ip: req.ip });
    res.json(GENERIC); // never reveal account existence
  }));

r.post('/password/reset', otpVerifyLimiter, validate(z.object({ email, code, newPassword: z.string().min(8) })),
  asyncHandler(async (req, res) => {
    await otp.verifyOtp({ identifier: req.body.email, purpose: 'PASSWORD_RESET', code: req.body.code });
    const user = await auth.findByEmail(req.body.email);
    if (!user) return res.status(400).json({ error: 'Invalid request' });
    await auth.setPassword(user._id!.toString(), req.body.newPassword);
    res.json({ reset: true });
  }));

// ---------- generic resend/status (for UI timers) ----------
r.post('/status', validate(z.object({ email, purpose: z.enum(['REGISTER', 'LOGIN', 'PASSWORD_RESET']) })),
  asyncHandler(async (req, res) => res.json(await otp.otpStatus(req.body.email, req.body.purpose))));

export default r;
