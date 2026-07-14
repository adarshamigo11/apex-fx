// ============================================================================
//  auth.service.ts — MongoDB native driver. register/login/refresh/logout.
// ============================================================================
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { col, COL } from '../../db/collections';
import { UserDoc, RoleDoc, AccountTypeConfigDoc, TradingAccountDoc } from '../../db/models';
import { env } from '../../config/env';
import { badRequest, unauthorized, notFound } from '../../common/errors';
import { createAccount } from '../accounts/accounts.service';

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

async function permsForRole(roleName: string): Promise<string[]> {
  const role = await col<RoleDoc>(COL.roles).findOne({ name: roleName as any });
  return role?.permissions ?? [];
}

// ────────────────────────────────────────────────────────────────────────────
//  Helpers
// ────────────────────────────────────────────────────────────────────────────
async function resolveReferral(referredByCode?: string): Promise<ObjectId | null> {
  if (!referredByCode) return null;
  const ref = await col<UserDoc>(COL.users).findOne({ referralCode: referredByCode });
  return ref?._id ?? null;
}

async function buildUserDoc(input: {
  email: string; password: string;
  fullName?: string; firstName?: string; lastName?: string;
  phone?: string; country?: string; dateOfBirth?: string; address?: string;
  referredByCode?: string;
}): Promise<UserDoc> {
  const referredById = await resolveReferral(input.referredByCode);
  const now = new Date();
  let firstName = input.firstName;
  let lastName = input.lastName;
  if (input.fullName && !firstName) {
    const parts = input.fullName.trim().split(/\s+/);
    firstName = parts[0] ?? '';
    lastName = parts.slice(1).join(' ') || '';
  }
  return {
    email: input.email.trim().toLowerCase(),
    phone: input.phone?.trim() || undefined,
    passwordHash: await bcrypt.hash(input.password, 12),
    firstName, lastName,
    fullName: input.fullName ?? ([firstName, lastName].filter(Boolean).join(' ') || undefined),
    country: input.country?.trim() || undefined,
    dateOfBirth: input.dateOfBirth || undefined,
    address: input.address || undefined,
    status: 'ACTIVE', emailVerified: false, twoFactorEnabled: false,
    roleName: 'USER',
    kycStatus: 'NOT_STARTED',
    referralCode: crypto.randomBytes(4).toString('hex').toUpperCase(),
    referredById, lastLoginAt: null, createdAt: now, updatedAt: now,
  };
}

async function issueTokensAndLogin(user: UserDoc, ctx: { ip?: string; ua?: string }) {
  const perms = await permsForRole(user.roleName);
  const tokens = await issueTokens(user._id!.toString(), user.roleName, perms, ctx);
  await col<UserDoc>(COL.users).updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
  const accounts = await col<TradingAccountDoc>(COL.tradingAccounts)
    .find({ userId: user._id })
    .sort({ createdAt: 1 })
    .toArray();
  return {
    user: {
      id: user._id!.toString(), email: user.email, role: user.roleName,
      status: user.status, perms,
      fullName: user.fullName, firstName: user.firstName, lastName: user.lastName,
      phone: user.phone, country: user.country, kycStatus: user.kycStatus,
    },
    accounts: accounts.map(a => ({
      _id: a._id!.toString(), login: a.login, type: a.type,
      accountCategory: a.accountCategory, accountType: a.accountType,
      status: a.status, balance: a.balance, currency: a.currency,
      leverage: a.leverage, server: a.server,
    })),
    ...tokens,
  };
}

