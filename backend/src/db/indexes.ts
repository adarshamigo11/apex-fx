// ============================================================================
//  indexes.ts — Atlas Indexes + Atlas Search index bootstrap + JSON-Schema
//  validation. Run once on startup; safe to re-run (idempotent).
// ============================================================================
import { getDb } from '../config/mongo';
import { COL } from './collections';

// ---- JSON Schema validators (server-side document validation) -------------
const USER_VALIDATOR = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['email', 'passwordHash', 'status', 'roleName', 'referralCode', 'createdAt'],
    properties: {
      email: { bsonType: 'string', pattern: '^.+@.+\\..+$' },
      status: { enum: ['PENDING', 'ACTIVE', 'SUSPENDED', 'BANNED', 'FROZEN', 'RESTRICTED', 'TERMINATED'] },
      roleName: { enum: [
        'SUPER_ADMIN', 'ADMIN', 'OPERATIONS_MANAGER', 'FINANCE_MANAGER', 'RISK_MANAGER',
        'COMPLIANCE_OFFICER', 'SUPPORT_MANAGER', 'SUPPORT_AGENT', 'SALES_MANAGER', 'SALES_AGENT',
        'AFFILIATE_MANAGER', 'MARKETING_MANAGER', 'AUDITOR', 'READ_ONLY_ANALYST',
        'MANAGER', 'EMPLOYEE', 'IB', 'USER',
      ] },
      twoFactorEnabled: { bsonType: 'bool' },
      verificationLevel: { enum: ['NONE', 'BASIC', 'ADVANCED', 'PREMIUM'] },
    },
  },
};

const POSITION_VALIDATOR = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['ticket', 'accountId', 'symbolName', 'side', 'lots', 'openPrice', 'marginUsed'],
    properties: {
      side: { enum: ['BUY', 'SELL'] },
      status: { enum: ['OPEN', 'CLOSED'] },
      lots: { bsonType: ['double', 'int'], minimum: 0 },
    },
  },
};

async function applyValidator(name: string, validator: object) {
  const db = getDb();
  const exists = await db.listCollections({ name }).hasNext();
  if (exists) {
    await db.command({ collMod: name, validator, validationLevel: 'moderate' }).catch(() => {});
  } else {
    await db.createCollection(name, { validator }).catch(() => {});
  }
}

