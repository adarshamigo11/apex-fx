import { Collection, Document, ObjectId } from 'mongodb';
import { getDb } from '../config/mongo';

export const COL = {
  users: 'users',
  roles: 'roles',
  refreshTokens: 'refresh_tokens',
  loginHistory: 'login_history',
  employeeHierarchy: 'employee_hierarchy',
  employeeProfiles: 'employee_profiles',
  tradingAccounts: 'trading_accounts',
  symbols: 'symbols',
  priceTicks: 'price_ticks',
  candles: 'candles',
  orders: 'orders',
  positions: 'positions',
  tradeHistory: 'trade_history',
  wallets: 'wallets',
  deposits: 'deposits',
  withdrawals: 'withdrawals',
  kyc: 'kyc',
  commissions: 'commissions',
  supportTickets: 'support_tickets',
  ticketMessages: 'ticket_messages',
  notifications: 'notifications',
  adminActionLog: 'admin_action_log',
  otps: 'otps',
  settings: 'settings',
  counters: 'counters',
  accountTypes: 'account_types',
  // New collections for enterprise admin
  approvalRequests: 'approval_requests',
  deviceHistory: 'device_history',
  ipHistory: 'ip_history',
  securityEvents: 'security_events',
  marketConfig: 'market_config',
  tradingSessions: 'trading_sessions',
  riskRules: 'risk_rules',
  feedProviders: 'feed_providers',
  communications: 'communications',
} as const;

export const col = <T extends Document = any>(name: string): Collection<T> =>
  getDb().collection<T>(name);

// Atlas has no auto-increment; emulate sequential tickets atomically.
export async function nextSequence(name: string): Promise<number> {
  const r = await getDb().collection(COL.counters).findOneAndUpdate(
    { _id: name as any },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' },
  );
  return (r as any).seq ?? (r as any).value?.seq ?? 1;
}

export const oid = (id: string | ObjectId) => (typeof id === 'string' ? new ObjectId(id) : id);
