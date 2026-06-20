// ============================================================================
//  auth.service.ts — MongoDB native driver. register/login/refresh/logout.
// ============================================================================
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { col, COL } from '../../db/collections';
import { UserDoc, RoleDoc, AccountTypeConfigDoc } from '../../db/models';
import { env } from '../../config/env';
import { badRequest, unauthorized } from '../../common/errors';
import { createAccount } from '../accounts/accounts.service';

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

async function permsForRole(roleName: string): Promise<string[]> {
  const role = await col<RoleDoc>(COL.roles).findOne({ name: roleName as any });
  return role?.permissions ?? [];
}

export async function register(input: {
  email: string; password: string; firstName?: string; lastName?: string; referredByCode?: string;
}) {
  const users = col<UserDoc>(COL.users);
  const email = input.email.trim().toLowerCase();
  if (await users.findOne({ email })) throw badRequest('Email already registered');

  let referredById: ObjectId | null = null;
  if (input.referredByCode) {
    const ref = await users.findOne({ referralCode: input.referredByCode });
    referredById = ref?._id ?? null;
  }

  const now = new Date();
  const doc: UserDoc = {
    email,
    passwordHash: await bcrypt.hash(input.password, 12),
    firstName: input.firstName, lastName: input.lastName,
    status: 'PENDING', emailVerified: false, twoFactorEnabled: false,
    roleName: 'USER',
    referralCode: crypto.randomBytes(4).toString('hex').toUpperCase(),
    referredById, lastLoginAt: null, createdAt: now, updatedAt: now,
  };
  const { insertedId } = await users.insertOne(doc);
  await col(COL.wallets).insertOne({ userId: insertedId, balance: 0, currency: 'USD', updatedAt: now });
  // Auto-create a DEMO account if one is configured
  const demoType = await col<AccountTypeConfigDoc>(COL.accountTypes).findOne({ category: 'DEMO', enabled: true });
  if (demoType) {
    await createAccount(insertedId.toString(), { accountTypeId: demoType._id!.toString() });
  }
  return { id: insertedId.toString(), email: doc.email, status: doc.status, referralCode: doc.referralCode };
}

export async function login(email: string, password: string, ctx: { ip?: string; ua?: string }) {
  const user = await col<UserDoc>(COL.users).findOne({ email });
  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  await col(COL.loginHistory).insertOne({
    userId: user?._id ?? null, ip: ctx.ip, userAgent: ctx.ua, success: !!ok, createdAt: new Date(),
  });
  if (!user || !ok) throw unauthorized('Invalid credentials');
  if (user.status === 'BANNED' || user.status === 'SUSPENDED') throw unauthorized('Account not active');

  const perms = await permsForRole(user.roleName);
  const tokens = await issueTokens(user._id!.toString(), user.roleName, perms, ctx);
  await col<UserDoc>(COL.users).updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
  return { user: { id: user._id!.toString(), email: user.email, role: user.roleName, status: user.status, perms }, ...tokens };
}

export async function issueTokens(userId: string, role: string, perms: string[], ctx: { ip?: string; ua?: string }) {
  const accessToken = jwt.sign({ sub: userId, role, perms }, env.JWT_ACCESS_SECRET, { expiresIn: env.ACCESS_TTL } as jwt.SignOptions);
  const raw = crypto.randomBytes(40).toString('hex');
  await col(COL.refreshTokens).insertOne({
    userId: new ObjectId(userId), tokenHash: sha256(raw),
    expiresAt: new Date(Date.now() + env.REFRESH_TTL_DAYS * 86400_000),
    revokedAt: null, ip: ctx.ip, userAgent: ctx.ua, createdAt: new Date(),
  });
  return { accessToken, refreshToken: raw };
}

export async function refresh(rawToken: string, ctx: { ip?: string; ua?: string }) {
  const tokens = col(COL.refreshTokens);
  const rec: any = await tokens.findOne({ tokenHash: sha256(rawToken) });
  if (!rec || rec.revokedAt || rec.expiresAt < new Date()) throw unauthorized('Invalid refresh token');
  await tokens.updateOne({ _id: rec._id }, { $set: { revokedAt: new Date() } }); // rotate
  const user = await col<UserDoc>(COL.users).findOne({ _id: rec.userId });
  if (!user) throw unauthorized('User gone');
  const perms = await permsForRole(user.roleName);
  return issueTokens(user._id!.toString(), user.roleName, perms, ctx);
}

export async function logout(rawToken: string) {
  await col(COL.refreshTokens).updateOne({ tokenHash: sha256(rawToken) }, { $set: { revokedAt: new Date() } });
}

// ---- helpers used by OTP flows -------------------------------------------
export async function checkPassword(email: string, password: string) {
  const user = await col<UserDoc>(COL.users).findOne({ email: email.trim().toLowerCase() });
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? user : null;
}

export async function setPassword(userId: string, newPassword: string) {
  const hash = await bcrypt.hash(newPassword, 12);
  await col<UserDoc>(COL.users).updateOne({ _id: new ObjectId(userId) }, { $set: { passwordHash: hash, updatedAt: new Date() } });
  // security: revoke all refresh tokens on password change
  await col(COL.refreshTokens).updateMany({ userId: new ObjectId(userId), revokedAt: null }, { $set: { revokedAt: new Date() } });
}

export async function markEmailVerified(email: string) {
  await col<UserDoc>(COL.users).updateOne({ email: email.trim().toLowerCase() }, { $set: { emailVerified: true, updatedAt: new Date() } });
}

export async function findByEmail(email: string) {
  return col<UserDoc>(COL.users).findOne({ email: email.trim().toLowerCase() });
}

export async function issueTokensForUser(user: UserDoc, ctx: { ip?: string; ua?: string }) {
  const role = await col<RoleDoc>(COL.roles).findOne({ name: user.roleName as any });
  const perms = role?.permissions ?? [];
  const tokens = await issueTokens(user._id!.toString(), user.roleName, perms, ctx);
  await col<UserDoc>(COL.users).updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
  return { user: { id: user._id!.toString(), email: user.email, role: user.roleName, status: user.status }, ...tokens };
}
