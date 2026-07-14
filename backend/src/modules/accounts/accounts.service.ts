// ============================================================================
//  accounts.service.ts — trading account provisioning (native Mongo driver).
// ============================================================================
import { ObjectId } from 'mongodb';
import { col, COL, nextSequence, oid } from '../../db/collections';
import { TradingAccountDoc, AccountTypeConfigDoc } from '../../db/models';
import { notFound, badRequest } from '../../common/errors';
import crypto from 'crypto';

const LOGIN_BASE = 5000000;

function generatePassword(): string {
  return crypto.randomBytes(6).toString('base64url').slice(0, 10);
}

// Get all enabled account types that clients can open
export async function getAvailableAccountTypes() {
  return col<AccountTypeConfigDoc>(COL.accountTypes)
    .find({ enabled: true })
    .sort({ sortOrder: 1 })
    .toArray();
}

// Get only LIVE account types (for Create Account flow)
export async function getLiveAccountTypes() {
  return col<AccountTypeConfigDoc>(COL.accountTypes)
    .find({ enabled: true, category: 'LIVE' })
    .sort({ sortOrder: 1 })
    .toArray();
}

// Get only DEMO account types
export async function getDemoAccountTypes() {
  return col<AccountTypeConfigDoc>(COL.accountTypes)
    .find({ enabled: true, category: 'DEMO' })
    .sort({ sortOrder: 1 })
    .toArray();
}

export async function createAccount(userId: string, input: {
  accountTypeId: string; leverage?: number; currency?: string;
}) {
  // Validate the account type exists and is enabled
  const accountType = await col<AccountTypeConfigDoc>(COL.accountTypes).findOne({
    _id: oid(input.accountTypeId),
    enabled: true,
  });
  if (!accountType) throw badRequest('Invalid or disabled account type');

  // Validate leverage
  const leverage = input.leverage ?? accountType.defaultLeverage;
  if (leverage > accountType.maxLeverage) {
    throw badRequest(`Maximum leverage for ${accountType.displayName} is 1:${accountType.maxLeverage}`);
  }

  // Validate currency
  const currency = input.currency ?? accountType.currency[0] ?? 'USD';
  if (!accountType.currency.includes(currency)) {
    throw badRequest(`Currency ${currency} is not available for ${accountType.displayName}`);
  }

  const seq = await nextSequence('trading_account_login');
  const now = new Date();

  // Generate passwords for demo accounts
  const isDemo = accountType.category === 'DEMO';
  const investorPassword = isDemo ? generatePassword() : undefined;
  const tradingPassword = isDemo ? generatePassword() : undefined;

  const doc: TradingAccountDoc = {
    login: String(LOGIN_BASE + seq),
    userId: new ObjectId(userId),
    type: accountType.name,
    accountCategory: accountType.category,
    accountType: accountType.name,
    status: accountType.category === 'LIVE' ? 'PENDING' : 'ACTIVE',
    investorPassword,
    tradingPassword,
    currency,
    server: accountType.category === 'DEMO' ? 'Demo-1' : 'Live-1',
    leverage,
    balance: accountType.category === 'DEMO' ? accountType.defaultBalance : 0,
    credit: 0,
    createdAt: now, updatedAt: now,
  };
  const { insertedId } = await col<TradingAccountDoc>(COL.tradingAccounts).insertOne(doc);
  return { ...doc, _id: insertedId, accountType };
}

export async function listAccounts(userId: string) {
  return col<TradingAccountDoc>(COL.tradingAccounts)
    .find({ userId: new ObjectId(userId) })
    .sort({ createdAt: 1 })
    .toArray();
}

export async function getAccount(userId: string, accountId: string) {
  const account = await col<TradingAccountDoc>(COL.tradingAccounts).findOne({ _id: oid(accountId) });
  if (!account || account.userId.toString() !== userId) throw notFound('Account not found');
  return account;
}