// ---- Standard (Atlas) indexes ---------------------------------------------
export async function ensureIndexes() {
  const db = getDb();
  await applyValidator(COL.users, USER_VALIDATOR);
  await applyValidator(COL.positions, POSITION_VALIDATOR);

  // Users
  await db.collection(COL.users).createIndexes([
    { key: { email: 1 }, unique: true, name: 'uniq_email' },
    { key: { referralCode: 1 }, unique: true, name: 'uniq_refcode' },
    { key: { phone: 1 }, unique: true, sparse: true, name: 'uniq_phone' },
    { key: { status: 1 }, name: 'by_status' },
    { key: { referredById: 1 }, name: 'by_referrer' },
    { key: { roleName: 1 }, name: 'by_role' },
  ]);

  // Roles
  await db.collection(COL.roles).createIndex({ name: 1 }, { unique: true });

  // Refresh tokens
  await db.collection(COL.refreshTokens).createIndexes([
    { key: { tokenHash: 1 }, unique: true, name: 'uniq_tokenhash' },
    { key: { userId: 1 }, name: 'by_user' },
    { key: { expiresAt: 1 }, expireAfterSeconds: 0, name: 'ttl_expiry' },
  ]);

  // Symbols
  await db.collection(COL.symbols).createIndex({ name: 1 }, { unique: true });

  // Trading accounts
  await db.collection(COL.tradingAccounts).createIndexes([
    { key: { login: 1 }, unique: true },
    { key: { userId: 1 } },
  ]);

  // Positions
  await db.collection(COL.positions).createIndex({ accountId: 1, status: 1 });
  await db.collection(COL.positions).createIndex({ ticket: 1 }, { unique: true });

  // Trade history
  await db.collection(COL.tradeHistory).createIndex({ accountId: 1, closeTime: -1 });

  // Candles
  await db.collection(COL.candles).createIndex({ symbolName: 1, timeframe: 1, openTime: 1 }, { unique: true });

  // Price ticks
  await db.collection(COL.priceTicks).createIndex({ symbolName: 1, ts: -1 });

  // Deposits & Withdrawals
  await db.collection(COL.deposits).createIndexes([
    { key: { userId: 1, status: 1 } },
    { key: { status: 1, createdAt: -1 } },
  ]);
  await db.collection(COL.withdrawals).createIndexes([
    { key: { userId: 1, status: 1 } },
    { key: { status: 1, createdAt: -1 } },
  ]);

  // KYC
  await db.collection(COL.kyc).createIndexes([
    { key: { userId: 1, status: 1 } },
    { key: { status: 1, createdAt: -1 } },
  ]);

  // Notifications
  await db.collection(COL.notifications).createIndex({ userId: 1, read: 1 });

  // Admin action log
  await db.collection(COL.adminActionLog).createIndexes([
    { key: { actorId: 1, createdAt: -1 } },
    { key: { action: 1, createdAt: -1 } },
    { key: { targetType: 1, targetId: 1, createdAt: -1 } },
  ]);

  // OTPs
  await db.collection(COL.otps).createIndexes([
    { key: { identifier: 1, purpose: 1 }, unique: true, name: 'uniq_identifier_purpose' },
    { key: { expiresAt: 1 }, expireAfterSeconds: 0, name: 'ttl_expiry' },
  ]);

  // Login history
  await db.collection(COL.loginHistory).createIndexes([
    { key: { userId: 1, createdAt: -1 } },
    { key: { ip: 1, createdAt: -1 } },
  ]);

  // Employee profiles
  await db.collection(COL.employeeProfiles).createIndexes([
    { key: { userId: 1 }, unique: true },
    { key: { department: 1 } },
    { key: { managerId: 1 } },
  ]);

  // Approval requests
  await db.collection(COL.approvalRequests).createIndexes([
    { key: { status: 1, createdAt: -1 } },
    { key: { requestedBy: 1, createdAt: -1 } },
    { key: { type: 1, status: 1 } },
  ]);

  // Device history
  await db.collection(COL.deviceHistory).createIndexes([
    { key: { userId: 1, lastSeenAt: -1 } },
  ]);

  // IP history
  await db.collection(COL.ipHistory).createIndexes([
    { key: { userId: 1, createdAt: -1 } },
    { key: { ip: 1, createdAt: -1 } },
  ]);

  // Security events
  await db.collection(COL.securityEvents).createIndexes([
    { key: { userId: 1, createdAt: -1 } },
    { key: { type: 1, createdAt: -1 } },
  ]);

  // Market config
  await db.collection(COL.marketConfig).createIndex({ key: 1 }, { unique: true });

  // Trading sessions
  await db.collection(COL.tradingSessions).createIndexes([
    { key: { symbolName: 1, dayOfWeek: 1 } },
  ]);

  // Risk rules
  await db.collection(COL.riskRules).createIndexes([
    { key: { type: 1, enabled: 1 } },
    { key: { symbolName: 1 } },
  ]);

  // Feed providers
  await db.collection(COL.feedProviders).createIndex({ name: 1 }, { unique: true });

  // Communications
  await db.collection(COL.communications).createIndexes([
    { key: { sentBy: 1, sentAt: -1 } },
    { key: { type: 1, sentAt: -1 } },
  ]);

  // Support tickets
  await db.collection(COL.supportTickets).createIndexes([
    { key: { ticketId: 1 }, unique: true },
    { key: { userId: 1, status: 1 } },
    { key: { status: 1, priority: 1 } },
    { key: { category: 1 } },
    { key: { assignedTo: 1, status: 1 } },
    { key: { lastActivityAt: -1 } },
    { key: { createdAt: -1 } },
    { key: { tags: 1 } },
  ]);

  console.log('[mongo] standard indexes ensured');
  await ensureSearchIndexes();
}

// ---- Atlas Search indexes (only available on Atlas clusters) --------------
export async function ensureSearchIndexes() {
  const db = getDb();
  try {
    await db.collection(COL.users).createSearchIndex({
      name: 'users_search',
      definition: {
        mappings: {
          dynamic: false,
          fields: {
            email: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            referralCode: { type: 'string' },
          },
        },
      },
    } as any);
    await db.collection(COL.symbols).createSearchIndex({
      name: 'symbols_search',
      definition: {
        mappings: {
          dynamic: false,
          fields: {
            name: { type: 'string', analyzer: 'lucene.keyword' },
            displayName: { type: 'string' },
          },
        },
      },
    } as any);
    console.log('[atlas] search indexes ensured (users_search, symbols_search)');
  } catch (e: any) {
    console.warn('[atlas] search index skipped (needs Atlas cluster):', e.message);
  }
}