// ────────────────────────────────────────────────────────────────────────────
//  REGISTER — Demo Account
// ────────────────────────────────────────────────────────────────────────────
export async function registerDemo(input: {
  email: string; password: string;
  fullName?: string; firstName?: string; lastName?: string;
  phone?: string; country?: string;
  referredByCode?: string;
}, ctx: { ip?: string; ua?: string }) {
  const users = col<UserDoc>(COL.users);
  const email = input.email.trim().toLowerCase();
  if (await users.findOne({ email })) throw badRequest('Email already registered');
  if (input.phone) {
    const phoneExists = await users.findOne({ phone: input.phone.trim() });
    if (phoneExists) throw badRequest('Phone number already registered');
  }

  const doc = await buildUserDoc(input);
  const { insertedId } = await users.insertOne(doc);
  await col(COL.wallets).insertOne({ userId: insertedId, balance: 0, currency: 'USD', updatedAt: new Date() });

  // Auto-create DEMO account
  const demoType = await col<AccountTypeConfigDoc>(COL.accountTypes).findOne({ category: 'DEMO', enabled: true });
  let account: any = null;
  if (demoType) {
    account = await createAccount(insertedId.toString(), { accountTypeId: demoType._id!.toString() });
  }

  // Set first account as active
  if (account?._id) {
    await users.updateOne({ _id: insertedId }, { $set: { activeAccountId: account._id } });
  }

  // Auto-login after demo registration
  doc._id = insertedId;
  return issueTokensAndLogin(doc, ctx);
}

// ────────────────────────────────────────────────────────────────────────────
//  REGISTER — Live Account
// ────────────────────────────────────────────────────────────────────────────
export async function registerLive(input: {
  email: string; password: string;
  fullName?: string; firstName?: string; lastName?: string;
  phone?: string; country?: string; dateOfBirth?: string; address?: string;
  accountTypeId: string;
  leverage?: number; currency?: string;
  referredByCode?: string;
}, ctx: { ip?: string; ua?: string }) {
  const users = col<UserDoc>(COL.users);
  const email = input.email.trim().toLowerCase();
  if (await users.findOne({ email })) throw badRequest('Email already registered');
  if (input.phone) {
    const phoneExists = await users.findOne({ phone: input.phone.trim() });
    if (phoneExists) throw badRequest('Phone number already registered');
  }

  // Validate account type
  const accountType = await col<AccountTypeConfigDoc>(COL.accountTypes).findOne({
    _id: new ObjectId(input.accountTypeId), enabled: true, category: 'LIVE',
  });
  if (!accountType) throw badRequest('Invalid or disabled live account type');

  const doc = await buildUserDoc(input);
  doc.status = 'PENDING'; // Live accounts need verification
  doc.kycStatus = 'PENDING';
  const { insertedId } = await users.insertOne(doc);
  await col(COL.wallets).insertOne({ userId: insertedId, balance: 0, currency: 'USD', updatedAt: new Date() });

  // Create LIVE trading account
  const account = await createAccount(insertedId.toString(), {
    accountTypeId: input.accountTypeId,
    leverage: input.leverage,
    currency: input.currency,
  });

  // Set as active
  if (account?._id) {
    await users.updateOne({ _id: insertedId }, { $set: { activeAccountId: account._id } });
  }

  // Auto-login
  doc._id = insertedId;
  return issueTokensAndLogin(doc, ctx);
}

// ────────────────────────────────────────────────────────────────────────────
//  REGISTER — Legacy (backward compat, creates demo account)
// ────────────────────────────────────────────────────────────────────────────
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
    fullName: [input.firstName, input.lastName].filter(Boolean).join(' ') || undefined,
    status: 'PENDING', emailVerified: false, twoFactorEnabled: false,
    roleName: 'USER', kycStatus: 'NOT_STARTED',
    referralCode: crypto.randomBytes(4).toString('hex').toUpperCase(),
    referredById, lastLoginAt: null, createdAt: now, updatedAt: now,
  };
  const { insertedId } = await users.insertOne(doc);
  await col(COL.wallets).insertOne({ userId: insertedId, balance: 0, currency: 'USD', updatedAt: now });
  const demoType = await col<AccountTypeConfigDoc>(COL.accountTypes).findOne({ category: 'DEMO', enabled: true });
  if (demoType) {
    await createAccount(insertedId.toString(), { accountTypeId: demoType._id!.toString() });
  }
  return { id: insertedId.toString(), email: doc.email, status: doc.status, referralCode: doc.referralCode };
}

