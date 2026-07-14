// ============================================================================
//  admin.service.ts — Comprehensive back-office operations
//  Every mutation is written to admin_action_log for audit purposes.
// ============================================================================
import { ObjectId } from 'mongodb';
import { col, COL, oid } from '../../db/collections';
import {
  UserDoc, KycDoc, WithdrawalDoc, DepositDoc, TradingAccountDoc, AdminActionLogDoc,
  UserStatus, RoleDoc, Permission, ALL_PERMISSIONS, SymbolDoc, MarketConfigDoc,
  TradingSessionDoc, RiskRuleDoc, FeedProviderDoc, SecurityEventDoc, CommunicationDoc,
  SymbolKind, AccountTypeConfigDoc,
} from '../../db/models';
import { badRequest, forbidden, notFound } from '../../common/errors';
import { searchUsers } from '../../db/search';
import { round } from '../trading/engine';

const USER_PROJECTION = { passwordHash: 0, twoFactorSecret: 0 } as const;

function clampPage(page?: number, limit?: number) {
  return { page: Math.max(1, page ?? 1), limit: Math.min(100, Math.max(1, limit ?? 20)) };
}

// ─────────────────── AUDIT LOGGING (enhanced) ─────────────────────────────
export async function logAction(
  actorId: string, action: string, targetType: string, targetId?: string,
  meta?: Record<string, unknown>,
  beforeValue?: Record<string, unknown> | null,
  afterValue?: Record<string, unknown> | null,
) {
  const entry: AdminActionLogDoc = {
    actorId: new ObjectId(actorId), action, targetType, targetId,
    meta, beforeValue: beforeValue ?? null, afterValue: afterValue ?? null,
    createdAt: new Date(),
  };
  await col<AdminActionLogDoc>(COL.adminActionLog).insertOne(entry);
}

// ══════════════════════════════════════════════════════════════════════════
//  USERS
// ══════════════════════════════════════════════════════════════════════════
export async function listUsers(opts: { q?: string; status?: UserStatus; roleName?: string; page?: number; limit?: number }) {
  const { page, limit } = clampPage(opts.page, opts.limit);
  if (opts.q?.trim()) {
    const items = await searchUsers(opts.q.trim(), limit);
    return { items, total: items.length, page: 1, limit };
  }
  const filter: any = {};
  if (opts.status) filter.status = opts.status;
  if (opts.roleName) filter.roleName = opts.roleName;
  const [items, total] = await Promise.all([
    col<UserDoc>(COL.users).find(filter, { projection: USER_PROJECTION })
      .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
    col<UserDoc>(COL.users).countDocuments(filter),
  ]);
  return { items, total, page, limit };
}

export async function getUserDetail(userId: string) {
  const user = await col<UserDoc>(COL.users).findOne({ _id: oid(userId) }, { projection: USER_PROJECTION });
  if (!user) throw notFound('User not found');
  const [wallet, kyc, accounts] = await Promise.all([
    col(COL.wallets).findOne({ userId: oid(userId) }),
    col<KycDoc>(COL.kyc).findOne({ userId: oid(userId) }),
    col<TradingAccountDoc>(COL.tradingAccounts).find({ userId: oid(userId) }).toArray(),
  ]);
  return { user, wallet, kyc, accounts };
}

