import { ObjectId } from 'mongodb';

// ─────────────────────────── ROLES & STATUSES ───────────────────────────
export type RoleName =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'OPERATIONS_MANAGER'
  | 'FINANCE_MANAGER'
  | 'RISK_MANAGER'
  | 'COMPLIANCE_OFFICER'
  | 'SUPPORT_MANAGER'
  | 'SUPPORT_AGENT'
  | 'SALES_MANAGER'
  | 'SALES_AGENT'
  | 'AFFILIATE_MANAGER'
  | 'MARKETING_MANAGER'
  | 'AUDITOR'
  | 'READ_ONLY_ANALYST'
  | 'MANAGER'   // legacy compat
  | 'EMPLOYEE' // legacy compat
  | 'IB'
  | 'USER';

export type UserStatus =
  | 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'BANNED'
  | 'FROZEN'  | 'RESTRICTED' | 'TERMINATED';

export type VerificationLevel = 'NONE' | 'BASIC' | 'ADVANCED' | 'PREMIUM';

export type AccountType = string; // Dynamic - defined by admin in account_types collection

export interface AccountTypeConfigDoc {
  _id?: ObjectId;
  name: string;           // e.g. 'STANDARD', 'RAW', 'VIP', 'DEMO'
  displayName: string;    // e.g. 'Standard Account', 'Raw Spread'
  description?: string;
  category: 'LIVE' | 'DEMO';
  defaultLeverage: number;
  maxLeverage: number;
  minDeposit: number;     // minimum initial deposit required
  defaultBalance: number; // for DEMO accounts
  commission: number;     // per lot in USD
  spreadMarkup: number;   // additional spread in points
  currency: string[];     // allowed currencies e.g. ['USD','EUR','GBP']
  features: string[];     // e.g. ['swap_free','expert_advisors','hedging']
  enabled: boolean;
  sortOrder: number;
  createdBy?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
export type OrderSide = 'BUY' | 'SELL';
export type OrderKind = 'MARKET' | 'BUY_LIMIT' | 'SELL_LIMIT' | 'BUY_STOP' | 'SELL_STOP';
export type TxStatus = 'PENDING' | 'PROCESSING' | 'APPROVED' | 'REJECTED';
export type KycStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type SymbolKind = 'FOREX' | 'METAL' | 'INDEX' | 'CRYPTO' | 'COMMODITY' | 'ETF' | 'STOCK';

// ─────────────────────── PERMISSION CONSTANTS ───────────────────────────
export const PERMISSIONS = {
  // Users
  'users.view': true, 'users.create': true, 'users.edit': true,
  'users.delete': true, 'users.approve': true, 'users.export': true,
  // KYC
  'kyc.view': true, 'kyc.review': true, 'kyc.approve': true,
  'kyc.reject': true, 'kyc.request_docs': true,
  // Wallet
  'wallet.view': true, 'wallet.credit': true, 'wallet.debit': true,
  'wallet.freeze': true, 'wallet.unfreeze': true,
  // Deposits
  'deposit.view': true, 'deposit.approve': true, 'deposit.reject': true, 'deposit.export': true,
  // Withdrawals
  'withdrawal.view': true, 'withdrawal.approve': true, 'withdrawal.reject': true, 'withdrawal.export': true,
  // Trades
  'trade.view': true, 'trade.view_all': true, 'trade.force_close': true, 'trade.export': true,
  // Symbols
  'symbol.view': true, 'symbol.create': true, 'symbol.edit': true,
  'symbol.enable': true, 'symbol.disable': true,
  // Market
  'market.view': true, 'market.configure': true, 'market.halt': true, 'market.resume': true,
  // Risk
  'risk.view': true, 'risk.configure': true, 'risk.alerts': true,
  // Employees
  'employee.view': true, 'employee.create': true, 'employee.edit': true,
  'employee.terminate': true, 'employee.reset_password': true,
  // Roles
  'role.view': true, 'role.create': true, 'role.edit': true,
  'role.delete': true, 'role.assign': true,
  // Audit
  'audit.view': true, 'audit.export': true,
  // Support
  'support.view': true, 'support.handle': true, 'support.escalate': true, 'support.resolve': true,
  // Finance
  'finance.view': true, 'finance.adjust_balance': true, 'finance.export': true,
  // Communication
  'communication.view': true, 'communication.send_email': true,
  'communication.send_sms': true, 'communication.broadcast': true,
  // Approvals
  'approval.view': true, 'approval.create': true, 'approval.approve': true, 'approval.reject': true,
  // Settings
  'settings.view': true, 'settings.edit': true,
} as const;

export type Permission = keyof typeof PERMISSIONS;
export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

// ─────────────────────── EXISTING MODELS ────────────────────────────────
export interface RoleDoc {
  _id?: ObjectId;
  name: string;
  description?: string;
  permissions: Permission[];
  isSystem?: boolean;
  userCount?: number;
  createdAt: Date;
}

export interface UserDoc {
  _id?: ObjectId;
  email: string; phone?: string; passwordHash: string;
  firstName?: string; lastName?: string;
  status: UserStatus; emailVerified: boolean;
  twoFactorSecret?: string; twoFactorEnabled: boolean;
  roleName: RoleName;
  verificationLevel?: VerificationLevel;
  restrictions?: string[];
  referralCode: string; referredById?: ObjectId | null;
  lastLoginAt?: Date | null;
  createdAt: Date; updatedAt: Date;
}

export interface RefreshTokenDoc {
  _id?: ObjectId; userId: ObjectId; tokenHash: string;
  expiresAt: Date; revokedAt?: Date | null; ip?: string; userAgent?: string; createdAt: Date;
}

export interface SymbolDoc {
  _id?: ObjectId; name: string; displayName: string;
  kind: SymbolKind;
  base: string; quote: string; contractSize: number; digits: number;
  minLot: number; maxLot: number; lotStep: number;
  spreadPoints: number; commission: number; marginPercent?: number;
  enabled: boolean; source: string; externalSymbol?: string;
  tradingHours?: { open: string; close: string };
  category?: string;
}

export interface TradingAccountDoc {
  _id?: ObjectId; login: string; userId: ObjectId;
  type: AccountType; status: 'ACTIVE' | 'DISABLED' | 'ARCHIVED';
  currency: string; server: string; leverage: number;
  balance: number; credit: number; createdAt: Date; updatedAt: Date;
}

export interface PositionDoc {
  _id?: ObjectId; ticket: number; accountId: ObjectId; symbolName: string;
  side: OrderSide; status: 'OPEN' | 'CLOSED';
  lots: number; openPrice: number; stopLoss?: number | null; takeProfit?: number | null;
  marginUsed: number; commission: number; swap: number; comment?: string; openTime: Date;
}

export interface TradeHistoryDoc {
  _id?: ObjectId; ticket: number; accountId: ObjectId; symbolName: string; positionId: ObjectId;
  side: OrderSide; lots: number; openPrice: number; closePrice: number;
  stopLoss?: number | null; takeProfit?: number | null;
  profit: number; commission: number; swap: number;
  closeReason: 'MANUAL' | 'STOP_LOSS' | 'TAKE_PROFIT' | 'STOP_OUT' | 'ADMIN';
  openTime: Date; closeTime: Date;
}

export interface KycDoc {
  _id?: ObjectId; userId: ObjectId;
  fullName: string; country: string; documentType: string; documentNumber: string;
  status: KycStatus; reviewedBy?: ObjectId | null; reviewNote?: string;
  requestedDocs?: string[];
  createdAt: Date; updatedAt: Date;
}

export interface DepositDoc {
  _id?: ObjectId; userId: ObjectId; amount: number; currency: string;
  status: TxStatus; reviewedBy?: ObjectId | null; reviewNote?: string;
  createdAt: Date; updatedAt: Date;
}

export interface WithdrawalDoc {
  _id?: ObjectId; userId: ObjectId; amount: number; currency: string;
  status: TxStatus; reviewedBy?: ObjectId | null; reviewNote?: string;
  createdAt: Date; updatedAt: Date;
}

export interface AdminActionLogDoc {
  _id?: ObjectId;
  actorId: ObjectId;
  action: string;
  targetType: string;
  targetId?: string;
  meta?: Record<string, unknown>;
  beforeValue?: Record<string, unknown> | null;
  afterValue?: Record<string, unknown> | null;
  ip?: string;
  userAgent?: string;
  approvalId?: ObjectId | null;
  createdAt: Date;
}

// ─────────────────────── NEW MODELS ─────────────────────────────────────

export interface EmployeeProfileDoc {
  _id?: ObjectId;
  userId: ObjectId;
  department: string;
  title: string;
  managerId?: ObjectId | null;
  hireDate: Date;
  terminationDate?: Date | null;
  terminationReason?: string;
  notes: { date: Date; note: string; addedBy: ObjectId }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovalRequestDoc {
  _id?: ObjectId;
  type: string;            // e.g. 'deposit', 'withdrawal', 'employee_creation', 'role_change'
  entity: string;          // e.g. 'user', 'wallet', 'employee'
  entityId: string;
  data?: Record<string, unknown>;
  requestedBy: ObjectId;
  currentLevel: number;
  totalLevels: number;
  approvals: { approverId: ObjectId; decision: 'PENDING' | 'APPROVED' | 'REJECTED'; note?: string; decidedAt?: Date }[];
  status: ApprovalStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeviceHistoryDoc {
  _id?: ObjectId;
  userId: ObjectId;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  os?: string;
  browser?: string;
  fingerprint?: string;
  lastSeenAt: Date;
  createdAt: Date;
}

export interface IpHistoryDoc {
  _id?: ObjectId;
  userId: ObjectId;
  ip: string;
  city?: string;
  country?: string;
  isp?: string;
  createdAt: Date;
}

export interface SecurityEventDoc {
  _id?: ObjectId;
  userId: ObjectId;
  type: string;  // 'password_change', 'login_failed', '2fa_changed', 'ip_change', 'suspicious_activity'
  description: string;
  ip?: string;
  deviceId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface MarketConfigDoc {
  _id?: string;           // key-based: 'global_halt', 'max_leverage', etc.
  key: string;
  value: unknown;
  updatedBy?: ObjectId;
  updatedAt: Date;
}

export interface TradingSessionDoc {
  _id?: ObjectId;
  symbolName?: string;    // null = global default
  dayOfWeek: number;      // 0=Sun .. 6=Sat
  openTime: string;       // 'HH:mm' UTC
  closeTime: string;      // 'HH:mm' UTC
  status: 'OPEN' | 'CLOSED';
  createdAt: Date;
}

export interface RiskRuleDoc {
  _id?: ObjectId;
  type: 'EXPOSURE' | 'POSITION' | 'VOLUME' | 'MARGIN' | 'CIRCUIT_BREAKER';
  name: string;
  symbolName?: string;    // null = global
  maxExposure?: number;
  maxPosition?: number;
  maxVolume?: number;
  marginMultiplier?: number;
  circuitBreaker?: { threshold: number; action: 'ALERT' | 'HALT' };
  enabled: boolean;
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeedProviderDoc {
  _id?: ObjectId;
  name: string;
  type: 'binance' | 'twelvedata' | 'yahoo' | 'finnhub' | 'mock';
  url?: string;
  apiKeyRef?: string;
  priority: number;
  healthStatus: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  lastCheckAt?: Date;
  errorCount?: number;
  createdAt: Date;
}

export interface CommunicationDoc {
  _id?: ObjectId;
  type: 'email' | 'sms' | 'push' | 'internal';
  channel: string;
  subject?: string;
  body: string;
  sentBy: ObjectId;
  recipientIds?: ObjectId[];
  filter?: Record<string, unknown>; // for broadcasts
  sentAt: Date;
  status: 'SENT' | 'FAILED' | 'QUEUED';
}