// ────────────────────────────────────────────────────────────────────────────
//  LOGIN — Universal (email or phone)
// ────────────────────────────────────────────────────────────────────────────
export async function login(identifier: string, password: string, ctx: { ip?: string; ua?: string }) {
  const isEmail = identifier.includes('@');
  const query = isEmail
    ? { email: identifier.trim().toLowerCase() }
    : { phone: identifier.trim() };

  const user = await col<UserDoc>(COL.users).findOne(query);
  const ok = user && (await bcrypt.compare(password, user.passwordHash));

  await col(COL.loginHistory).insertOne({
    userId: user?._id ?? null, ip: ctx.ip, userAgent: ctx.ua, success: !!ok, createdAt: new Date(),
  });

  if (!user || !ok) throw unauthorized('Invalid credentials');
  if (user.status === 'BANNED' || user.status === 'SUSPENDED') throw unauthorized('Account not active');

  return issueTokensAndLogin(user, ctx);
}

// ────────────────────────────────────────────────────────────────────────────
//  SWITCH ACCOUNT — Set active trading account
// ────────────────────────────────────────────────────────────────────────────
export async function switchAccount(userId: string, accountId: string) {
  const account = await col<TradingAccountDoc>(COL.tradingAccounts).findOne({
    _id: new ObjectId(accountId), userId: new ObjectId(userId),
  });
  if (!account) throw notFound('Account not found or does not belong to user');

  await col<UserDoc>(COL.users).updateOne(
    { _id: new ObjectId(userId) },
    { $set: { activeAccountId: account._id, updatedAt: new Date() } },
  );

  return {
    _id: account._id!.toString(),
    login: account.login,
    type: account.type,
    accountCategory: account.accountCategory,
    accountType: account.accountType,
    status: account.status,
    balance: account.balance,
    currency: account.currency,
    leverage: account.leverage,
    server: account.server,
  };
}

// ────────────────────────────────────────────────────────────────────────────
//  UPGRADE DEMO TO LIVE — Create live account for existing demo user
// ────────────────────────────────────────────────────────────────────────────
export async function upgradeDemoToLive(userId: string, input: {
  accountTypeId: string; leverage?: number; currency?: string;
}, ctx: { ip?: string; ua?: string }) {
  const user = await col<UserDoc>(COL.users).findOne({ _id: new ObjectId(userId) });
  if (!user) throw notFound('User not found');

  const accountType = await col<AccountTypeConfigDoc>(COL.accountTypes).findOne({
    _id: new ObjectId(input.accountTypeId), enabled: true, category: 'LIVE',
  });
  if (!accountType) throw badRequest('Invalid or disabled live account type');

  const existing = await col<TradingAccountDoc>(COL.tradingAccounts).findOne({
    userId: new ObjectId(userId),
    accountCategory: 'LIVE',
    accountType: accountType.name,
    status: { $in: ['ACTIVE', 'PENDING'] } as any,
  });
  if (existing) throw badRequest(`You already have a ${accountType.displayName} live account`);

  const account = await createAccount(userId, {
    accountTypeId: input.accountTypeId,
    leverage: input.leverage,
    currency: input.currency,
  });

  if (account?._id) {
    await col<UserDoc>(COL.users).updateOne(
      { _id: new ObjectId(userId) },
      { $set: { activeAccountId: account._id, kycStatus: user.kycStatus === 'APPROVED' ? 'APPROVED' : 'PENDING', updatedAt: new Date() } },
    );
  }

  return {
    _id: account._id!.toString(),
    login: account.login,
    type: account.type,
    accountCategory: account.accountCategory,
    accountType: account.accountType,
    status: account.status,
    balance: account.balance,
    currency: account.currency,
    leverage: account.leverage,
    server: account.server,
  };
}