export async function setUserStatus(actorId: string, userId: string, status: UserStatus) {
  const user = await col<UserDoc>(COL.users).findOne({ _id: oid(userId) });
  if (!user) throw notFound('User not found');
  if (user.roleName === 'SUPER_ADMIN') throw forbidden('Cannot modify a super admin');

  const before = { status: user.status };
  await col<UserDoc>(COL.users).updateOne({ _id: user._id }, { $set: { status, updatedAt: new Date() } });
  if (['SUSPENDED', 'BANNED', 'TERMINATED'].includes(status)) {
    await col(COL.refreshTokens).updateMany({ userId: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
  }
  await logAction(actorId, 'user.status', 'user', userId, { from: user.status, to: status }, before, { status });
  return { id: userId, status };
}

export async function freezeUser(actorId: string, userId: string) {
  const user = await col<UserDoc>(COL.users).findOne({ _id: oid(userId) });
  if (!user) throw notFound('User not found');
  if (user.roleName === 'SUPER_ADMIN') throw forbidden('Cannot freeze super admin');
  const before = { status: user.status };
  await col<UserDoc>(COL.users).updateOne({ _id: user._id }, { $set: { status: 'FROZEN', updatedAt: new Date() } });
  await col(COL.refreshTokens).updateMany({ userId: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
  await logAction(actorId, 'user.freeze', 'user', userId, {}, before, { status: 'FROZEN' });
  return { id: userId, status: 'FROZEN' };
}

export async function restrictUser(actorId: string, userId: string, restrictions: string[]) {
  const user = await col<UserDoc>(COL.users).findOne({ _id: oid(userId) });
  if (!user) throw notFound('User not found');
  const before = { status: user.status, restrictions: user.restrictions || [] };
  await col<UserDoc>(COL.users).updateOne({ _id: user._id }, {
    $set: { status: 'RESTRICTED', restrictions, updatedAt: new Date() },
  });
  await logAction(actorId, 'user.restrict', 'user', userId, { restrictions }, before, { status: 'RESTRICTED', restrictions });
  return { id: userId, status: 'RESTRICTED', restrictions };
}

export async function mergeAccounts(actorId: string, sourceId: string, targetId: string) {
  if (sourceId === targetId) throw badRequest('Cannot merge account with itself');
  const source = await col<UserDoc>(COL.users).findOne({ _id: oid(sourceId) });
  const target = await col<UserDoc>(COL.users).findOne({ _id: oid(targetId) });
  if (!source || !target) throw notFound('User not found');

  // Transfer wallet balance
  const sourceWallet = await col(COL.wallets).findOne({ userId: oid(sourceId) });
  if (sourceWallet?.balance) {
    await col(COL.wallets).updateOne({ userId: oid(targetId) }, { $inc: { balance: sourceWallet.balance } });
  }

  // Transfer trading accounts
  await col(COL.tradingAccounts).updateMany({ userId: oid(sourceId) }, { $set: { userId: oid(targetId) } });

  // Mark source as merged/banned
  await col<UserDoc>(COL.users).updateOne({ _id: source._id }, { $set: { status: 'BANNED', updatedAt: new Date() } });

  await logAction(actorId, 'user.merge', 'user', sourceId, { targetId, walletTransferred: sourceWallet?.balance ?? 0 });
  return { merged: true, sourceId, targetId };
}

// ─────────────────── USER MONITORING ─────────────────────────────────────
export async function getUserLoginHistory(id: string, page = 1, limit = 20) {
  const p = clampPage(page, limit);
  const filter = { userId: oid(id) };
  const [items, total] = await Promise.all([
    col(COL.loginHistory).find(filter).sort({ createdAt: -1 }).skip((p.page - 1) * p.limit).limit(p.limit).toArray(),
    col(COL.loginHistory).countDocuments(filter),
  ]);
  return { items, total, page: p.page, limit: p.limit };
}

export async function getUserDeviceHistory(id: string) {
  return col(COL.deviceHistory).find({ userId: oid(id) }).sort({ lastSeenAt: -1 }).limit(50).toArray();
}

export async function getUserIpHistory(id: string) {
  return col(COL.ipHistory).find({ userId: oid(id) }).sort({ createdAt: -1 }).limit(100).toArray();
}

export async function getUserSecurityEvents(id: string) {
  return col(COL.securityEvents).find({ userId: oid(id) }).sort({ createdAt: -1 }).limit(100).toArray();
}

// ══════════════════════════════════════════════════════════════════════════
//  WALLET OPERATIONS
// ══════════════════════════════════════════════════════════════════════════
export async function creditWallet(actorId: string, userId: string, amount: number, reason: string) {
  const wallet = await col(COL.wallets).findOne({ userId: oid(userId) });
  if (!wallet) throw notFound('Wallet not found');
  const before = { balance: wallet.balance };
  await col(COL.wallets).updateOne({ userId: oid(userId) }, { $inc: { balance: amount }, $set: { updatedAt: new Date() } });
  await logAction(actorId, 'wallet.credit', 'wallet', userId, { amount, reason }, before, { balance: wallet.balance + amount });
  return { userId, before: wallet.balance, after: wallet.balance + amount, amount };
}

export async function debitWallet(actorId: string, userId: string, amount: number, reason: string) {
  const wallet = await col(COL.wallets).findOne({ userId: oid(userId) });
  if (!wallet) throw notFound('Wallet not found');
  if (wallet.balance < amount) throw badRequest('Insufficient wallet balance');
  const before = { balance: wallet.balance };
  await col(COL.wallets).updateOne({ userId: oid(userId) }, { $inc: { balance: -amount }, $set: { updatedAt: new Date() } });
  await logAction(actorId, 'wallet.debit', 'wallet', userId, { amount, reason }, before, { balance: wallet.balance - amount });
  return { userId, before: wallet.balance, after: wallet.balance - amount, amount };
}

export async function freezeWallet(actorId: string, userId: string) {
  const wallet = await col(COL.wallets).findOne({ userId: oid(userId) });
  if (!wallet) throw notFound('Wallet not found');
  await col(COL.wallets).updateOne({ userId: oid(userId) }, { $set: { frozen: true, updatedAt: new Date() } });
  await logAction(actorId, 'wallet.freeze', 'wallet', userId, {});
  return { userId, frozen: true };
}

export async function unlockWallet(actorId: string, userId: string) {
  const wallet = await col(COL.wallets).findOne({ userId: oid(userId) });
  if (!wallet) throw notFound('Wallet not found');
  await col(COL.wallets).updateOne({ userId: oid(userId) }, { $set: { frozen: false, updatedAt: new Date() } });
  await logAction(actorId, 'wallet.unfreeze', 'wallet', userId, {});
  return { userId, frozen: false };
}

// ══════════════════════════════════════════════════════════════════════════
//  KYC
// ══════════════════════════════════════════════════════════════════════════
export async function listKyc(status?: string) {
  const filter: any = status ? { status } : {};
  return col<KycDoc>(COL.kyc).find(filter).sort({ createdAt: -1 }).toArray();
}

export async function decideKyc(actorId: string, kycId: string, decision: 'APPROVED' | 'REJECTED', note?: string) {
  const record = await col<KycDoc>(COL.kyc).findOne({ _id: oid(kycId) });
  if (!record) throw notFound('KYC submission not found');
  if (record.status !== 'PENDING') throw badRequest('KYC submission already reviewed');
  const before = { status: record.status };
  await col<KycDoc>(COL.kyc).updateOne({ _id: record._id }, {
    $set: { status: decision, reviewedBy: new ObjectId(actorId), reviewNote: note, updatedAt: new Date() },
  });
  await logAction(actorId, 'kyc.decision', 'kyc', kycId, { decision, note, userId: record.userId.toString() }, before, { status: decision });
  return { id: kycId, status: decision };
}

export async function requestKycDocuments(actorId: string, kycId: string, docTypes: string[]) {
  const record = await col<KycDoc>(COL.kyc).findOne({ _id: oid(kycId) });
  if (!record) throw notFound('KYC submission not found');
  await col<KycDoc>(COL.kyc).updateOne({ _id: record._id }, {
    $push: { requestedDocs: { $each: docTypes } } as any,
    $set: { updatedAt: new Date() },
  });
  await logAction(actorId, 'kyc.request_docs', 'kyc', kycId, { docTypes, userId: record.userId.toString() });
  return { id: kycId, requestedDocs: docTypes };
}

// ══════════════════════════════════════════════════════════════════════════
//  DEPOSITS
// ══════════════════════════════════════════════════════════════════════════
export async function listDeposits(status?: string) {
  const filter: any = status ? { status } : {};
  return col<DepositDoc>(COL.deposits).find(filter).sort({ createdAt: -1 }).toArray();
}

export async function decideDeposit(actorId: string, depositId: string, decision: 'APPROVED' | 'REJECTED', note?: string) {
  const record = await col<DepositDoc>(COL.deposits).findOne({ _id: oid(depositId) });
  if (!record) throw notFound('Deposit not found');
  if (record.status !== 'PENDING') throw badRequest('Deposit already reviewed');
  const before = { status: record.status };
  await col<DepositDoc>(COL.deposits).updateOne({ _id: record._id }, {
    $set: { status: decision, reviewedBy: new ObjectId(actorId), reviewNote: note, updatedAt: new Date() },
  });
  if (decision === 'APPROVED') {
    await col(COL.wallets).updateOne({ userId: record.userId }, { $inc: { balance: record.amount }, $set: { updatedAt: new Date() } });
  }
  await logAction(actorId, 'deposit.decision', 'deposit', depositId, { decision, note, amount: record.amount, userId: record.userId.toString() }, before, { status: decision });
  return { id: depositId, status: decision };
}

// ══════════════════════════════════════════════════════════════════════════
//  WITHDRAWALS
// ══════════════════════════════════════════════════════════════════════════
export async function listWithdrawals(status?: string) {
  const filter: any = status ? { status } : {};
  return col<WithdrawalDoc>(COL.withdrawals).find(filter).sort({ createdAt: -1 }).toArray();
}

export async function decideWithdrawal(actorId: string, withdrawalId: string, decision: 'APPROVED' | 'REJECTED', note?: string) {
  const record = await col<WithdrawalDoc>(COL.withdrawals).findOne({ _id: oid(withdrawalId) });
  if (!record) throw notFound('Withdrawal not found');
  if (record.status !== 'PENDING') throw badRequest('Withdrawal already reviewed');
  const before = { status: record.status };
  await col<WithdrawalDoc>(COL.withdrawals).updateOne({ _id: record._id }, {
    $set: { status: decision, reviewedBy: new ObjectId(actorId), reviewNote: note, updatedAt: new Date() },
  });
  if (decision === 'REJECTED') {
    await col(COL.wallets).updateOne({ userId: record.userId }, { $inc: { balance: record.amount }, $set: { updatedAt: new Date() } });
  }
  await logAction(actorId, 'withdrawal.decision', 'withdrawal', withdrawalId, { decision, note, amount: record.amount, userId: record.userId.toString() }, before, { status: decision });
  return { id: withdrawalId, status: decision };
}

// ══════════════════════════════════════════════════════════════════════════
//  BALANCE ADJUSTMENT (legacy compat)
// ══════════════════════════════════════════════════════════════════════════
export async function adjustBalance(actorId: string, accountId: string, delta: number, reason: string) {
  if (!Number.isFinite(delta) || delta === 0) throw badRequest('Delta must be a non-zero number');
  const account = await col<TradingAccountDoc>(COL.tradingAccounts).findOne({ _id: oid(accountId) });
  if (!account) throw notFound('Account not found');
  const before = Number(account.balance ?? 0);
  const after = round(before + delta, 2);
  if (after < 0) throw badRequest('Adjustment would make balance negative');
  await col<TradingAccountDoc>(COL.tradingAccounts).updateOne({ _id: account._id }, { $set: { balance: after, updatedAt: new Date() } });
  await logAction(actorId, 'balance.adjust', 'account', accountId, { delta, reason }, { balance: before }, { balance: after });
  return { id: accountId, balanceBefore: before, balanceAfter: after, delta };
}

// ══════════════════════════════════════════════════════════════════════════
//  TRADES
// ══════════════════════════════════════════════════════════════════════════
export async function listTrades(opts: { accountId?: string; userId?: string; page?: number; limit?: number }) {
  const { page, limit } = clampPage(opts.page, opts.limit);
  const match: any = {};
  if (opts.accountId) match.accountId = oid(opts.accountId);
  const pipeline: any[] = [{ $match: match }];
  if (opts.userId) {
    pipeline.push(
      { $lookup: { from: COL.tradingAccounts, localField: 'accountId', foreignField: '_id', as: 'account' } },
      { $unwind: '$account' },
      { $match: { 'account.userId': oid(opts.userId) } },
    );
  } else {
    pipeline.push(
      { $lookup: { from: COL.tradingAccounts, localField: 'accountId', foreignField: '_id', as: 'account' } },
      { $unwind: '$account' },
    );
  }
  pipeline.push(
    { $sort: { closeTime: -1 } },
    { $facet: {
      items: [
        { $skip: (page - 1) * limit }, { $limit: limit },
        { $project: {
          ticket: 1, symbolName: 1, side: 1, lots: 1, openPrice: 1, closePrice: 1,
          profit: 1, commission: 1, swap: 1, closeReason: 1, openTime: 1, closeTime: 1,
          accountId: 1, accountLogin: '$account.login', accountUserId: '$account.userId',
        } },
      ],
      total: [{ $count: 'n' }],
    } },
  );
  const [res] = await col(COL.tradeHistory).aggregate(pipeline).toArray() as any[];
  return { items: res?.items ?? [], total: res?.total?.[0]?.n ?? 0, page, limit };
}

export async function listOpenPositions(symbol?: string) {
  const filter: any = { status: 'OPEN' };
  if (symbol) filter.symbolName = symbol;
  return col(COL.positions).find(filter).sort({ openTime: -1 }).toArray();
}

// ══════════════════════════════════════════════════════════════════════════
//  SUPPORT TICKETS
// ══════════════════════════════════════════════════════════════════════════
export async function getSupportTickets(opts: { status?: string; priority?: string; page?: number; limit?: number }) {
  const { page, limit } = clampPage(opts.page, opts.limit);
  const filter: any = {};
  if (opts.status) filter.status = opts.status;
  if (opts.priority) filter.priority = opts.priority;
  const [items, total] = await Promise.all([
    col(COL.supportTickets).find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
    col(COL.supportTickets).countDocuments(filter),
  ]);
  return { items, total, page, limit };
}

export async function getTicketDetail(ticketId: string) {
  const ticket = await col(COL.supportTickets).findOne({ _id: oid(ticketId) });
  if (!ticket) throw notFound('Ticket not found');
  const messages = await col(COL.ticketMessages).find({ ticketId: oid(ticketId) }).sort({ createdAt: 1 }).toArray();
  return { ticket, messages };
}

export async function escalateTicket(actorId: string, ticketId: string) {
  const ticket = await col(COL.supportTickets).findOne({ _id: oid(ticketId) });
  if (!ticket) throw notFound('Ticket not found');
  await col(COL.supportTickets).updateOne({ _id: ticket._id }, { $set: { priority: 'HIGH', updatedAt: new Date() } });
  await logAction(actorId, 'ticket.escalate', 'ticket', ticketId, {});
  return { id: ticketId, priority: 'HIGH' };
}

export async function resolveTicket(actorId: string, ticketId: string, resolution: string) {
  const ticket = await col(COL.supportTickets).findOne({ _id: oid(ticketId) });
  if (!ticket) throw notFound('Ticket not found');
  await col(COL.supportTickets).updateOne({ _id: ticket._id }, { $set: { status: 'RESOLVED', resolution, updatedAt: new Date() } });
  await logAction(actorId, 'ticket.resolve', 'ticket', ticketId, { resolution });
  return { id: ticketId, status: 'RESOLVED' };
}

// ══════════════════════════════════════════════════════════════════════════
//  ROLES
// ══════════════════════════════════════════════════════════════════════════
export async function listRoles() {
  const roles = await col<RoleDoc>(COL.roles).find().sort({ name: 1 }).toArray();
  // Count users per role
  const counts = await col<UserDoc>(COL.users).aggregate([
    { $group: { _id: '$roleName', count: { $sum: 1 } } },
  ]).toArray();
  const countMap = new Map(counts.map((c: any) => [c._id, c.count]));
  return roles.map(r => ({ ...r, userCount: countMap.get(r.name) ?? 0 }));
}

export async function createRole(actorId: string, data: { name: string; description?: string; permissions: string[] }) {
  if (await col<RoleDoc>(COL.roles).findOne({ name: data.name })) {
    throw badRequest('Role name already exists');
  }
  // Validate permissions
  const validPerms = new Set(ALL_PERMISSIONS);
  const invalid = data.permissions.filter(p => !validPerms.has(p as Permission));
  if (invalid.length) throw badRequest(`Invalid permissions: ${invalid.join(', ')}`);

  const doc: RoleDoc = {
    name: data.name, description: data.description,
    permissions: data.permissions as Permission[], isSystem: false, createdAt: new Date(),
  };
  const { insertedId } = await col<RoleDoc>(COL.roles).insertOne(doc);
  await logAction(actorId, 'role.create', 'role', insertedId.toString(), { name: data.name });
  return { id: insertedId.toString(), ...doc };
}

export async function updateRole(actorId: string, id: string, patch: { name?: string; description?: string; permissions?: string[] }) {
  const role = await col<RoleDoc>(COL.roles).findOne({ _id: oid(id) });
  if (!role) throw notFound('Role not found');
  if (role.isSystem) throw forbidden('Cannot edit system roles');
  if (patch.permissions) {
    const validPerms = new Set(ALL_PERMISSIONS);
    const invalid = patch.permissions.filter(p => !validPerms.has(p as Permission));
    if (invalid.length) throw badRequest(`Invalid permissions: ${invalid.join(', ')}`);
  }
  const update: any = {};
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.permissions !== undefined) update.permissions = patch.permissions;
  await col<RoleDoc>(COL.roles).updateOne({ _id: role._id }, { $set: update });
  await logAction(actorId, 'role.update', 'role', id, { patch }, { name: role.name, permissions: role.permissions }, update);
  return { id, ...update };
}

export async function deleteRole(actorId: string, id: string) {
  const role = await col<RoleDoc>(COL.roles).findOne({ _id: oid(id) });
  if (!role) throw notFound('Role not found');
  if (role.isSystem) throw forbidden('Cannot delete system roles');
  const userCount = await col<UserDoc>(COL.users).countDocuments({ roleName: role.name as any });
  if (userCount > 0) throw badRequest(`Cannot delete role with ${userCount} assigned users`);
  await col<RoleDoc>(COL.roles).deleteOne({ _id: role._id });
  await logAction(actorId, 'role.delete', 'role', id, { name: role.name });
  return { deleted: true, id };
}

export async function assignRole(actorId: string, userId: string, roleName: string) {
  const user = await col<UserDoc>(COL.users).findOne({ _id: oid(userId) });
  if (!user) throw notFound('User not found');
  const role = await col<RoleDoc>(COL.roles).findOne({ name: roleName });
  if (!role) throw notFound('Role not found');
  if (user.roleName === 'SUPER_ADMIN') throw forbidden('Cannot change super admin role');
  const before = { roleName: user.roleName };
  await col<UserDoc>(COL.users).updateOne({ _id: user._id }, { $set: { roleName: roleName as any, updatedAt: new Date() } });
  await logAction(actorId, 'role.assign', 'user', userId, { roleName }, before, { roleName });
  return { userId, roleName };
}

export async function getPermissionMatrix() {
  const modules: Record<string, string[]> = {};
  for (const perm of ALL_PERMISSIONS) {
    const [module, action] = perm.split('.');
    if (!modules[module]) modules[module] = [];
    modules[module].push(action);
  }
  return { permissions: ALL_PERMISSIONS, modules };
}

// ══════════════════════════════════════════════════════════════════════════
//  SYMBOLS (enhanced)
// ══════════════════════════════════════════════════════════════════════════
export async function listSymbols() {
  return col<SymbolDoc>(COL.symbols).find().sort({ name: 1 }).toArray();
}

export async function addSymbol(actorId: string, data: {
  name: string; displayName: string; kind: SymbolKind; base: string; quote: string;
  contractSize: number; digits: number; spreadPoints: number; commission: number;
  source: string; externalSymbol?: string;
}) {
  if (await col<SymbolDoc>(COL.symbols).findOne({ name: data.name })) {
    throw badRequest('Symbol already exists');
  }
  const doc: SymbolDoc = {
    ...data, minLot: 0.01, maxLot: 100, lotStep: 0.01, enabled: true,
  };
  await col<SymbolDoc>(COL.symbols).insertOne(doc);
  await logAction(actorId, 'symbol.create', 'symbol', data.name, { data });
  return doc;
}

export async function updateSymbol(actorId: string, name: string, patch: Record<string, unknown>) {
  const existing = await col<SymbolDoc>(COL.symbols).findOne({ name });
  if (!existing) throw notFound('Symbol not found');
  const before = { ...patch };
  for (const k of Object.keys(before)) (before as any)[k] = (existing as any)[k];
  await col<SymbolDoc>(COL.symbols).updateOne({ name }, { $set: patch });
  await logAction(actorId, 'symbol.update', 'symbol', name, { patch }, before, patch);
  return { name, ...patch };
}

export async function disableSymbol(actorId: string, name: string) {
  const existing = await col<SymbolDoc>(COL.symbols).findOne({ name });
  if (!existing) throw notFound('Symbol not found');
  await col<SymbolDoc>(COL.symbols).updateOne({ name }, { $set: { enabled: false } });
  await logAction(actorId, 'symbol.disable', 'symbol', name, {});
  return { name, enabled: false };
}

export async function enableSymbol(actorId: string, name: string) {
  const existing = await col<SymbolDoc>(COL.symbols).findOne({ name });
  if (!existing) throw notFound('Symbol not found');
  await col<SymbolDoc>(COL.symbols).updateOne({ name }, { $set: { enabled: true } });
  await logAction(actorId, 'symbol.enable', 'symbol', name, {});
  return { name, enabled: true };
}

// ══════════════════════════════════════════════════════════════════════════
//  MARKET OPERATIONS
// ══════════════════════════════════════════════════════════════════════════
export async function getMarketConfig() {
  const configs = await col<MarketConfigDoc>(COL.marketConfig).find().toArray();
  const result: Record<string, unknown> = {};
  for (const c of configs) result[c.key] = c.value;
  return result;
}

export async function updateMarketConfig(actorId: string, config: Record<string, unknown>) {
  for (const [key, value] of Object.entries(config)) {
    await col<MarketConfigDoc>(COL.marketConfig).updateOne(
      { key }, { $set: { key, value, updatedBy: new ObjectId(actorId), updatedAt: new Date() } }, { upsert: true },
    );
  }
  await logAction(actorId, 'market.config.update', 'config', 'market', { config });
  return config;
}

export async function listTradingSessions() {
  return col<TradingSessionDoc>(COL.tradingSessions).find().sort({ symbolName: 1, dayOfWeek: 1 }).toArray();
}

export async function setTradingSession(actorId: string, session: Partial<TradingSessionDoc>) {
  const filter: any = { symbolName: session.symbolName ?? null, dayOfWeek: session.dayOfWeek };
  const doc = { ...session, createdAt: new Date() };
  await col<TradingSessionDoc>(COL.tradingSessions).updateOne(filter, { $set: doc as any }, { upsert: true });
  await logAction(actorId, 'market.session.update', 'session', session.symbolName ?? 'global', { session });
  return doc;
}

export async function emergencyHalt(actorId: string, symbolName?: string) {
  if (symbolName) {
    await col<MarketConfigDoc>(COL.marketConfig).updateOne(
      { key: `halt_${symbolName}` },
      { $set: { key: `halt_${symbolName}`, value: true, updatedBy: new ObjectId(actorId), updatedAt: new Date() } },
      { upsert: true },
    );
  } else {
    await col<MarketConfigDoc>(COL.marketConfig).updateOne(
      { key: 'global_trading_halt' },
      { $set: { key: 'global_trading_halt', value: true, updatedBy: new ObjectId(actorId), updatedAt: new Date() } },
      { upsert: true },
    );
  }
  await logAction(actorId, 'market.halt', 'market', symbolName ?? 'global', {});
  return { halted: true, symbol: symbolName ?? 'global' };
}

export async function resumeTrading(actorId: string, symbolName?: string) {
  if (symbolName) {
    await col<MarketConfigDoc>(COL.marketConfig).updateOne(
      { key: `halt_${symbolName}` },
      { $set: { key: `halt_${symbolName}`, value: false, updatedBy: new ObjectId(actorId), updatedAt: new Date() } },
      { upsert: true },
    );
  } else {
    await col<MarketConfigDoc>(COL.marketConfig).updateOne(
      { key: 'global_trading_halt' },
      { $set: { key: 'global_trading_halt', value: false, updatedBy: new ObjectId(actorId), updatedAt: new Date() } },
      { upsert: true },
    );
  }
  await logAction(actorId, 'market.resume', 'market', symbolName ?? 'global', {});
  return { resumed: true, symbol: symbolName ?? 'global' };
}

export async function listFeedProviders() {
  return col<FeedProviderDoc>(COL.feedProviders).find().sort({ priority: 1 }).toArray();
}

export async function updateFeedProvider(actorId: string, id: string, patch: Record<string, unknown>) {
  const provider = await col<FeedProviderDoc>(COL.feedProviders).findOne({ _id: oid(id) });
  if (!provider) throw notFound('Feed provider not found');
  await col<FeedProviderDoc>(COL.feedProviders).updateOne({ _id: provider._id }, { $set: patch });
  await logAction(actorId, 'feed_provider.update', 'feed_provider', id, { patch });
  return { id, ...patch };
}

export async function getFeedHealth() {
  const providers = await col<FeedProviderDoc>(COL.feedProviders).find().toArray();
  return {
    providers: providers.map(p => ({
      name: p.name, type: p.type, healthStatus: p.healthStatus,
      priority: p.priority, lastCheckAt: p.lastCheckAt, errorCount: p.errorCount ?? 0,
    })),
    overallStatus: providers.every(p => p.healthStatus === 'HEALTHY') ? 'HEALTHY' :
      providers.some(p => p.healthStatus === 'DOWN') ? 'DEGRADED' : 'HEALTHY',
  };
}

export async function getMarketDashboard() {
  const [totalSymbols, enabledSymbols, openPositions, todayTrades] = await Promise.all([
    col(COL.symbols).countDocuments(),
    col(COL.symbols).countDocuments({ enabled: true }),
    col(COL.positions).countDocuments({ status: 'OPEN' }),
    col(COL.tradeHistory).countDocuments({ closeTime: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } }),
  ]);

  // Volume by symbol
  const volumeBySymbol = await col(COL.tradeHistory).aggregate([
    { $match: { closeTime: { $gte: new Date(Date.now() - 86400_000) } } },
    { $group: { _id: '$symbolName', volume: { $sum: '$lots' }, profit: { $sum: '$profit' }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]).toArray();

  const haltStatus = await col<MarketConfigDoc>(COL.marketConfig).findOne({ key: 'global_trading_halt' });

  return { totalSymbols, enabledSymbols, openPositions, todayTrades, volumeBySymbol, tradingHalted: haltStatus?.value === true };
}

// ══════════════════════════════════════════════════════════════════════════
//  RISK MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════
export async function listRiskRules() {
  return col<RiskRuleDoc>(COL.riskRules).find().sort({ type: 1, createdAt: -1 }).toArray();
}

export async function createRiskRule(actorId: string, data: Partial<RiskRuleDoc>) {
  const doc: RiskRuleDoc = {
    ...data as any,
    enabled: data.enabled ?? true,
    createdBy: new ObjectId(actorId),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const { insertedId } = await col<RiskRuleDoc>(COL.riskRules).insertOne(doc);
  await logAction(actorId, 'risk.rule.create', 'risk_rule', insertedId.toString(), { data });
  return { id: insertedId.toString(), ...doc };
}

export async function updateRiskRule(actorId: string, id: string, patch: Record<string, unknown>) {
  const rule = await col<RiskRuleDoc>(COL.riskRules).findOne({ _id: oid(id) });
  if (!rule) throw notFound('Risk rule not found');
  const before = { ...rule };
  delete (before as any)._id;
  await col<RiskRuleDoc>(COL.riskRules).updateOne({ _id: rule._id }, { $set: { ...patch, updatedAt: new Date() } });
  await logAction(actorId, 'risk.rule.update', 'risk_rule', id, { patch }, before, patch);
  return { id, ...patch };
}

export async function deleteRiskRule(actorId: string, id: string) {
  const rule = await col<RiskRuleDoc>(COL.riskRules).findOne({ _id: oid(id) });
  if (!rule) throw notFound('Risk rule not found');
  await col<RiskRuleDoc>(COL.riskRules).deleteOne({ _id: rule._id });
  await logAction(actorId, 'risk.rule.delete', 'risk_rule', id, { name: rule.name });
  return { deleted: true, id };
}

export async function getRiskDashboard() {
  const [totalRules, activeRules, openPositions] = await Promise.all([
    col<RiskRuleDoc>(COL.riskRules).countDocuments(),
    col<RiskRuleDoc>(COL.riskRules).countDocuments({ enabled: true }),
    col(COL.positions).find({ status: 'OPEN' }).toArray(),
  ]);

  // Total exposure
  const totalExposure = openPositions.reduce((sum, p) => sum + (p.marginUsed || 0), 0);
  const totalVolume = openPositions.reduce((sum, p) => sum + p.lots, 0);

  // Exposure by symbol
  const exposureBySymbol: Record<string, { margin: number; lots: number; count: number }> = {};
  for (const p of openPositions) {
    if (!exposureBySymbol[p.symbolName]) exposureBySymbol[p.symbolName] = { margin: 0, lots: 0, count: 0 };
    exposureBySymbol[p.symbolName].margin += p.marginUsed || 0;
    exposureBySymbol[p.symbolName].lots += p.lots;
    exposureBySymbol[p.symbolName].count++;
  }

  return { totalRules, activeRules, openPositionCount: openPositions.length, totalExposure, totalVolume, exposureBySymbol };
}

// ══════════════════════════════════════════════════════════════════════════
//  COMMUNICATION
// ══════════════════════════════════════════════════════════════════════════
export async function sendUserEmail(actorId: string, userId: string, subject: string, body: string) {
  const user = await col<UserDoc>(COL.users).findOne({ _id: oid(userId) });
  if (!user) throw notFound('User not found');
  const doc: CommunicationDoc = {
    type: 'email', channel: 'email', subject, body,
    sentBy: new ObjectId(actorId), recipientIds: [user._id!],
    sentAt: new Date(), status: 'SENT',
  };
  await col<CommunicationDoc>(COL.communications).insertOne(doc);
  await logAction(actorId, 'communication.email', 'user', userId, { subject });
  return { sent: true, recipient: user.email, subject };
}

export async function sendUserSms(actorId: string, userId: string, message: string) {
  const user = await col<UserDoc>(COL.users).findOne({ _id: oid(userId) });
  if (!user) throw notFound('User not found');
  if (!user.phone) throw badRequest('User has no phone number');
  const doc: CommunicationDoc = {
    type: 'sms', channel: 'sms', body: message,
    sentBy: new ObjectId(actorId), recipientIds: [user._id!],
    sentAt: new Date(), status: 'SENT',
  };
  await col<CommunicationDoc>(COL.communications).insertOne(doc);
  await logAction(actorId, 'communication.sms', 'user', userId, { message });
  return { sent: true, recipient: user.phone };
}

export async function broadcastNotification(actorId: string, data: {
  subject: string; body: string; channel: string; filter?: Record<string, unknown>;
}) {
  const filter: any = data.filter || {};
  const users = await col<UserDoc>(COL.users).find(filter, { projection: { _id: 1 } }).limit(10000).toArray();
  const recipientIds = users.map(u => u._id!);

  const doc: CommunicationDoc = {
    type: data.channel as any, channel: data.channel,
    subject: data.subject, body: data.body,
    sentBy: new ObjectId(actorId), recipientIds, filter: data.filter,
    sentAt: new Date(), status: 'SENT',
  };
  await col<CommunicationDoc>(COL.communications).insertOne(doc);
  await logAction(actorId, 'communication.broadcast', 'broadcast', undefined, { channel: data.channel, recipientCount: recipientIds.length });
  return { sent: true, recipientCount: recipientIds.length };
}

export async function listCommunications(opts: { type?: string; page?: number; limit?: number }) {
  const { page, limit } = clampPage(opts.page, opts.limit);
  const filter: any = {};
  if (opts.type) filter.type = opts.type;
  const [items, total] = await Promise.all([
    col<CommunicationDoc>(COL.communications).find(filter).sort({ sentAt: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
    col<CommunicationDoc>(COL.communications).countDocuments(filter),
  ]);
  return { items, total, page, limit };
}

// ══════════════════════════════════════════════════════════════════════════
//  AUDIT LOG (enhanced)
// ══════════════════════════════════════════════════════════════════════════
export async function listAuditLog(opts: {
  action?: string; actorId?: string; targetType?: string;
  from?: string; to?: string; page?: number; limit?: number;
}) {
  const { page, limit } = clampPage(opts.page, opts.limit);
  const filter: any = {};
  if (opts.action) filter.action = opts.action;
  if (opts.actorId) filter.actorId = oid(opts.actorId);
  if (opts.targetType) filter.targetType = opts.targetType;
  if (opts.from || opts.to) {
    filter.createdAt = {};
    if (opts.from) filter.createdAt.$gte = new Date(opts.from);
    if (opts.to) filter.createdAt.$lte = new Date(opts.to);
  }
  const [items, total] = await Promise.all([
    col<AdminActionLogDoc>(COL.adminActionLog).find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
    col<AdminActionLogDoc>(COL.adminActionLog).countDocuments(filter),
  ]);
  return { items, total, page, limit };
}

export async function listActionLog(opts: { page?: number; limit?: number }) {
  const { page, limit } = clampPage(opts.page, opts.limit);
  const [items, total] = await Promise.all([
    col<AdminActionLogDoc>(COL.adminActionLog).find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
    col<AdminActionLogDoc>(COL.adminActionLog).countDocuments(),
  ]);
  return { items, total, page, limit };
}

export async function exportAuditLog(opts: { action?: string; from?: string; to?: string }) {
  const filter: any = {};
  if (opts.action) filter.action = opts.action;
  if (opts.from || opts.to) {
    filter.createdAt = {};
    if (opts.from) filter.createdAt.$gte = new Date(opts.from);
    if (opts.to) filter.createdAt.$lte = new Date(opts.to);
  }
  const items = await col<AdminActionLogDoc>(COL.adminActionLog).find(filter).sort({ createdAt: -1 }).limit(10000).toArray();
  // CSV export
  const headers = ['timestamp', 'actorId', 'action', 'targetType', 'targetId', 'meta'];
  const rows = items.map(i => [
    i.createdAt.toISOString(), i.actorId.toString(), i.action, i.targetType, i.targetId ?? '', JSON.stringify(i.meta ?? {}),
  ]);
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

// ══════════════════════════════════════════════════════════════════════════
//  SECURITY EVENTS
// ══════════════════════════════════════════════════════════════════════════
export async function listSecurityEvents(opts: { type?: string; userId?: string; page?: number; limit?: number }) {
  const { page, limit } = clampPage(opts.page, opts.limit);
  const filter: any = {};
  if (opts.type) filter.type = opts.type;
  if (opts.userId) filter.userId = oid(opts.userId);
  const [items, total] = await Promise.all([
    col<SecurityEventDoc>(COL.securityEvents).find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
    col<SecurityEventDoc>(COL.securityEvents).countDocuments(filter),
  ]);
  return { items, total, page, limit };
}

// ══════════════════════════════════════════════════════════════════════════
//  MONITORING & SYSTEM HEALTH
// ══════════════════════════════════════════════════════════════════════════
export async function getSystemHealth() {
  const db = col(COL.users).find().limit(1).toArray().then(() => 'connected').catch(() => 'error');
  const redis = 'unknown'; // Redis health requires redis client

  const [userCount, activeSessions, openPositions] = await Promise.all([
    col<UserDoc>(COL.users).countDocuments(),
    col(COL.refreshTokens).countDocuments({ revokedAt: null }),
    col(COL.positions).countDocuments({ status: 'OPEN' }),
  ]);

  const haltConfig = await col<MarketConfigDoc>(COL.marketConfig).findOne({ key: 'global_trading_halt' });
  const feedProviders = await col<FeedProviderDoc>(COL.feedProviders).find().toArray();

  return {
    database: await db,
    redis,
    userCount,
    activeSessions,
    openPositions,
    tradingHalted: haltConfig?.value === true,
    feedProviders: feedProviders.map(p => ({ name: p.name, status: p.healthStatus })),
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
  };
}

export async function getPlatformStats() {
  const EMPLOYEE_ROLES = ['SUPER_ADMIN','ADMIN','OPERATIONS_MANAGER','FINANCE_MANAGER','RISK_MANAGER','COMPLIANCE_OFFICER','SUPPORT_MANAGER','SUPPORT_AGENT','SALES_MANAGER','SALES_AGENT','AFFILIATE_MANAGER','MARKETING_MANAGER','AUDITOR','READ_ONLY_ANALYST','MANAGER','EMPLOYEE','IB'];

  const [totalUsers, activeUsers, pendingUsers, restrictedUsers, pendingKyc, pendingWithdrawals, pendingDeposits, totalTrades, totalSymbols, totalEmployees, activePositions, totalAccounts] = await Promise.all([
    col<UserDoc>(COL.users).countDocuments(),
    col<UserDoc>(COL.users).countDocuments({ status: 'ACTIVE' }),
    col<UserDoc>(COL.users).countDocuments({ status: 'PENDING' }),
    col<UserDoc>(COL.users).countDocuments({ status: 'RESTRICTED' }),
    col(COL.kyc).countDocuments({ status: 'PENDING' }),
    col(COL.withdrawals).countDocuments({ status: 'PENDING' }),
    col(COL.deposits).countDocuments({ status: 'PENDING' }),
    col(COL.tradeHistory).countDocuments(),
    col(COL.symbols).countDocuments({ enabled: true }),
    col<UserDoc>(COL.users).countDocuments({ roleName: { $in: EMPLOYEE_ROLES } } as any),
    col(COL.positions).countDocuments({ status: 'OPEN' }),
    col(COL.tradingAccounts).countDocuments(),
  ]);

  // Financial aggregates
  const [totalDepositAgg, totalWithdrawalAgg, totalWalletBalance, totalFloatingPnL] = await Promise.all([
    col(COL.deposits).aggregate([
      { $match: { status: 'APPROVED' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]).toArray(),
    col(COL.withdrawals).aggregate([
      { $match: { status: { $in: ['APPROVED', 'PROCESSING'] } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]).toArray(),
    col(COL.wallets).aggregate([
      { $group: { _id: null, total: { $sum: '$balance' } } },
    ]).toArray(),
    col(COL.positions).aggregate([
      { $match: { status: 'OPEN' } },
      { $group: { _id: null, totalMargin: { $sum: '$marginUsed' }, totalPnL: { $sum: { $ifNull: ['$currentPnL', 0] } } } },
    ]).toArray(),
  ]);

  // Today's stats
  const today = new Date(new Date().setHours(0, 0, 0, 0));
  const [todaySignups, todayTrades, todayDeposits, todayWithdrawals] = await Promise.all([
    col<UserDoc>(COL.users).countDocuments({ createdAt: { $gte: today } }),
    col(COL.tradeHistory).countDocuments({ closeTime: { $gte: today } }),
    col(COL.deposits).aggregate([
      { $match: { createdAt: { $gte: today }, status: 'APPROVED' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]).toArray(),
    col(COL.withdrawals).aggregate([
      { $match: { createdAt: { $gte: today }, status: 'APPROVED' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]).toArray(),
  ]);

  // Support tickets
  const [openTickets, totalTickets] = await Promise.all([
    col(COL.supportTickets).countDocuments({ status: { $in: ['OPEN', 'ESCALATED'] } }),
    col(COL.supportTickets).countDocuments(),
  ]);

  return {
    totalUsers, activeUsers, pendingUsers, restrictedUsers,
    totalEmployees,
    pendingKyc, pendingWithdrawals, pendingDeposits,
    totalTrades, totalSymbols, activePositions, totalAccounts,
    // Financial
    totalDeposits: totalDepositAgg[0] || { total: 0, count: 0 },
    totalWithdrawals: totalWithdrawalAgg[0] || { total: 0, count: 0 },
    totalWalletBalance: totalWalletBalance[0]?.total || 0,
    totalFloatingPnL: totalFloatingPnL[0]?.totalPnL || 0,
    totalMarginUsed: totalFloatingPnL[0]?.totalMargin || 0,
    // Support
    openTickets, totalTickets,
    // Today
    today: {
      signups: todaySignups,
      trades: todayTrades,
      deposits: todayDeposits[0] || { total: 0, count: 0 },
      withdrawals: todayWithdrawals[0] || { total: 0, count: 0 },
    },
  };
}

// ══════════════════════════════════════════════════════════════════════════
//  SETTINGS
// ══════════════════════════════════════════════════════════════════════════
export async function getPlatformSettings() {
  const settings = await col(COL.settings).find().toArray();
  const result: Record<string, string> = {};
  for (const s of settings) result[s._id] = s.value;
  return result;
}

export async function updatePlatformSettings(actorId: string, settings: Record<string, string>) {
  for (const [key, value] of Object.entries(settings)) {
    await col(COL.settings).updateOne({ _id: key as any }, { $set: { value } }, { upsert: true });
  }
  await logAction(actorId, 'settings.update', 'settings', 'platform', { settings });
  return settings;
}

// ══════════════════════════════════════════════════════════════════════════
//  ACCOUNT TYPES
// ══════════════════════════════════════════════════════════════════════════
export async function listAccountTypes() {
  return col<AccountTypeConfigDoc>(COL.accountTypes)
    .find()
    .sort({ sortOrder: 1, createdAt: 1 })
    .toArray();
}

export async function createAccountType(actorId: string, data: Omit<AccountTypeConfigDoc, '_id' | 'createdAt' | 'updatedAt' | 'createdBy'>) {
  // Check name uniqueness
  const exists = await col<AccountTypeConfigDoc>(COL.accountTypes).findOne({ name: data.name.toUpperCase() });
  if (exists) throw badRequest(`Account type "${data.name}" already exists`);

  const now = new Date();
  const doc: AccountTypeConfigDoc = {
    ...data,
    name: data.name.toUpperCase(),
    features: data.features || [],
    enabled: data.enabled ?? true,
    sortOrder: data.sortOrder ?? 0,
    createdBy: new ObjectId(actorId),
    createdAt: now,
    updatedAt: now,
  };
  const { insertedId } = await col<AccountTypeConfigDoc>(COL.accountTypes).insertOne(doc);
  await logAction(actorId, 'account_type.create', 'account_type', insertedId.toString(), { name: doc.name });
  return { ...doc, _id: insertedId };
}

export async function updateAccountType(actorId: string, id: string, patch: Partial<AccountTypeConfigDoc>) {
  const existing = await col<AccountTypeConfigDoc>(COL.accountTypes).findOne({ _id: oid(id) });
  if (!existing) throw notFound('Account type not found');

  // If renaming, check uniqueness
  if (patch.name && patch.name.toUpperCase() !== existing.name) {
    const dup = await col<AccountTypeConfigDoc>(COL.accountTypes).findOne({ name: patch.name.toUpperCase() });
    if (dup) throw badRequest(`Account type "${patch.name}" already exists`);
    patch.name = patch.name.toUpperCase();
  }

  const update = { ...patch, updatedAt: new Date() };
  delete (update as any)._id;
  delete (update as any).createdAt;
  delete (update as any).createdBy;

  await col<AccountTypeConfigDoc>(COL.accountTypes).updateOne({ _id: oid(id) }, { $set: update });
  await logAction(actorId, 'account_type.update', 'account_type', id, { patch });
  return { ...existing, ...update };
}

export async function deleteAccountType(actorId: string, id: string) {
  const existing = await col<AccountTypeConfigDoc>(COL.accountTypes).findOne({ _id: oid(id) });
  if (!existing) throw notFound('Account type not found');

  // Check if any accounts use this type
  const accountCount = await col(COL.tradingAccounts).countDocuments({ type: existing.name });
  if (accountCount > 0) {
    throw badRequest(`Cannot delete: ${accountCount} accounts are using this type. Disable it instead.`);
  }

  await col(COL.accountTypes).deleteOne({ _id: oid(id) });
  await logAction(actorId, 'account_type.delete', 'account_type', id, { name: existing.name });
}

export async function toggleAccountType(actorId: string, id: string) {
  const existing = await col<AccountTypeConfigDoc>(COL.accountTypes).findOne({ _id: oid(id) });
  if (!existing) throw notFound('Account type not found');

  const enabled = !existing.enabled;
  await col<AccountTypeConfigDoc>(COL.accountTypes).updateOne({ _id: oid(id) }, { $set: { enabled, updatedAt: new Date() } });
  await logAction(actorId, enabled ? 'account_type.enable' : 'account_type.disable', 'account_type', id, { name: existing.name });
  return { ...existing, enabled };
}

// ══════════════════════════════════════════════════════════════════════════
//  TRADING ACCOUNTS (Admin Management)
// ══════════════════════════════════════════════════════════════════════════
export async function listTradingAccounts(opts: {
  status?: string; userId?: string; accountCategory?: string; page?: number; limit?: number;
}) {
  const { page, limit } = clampPage(opts.page, opts.limit);
  const filter: any = {};
  if (opts.status) filter.status = opts.status;
  if (opts.userId) filter.userId = new ObjectId(opts.userId);
  if (opts.accountCategory) filter.accountCategory = opts.accountCategory;

  const [items, total] = await Promise.all([
    col<TradingAccountDoc>(COL.tradingAccounts)
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    col(COL.tradingAccounts).countDocuments(filter),
  ]);

  // Enrich with user info
  const userIds = [...new Set(items.map(i => i.userId.toString()))];
  const users = await col<UserDoc>(COL.users)
    .find({ _id: { $in: userIds.map(id => new ObjectId(id)) } })
    .project({ passwordHash: 0 })
    .toArray();
  const userMap = Object.fromEntries(users.map(u => [u._id!.toString(), u]));

  return {
    items: items.map(a => ({
      ...a,
      user: userMap[a.userId.toString()] || null,
    })),
    total, page, limit,
  };
}

export async function activateTradingAccount(actorId: string, accountId: string) {
  const account = await col<TradingAccountDoc>(COL.tradingAccounts).findOne({ _id: oid(accountId) });
  if (!account) throw notFound('Trading account not found');

  await col(COL.tradingAccounts).updateOne(
    { _id: oid(accountId) },
    { $set: { status: 'ACTIVE', updatedAt: new Date() } },
  );

  // Also activate the user if they were PENDING
  if (account.userId) {
    await col(COL.users).updateOne(
      { _id: account.userId, status: 'PENDING' },
      { $set: { status: 'ACTIVE', updatedAt: new Date() } },
    );
  }

  await logAction(actorId, 'trading_account.activate', 'trading_account', accountId, {
    login: account.login,
    previousStatus: account.status,
  });

  return { ...account, status: 'ACTIVE' };
}

export async function deactivateTradingAccount(actorId: string, accountId: string) {
  const account = await col<TradingAccountDoc>(COL.tradingAccounts).findOne({ _id: oid(accountId) });
  if (!account) throw notFound('Trading account not found');

  await col(COL.tradingAccounts).updateOne(
    { _id: oid(accountId) },
    { $set: { status: 'SUSPENDED', updatedAt: new Date() } },
  );

  await logAction(actorId, 'trading_account.deactivate', 'trading_account', accountId, {
    login: account.login,
    previousStatus: account.status,
  });

  return { ...account, status: 'SUSPENDED' };
}
