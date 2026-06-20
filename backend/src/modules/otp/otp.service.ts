// ============================================================================
//  otp.service.ts — secure OTP issue/verify (MongoDB Atlas native driver).
//  • 6-digit codes, bcrypt-HASHED at rest (never stored/returned in plaintext)
//  • 5-minute expiry (config) + TTL index auto-cleanup
//  • resend cooldown timer + max sends per code lifecycle
//  • max 3 verification attempts then lock (request a new code)
//  • single active code per (identifier, purpose)
// ============================================================================
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { col, COL } from '../../db/collections';
import { env } from '../../config/env';
import { AppError, badRequest } from '../../common/errors';
import { dispatchOtp, Channel } from './channels';

export type OtpPurpose = 'REGISTER' | 'LOGIN' | 'PASSWORD_RESET';

export interface OtpDoc {
  identifier: string;          // normalized email (lowercased) — or phone for SMS later
  channel: Channel;
  purpose: OtpPurpose;
  codeHash: string;
  attempts: number;
  maxAttempts: number;
  sendCount: number;
  lastSentAt: Date;
  expiresAt: Date;             // TTL index target
  consumedAt?: Date | null;
  ip?: string;
  createdAt: Date;
}

const normalize = (id: string) => id.trim().toLowerCase();
// cryptographically-random 6-digit code (000000–999999)
export const generateCode = () => (crypto.randomInt(0, 1_000_000)).toString().padStart(6, '0');

export interface RequestResult { channel: Channel; expiresInSec: number; resendInSec: number; dev?: boolean; }

export async function requestOtp(input: {
  identifier: string; purpose: OtpPurpose; channel?: Channel; ip?: string;
}): Promise<RequestResult> {
  const identifier = normalize(input.identifier);
  const channel: Channel = input.channel ?? 'EMAIL';
  const otps = col<OtpDoc>(COL.otps);
  const now = new Date();

  const existing = await otps.findOne({ identifier, purpose: input.purpose, consumedAt: null });
  if (existing && existing.expiresAt > now) {
    const sinceLast = (now.getTime() - existing.lastSentAt.getTime()) / 1000;
    if (sinceLast < env.OTP_RESEND_COOLDOWN_SEC) {
      const wait = Math.ceil(env.OTP_RESEND_COOLDOWN_SEC - sinceLast);
      throw new AppError(429, `Please wait ${wait}s before requesting a new code`, 'OTP_COOLDOWN');
    }
    if (existing.sendCount >= env.OTP_MAX_SENDS) {
      throw new AppError(429, 'Too many codes requested. Try again later.', 'OTP_MAX_SENDS');
    }
  }

  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(now.getTime() + env.OTP_TTL_SEC * 1000);

  await otps.updateOne(
    { identifier, purpose: input.purpose },
    {
      $set: { identifier, channel, purpose: input.purpose, codeHash, attempts: 0,
              maxAttempts: env.OTP_MAX_ATTEMPTS, lastSentAt: now, expiresAt, consumedAt: null, ip: input.ip },
      $inc: { sendCount: 1 },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );

  const res = await dispatchOtp(channel, identifier, code, input.purpose, Math.round(env.OTP_TTL_SEC / 60));
  return { channel, expiresInSec: env.OTP_TTL_SEC, resendInSec: env.OTP_RESEND_COOLDOWN_SEC, dev: (res as any)?.dev };
}

export async function verifyOtp(input: {
  identifier: string; purpose: OtpPurpose; code: string;
}): Promise<true> {
  const identifier = normalize(input.identifier);
  const otps = col<OtpDoc>(COL.otps);
  const now = new Date();

  const doc = await otps.findOne({ identifier, purpose: input.purpose, consumedAt: null });
  if (!doc) throw badRequest('No active code. Please request a new one.');
  if (doc.expiresAt <= now) throw new AppError(400, 'Code expired. Request a new one.', 'OTP_EXPIRED');
  if (doc.attempts >= doc.maxAttempts) throw new AppError(429, 'Too many attempts. Request a new code.', 'OTP_LOCKED');

  const matches = await bcrypt.compare(input.code, doc.codeHash);
  if (!matches) {
    const updated = await otps.findOneAndUpdate(
      { _id: doc._id, consumedAt: null },
      { $inc: { attempts: 1 } },
      { returnDocument: 'after' },
    );
    const attempts = (updated as any)?.attempts ?? doc.attempts + 1;
    const left = Math.max(0, doc.maxAttempts - attempts);
    if (left <= 0) throw new AppError(429, 'Too many attempts. Request a new code.', 'OTP_LOCKED');
    throw new AppError(400, `Invalid code. ${left} attempt(s) left.`, 'OTP_INVALID');
  }

  // success — consume atomically so it cannot be reused
  const consumed = await otps.findOneAndUpdate(
    { _id: doc._id, consumedAt: null },
    { $set: { consumedAt: now } },
    { returnDocument: 'after' },
  );
  if (!consumed) throw badRequest('Code already used. Request a new one.');
  return true;
}

// helper: current resend availability (for UI timers)
export async function otpStatus(identifier: string, purpose: OtpPurpose) {
  const doc = await col<OtpDoc>(COL.otps).findOne({ identifier: normalize(identifier), purpose, consumedAt: null });
  if (!doc) return { active: false };
  const now = Date.now();
  return {
    active: doc.expiresAt.getTime() > now,
    expiresInSec: Math.max(0, Math.round((doc.expiresAt.getTime() - now) / 1000)),
    resendInSec: Math.max(0, Math.ceil(env.OTP_RESEND_COOLDOWN_SEC - (now - doc.lastSentAt.getTime()) / 1000)),
    attemptsLeft: Math.max(0, doc.maxAttempts - doc.attempts),
  };
}