// ────────────────────────────────────────────────────────────────────────────
//  FORGOT PASSWORD — Generate reset token
// ────────────────────────────────────────────────────────────────────────────
export async function forgotPassword(identifier: string) {
  const isEmail = identifier.includes('@');
  const query = isEmail
    ? { email: identifier.trim().toLowerCase() }
    : { phone: identifier.trim() };

  const user = await col<UserDoc>(COL.users).findOne(query);
  if (!user) {
    return { ok: true, message: 'If an account exists, a reset link has been sent' };
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenHash = sha256(resetToken);
  const expiresAt = new Date(Date.now() + 3600_000);

  await col(COL.users).updateOne(
    { _id: user._id },
    { $set: { resetTokenHash, resetTokenExpiresAt: expiresAt, updatedAt: new Date() } as any },
  );

  return {
    ok: true,
    message: 'If an account exists, a reset link has been sent',
    ...(env.NODE_ENV === 'development' ? { resetToken } : {}),
  };
}

// ────────────────────────────────────────────────────────────────────────────
//  RESET PASSWORD
// ────────────────────────────────────────────────────────────────────────────
export async function resetPassword(token: string, newPassword: string) {
  const tokenHash = sha256(token);
  const user = await col<UserDoc>(COL.users).findOne({
    resetTokenHash: tokenHash,
    resetTokenExpiresAt: { $gt: new Date() },
  } as any);

  if (!user) throw badRequest('Invalid or expired reset token');

  const hash = await bcrypt.hash(newPassword, 12);
  await col<UserDoc>(COL.users).updateOne(
    { _id: user._id },
    {
      $set: { passwordHash: hash, updatedAt: new Date() },
      $unset: { resetTokenHash: '', resetTokenExpiresAt: '' } as any,
    },
  );

  await col(COL.refreshTokens).updateMany(
    { userId: user._id, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );

  return { ok: true, message: 'Password reset successfully' };
}

// ────────────────────────────────────────────────────────────────────────────
//  Token management
// ────────────────────────────────────────────────────────────────────────────
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
  await tokens.updateOne({ _id: rec._id }, { $set: { revokedAt: new Date() } });
  const user = await col<UserDoc>(COL.users).findOne({ _id: rec.userId });
  if (!user) throw unauthorized('User gone');
  const perms = await permsForRole(user.roleName);
  return issueTokens(user._id!.toString(), user.roleName, perms, ctx);
}

export async function logout(rawToken: string) {
  await col(COL.refreshTokens).updateOne({ tokenHash: sha256(rawToken) }, { $set: { revokedAt: new Date() } });
}

// ────────────────────────────────────────────────────────────────────────────
//  Helpers used by OTP flows
// ────────────────────────────────────────────────────────────────────────────
export async function checkPassword(email: string, password: string) {
  const user = await col<UserDoc>(COL.users).findOne({ email: email.trim().toLowerCase() });
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? user : null;
}

export async function setPassword(userId: string, newPassword: string) {
  const hash = await bcrypt.hash(newPassword, 12);
  await col<UserDoc>(COL.users).updateOne({ _id: new ObjectId(userId) }, { $set: { passwordHash: hash, updatedAt: new Date() } });
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

// ────────────────────────────────────────────────────────────────────────────
//  PROFILE — Get user profile with all accounts
// ────────────────────────────────────────────────────────────────────────────
export async function getProfile(userId: string) {
  const user = await col<UserDoc>(COL.users).findOne({ _id: new ObjectId(userId) });
  if (!user) throw notFound('User not found');

  const accounts = await col<TradingAccountDoc>(COL.tradingAccounts)
    .find({ userId: new ObjectId(userId) })
    .sort({ createdAt: 1 })
    .toArray();

  const kyc = await col(COL.kyc).findOne({ userId: new ObjectId(userId) });

  return {
    id: user._id!.toString(),
    email: user.email,
    phone: user.phone,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName,
    country: user.country,
    dateOfBirth: user.dateOfBirth,
    address: user.address,
    status: user.status,
    emailVerified: user.emailVerified,
    kycStatus: user.kycStatus,
    roleName: user.roleName,
    referralCode: user.referralCode,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    activeAccountId: user.activeAccountId?.toString() ?? null,
    accounts: accounts.map(a => ({
      _id: a._id!.toString(),
      login: a.login,
      type: a.type,
      accountCategory: a.accountCategory,
      accountType: a.accountType,
      status: a.status,
      balance: a.balance,
      credit: a.credit,
      currency: a.currency,
      leverage: a.leverage,
      server: a.server,
      investorPassword: a.investorPassword,
      tradingPassword: a.tradingPassword,
      createdAt: a.createdAt,
    })),
    kyc,
  };
}
