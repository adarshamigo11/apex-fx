import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { ObjectId } from 'mongodb';
import { connectMongo, closeMongo } from '../config/mongo';
import { ensureIndexes } from '../db/indexes';
import { col, COL } from '../db/collections';
import { DEFAULT_SYMBOLS } from '../modules/marketdata/symbols';
import { Permission } from '../db/models';
import { nextSequence } from '../db/collections';

// ─────────────────── PERMISSION MATRIX ───────────────────────────────────
const PERM = {
  ALL_USERS:       ['users.view','users.create','users.edit','users.delete','users.approve','users.export'] as Permission[],
  MANAGE_USERS:    ['users.view','users.edit','users.approve'] as Permission[],
  VIEW_USERS:      ['users.view'] as Permission[],

  ALL_KYC:         ['kyc.view','kyc.review','kyc.approve','kyc.reject','kyc.request_docs'] as Permission[],
  REVIEW_KYC:      ['kyc.view','kyc.review','kyc.approve','kyc.reject'] as Permission[],
  VIEW_KYC:        ['kyc.view'] as Permission[],

  ALL_WALLET:      ['wallet.view','wallet.credit','wallet.debit','wallet.freeze','wallet.unfreeze'] as Permission[],
  MANAGE_WALLET:   ['wallet.view','wallet.credit','wallet.debit'] as Permission[],
  VIEW_WALLET:     ['wallet.view'] as Permission[],

  ALL_DEPOSIT:     ['deposit.view','deposit.approve','deposit.reject','deposit.export'] as Permission[],
  MANAGE_DEPOSIT:  ['deposit.view','deposit.approve','deposit.reject'] as Permission[],
  VIEW_DEPOSIT:    ['deposit.view'] as Permission[],

  ALL_WITHDRAWAL:  ['withdrawal.view','withdrawal.approve','withdrawal.reject','withdrawal.export'] as Permission[],
  MANAGE_WITHDRAWAL: ['withdrawal.view','withdrawal.approve','withdrawal.reject'] as Permission[],
  VIEW_WITHDRAWAL: ['withdrawal.view'] as Permission[],

  ALL_TRADE:       ['trade.view','trade.view_all','trade.force_close','trade.export'] as Permission[],
  VIEW_TRADE:      ['trade.view','trade.view_all'] as Permission[],

  ALL_SYMBOL:      ['symbol.view','symbol.create','symbol.edit','symbol.enable','symbol.disable'] as Permission[],
  MANAGE_SYMBOL:   ['symbol.view','symbol.edit','symbol.enable','symbol.disable'] as Permission[],
  VIEW_SYMBOL:     ['symbol.view'] as Permission[],

  ALL_MARKET:      ['market.view','market.configure','market.halt','market.resume'] as Permission[],
  MANAGE_MARKET:   ['market.view','market.halt','market.resume'] as Permission[],
  VIEW_MARKET:     ['market.view'] as Permission[],

  ALL_RISK:        ['risk.view','risk.configure','risk.alerts'] as Permission[],
  MANAGE_RISK:     ['risk.view','risk.configure'] as Permission[],
  VIEW_RISK:       ['risk.view','risk.alerts'] as Permission[],

  ALL_EMPLOYEE:    ['employee.view','employee.create','employee.edit','employee.terminate','employee.reset_password'] as Permission[],
  MANAGE_EMPLOYEE: ['employee.view','employee.edit'] as Permission[],
  VIEW_EMPLOYEE:   ['employee.view'] as Permission[],

  ALL_ROLE:        ['role.view','role.create','role.edit','role.delete','role.assign'] as Permission[],
  VIEW_ROLE:       ['role.view'] as Permission[],

  ALL_AUDIT:       ['audit.view','audit.export'] as Permission[],
  VIEW_AUDIT:      ['audit.view'] as Permission[],

  ALL_SUPPORT:     ['support.view','support.handle','support.escalate','support.resolve'] as Permission[],
  MANAGE_SUPPORT:  ['support.view','support.handle','support.escalate'] as Permission[],
  VIEW_SUPPORT:    ['support.view'] as Permission[],

  ALL_FINANCE:     ['finance.view','finance.adjust_balance','finance.export'] as Permission[],
  VIEW_FINANCE:    ['finance.view'] as Permission[],

  ALL_COMMS:       ['communication.view','communication.send_email','communication.send_sms','communication.broadcast'] as Permission[],
  VIEW_COMMS:      ['communication.view'] as Permission[],

  ALL_APPROVAL:    ['approval.view','approval.create','approval.approve','approval.reject'] as Permission[],
  VIEW_APPROVAL:   ['approval.view'] as Permission[],

  ALL_SETTINGS:    ['settings.view','settings.edit'] as Permission[],
  VIEW_SETTINGS:   ['settings.view'] as Permission[],
};

const ALL_PERMS = [
  ...PERM.ALL_USERS, ...PERM.ALL_KYC, ...PERM.ALL_WALLET, ...PERM.ALL_DEPOSIT,
  ...PERM.ALL_WITHDRAWAL, ...PERM.ALL_TRADE, ...PERM.ALL_SYMBOL, ...PERM.ALL_MARKET,
  ...PERM.ALL_RISK, ...PERM.ALL_EMPLOYEE, ...PERM.ALL_ROLE, ...PERM.ALL_AUDIT,
  ...PERM.ALL_SUPPORT, ...PERM.ALL_FINANCE, ...PERM.ALL_COMMS, ...PERM.ALL_APPROVAL,
  ...PERM.ALL_SETTINGS,
];

const ROLES: { name: string; permissions: Permission[]; description: string }[] = [
  {
    name: 'SUPER_ADMIN',
    permissions: ALL_PERMS as Permission[],
    description: 'Full system access with all permissions',
  },
  {
    name: 'ADMIN',
    permissions: ALL_PERMS.filter(p => !['settings.edit'].includes(p)) as Permission[],
    description: 'Near-full access except platform-critical settings',
  },
  {
    name: 'OPERATIONS_MANAGER',
    permissions: [
      ...PERM.MANAGE_USERS, ...PERM.REVIEW_KYC, ...PERM.MANAGE_WALLET,
      ...PERM.MANAGE_DEPOSIT, ...PERM.MANAGE_WITHDRAWAL, ...PERM.ALL_TRADE,
      ...PERM.MANAGE_SUPPORT, ...PERM.ALL_AUDIT, ...PERM.ALL_APPROVAL,
      ...PERM.VIEW_MARKET, ...PERM.VIEW_RISK, ...PERM.VIEW_FINANCE, ...PERM.VIEW_SETTINGS,
    ] as Permission[],
    description: 'Day-to-day platform operations',
  },
  {
    name: 'FINANCE_MANAGER',
    permissions: [
      ...PERM.VIEW_USERS, ...PERM.VIEW_KYC, ...PERM.ALL_WALLET,
      ...PERM.ALL_DEPOSIT, ...PERM.ALL_WITHDRAWAL, ...PERM.ALL_FINANCE,
      ...PERM.VIEW_TRADE, ...PERM.VIEW_AUDIT, ...PERM.ALL_APPROVAL, ...PERM.VIEW_SETTINGS,
    ] as Permission[],
    description: 'Financial operations and approvals',
  },
  {
    name: 'RISK_MANAGER',
    permissions: [
      ...PERM.VIEW_USERS, ...PERM.ALL_RISK, ...PERM.ALL_MARKET,
      ...PERM.VIEW_TRADE, ...PERM.MANAGE_SYMBOL, ...PERM.ALL_AUDIT,
      ...PERM.VIEW_FINANCE, ...PERM.VIEW_SETTINGS,
    ] as Permission[],
    description: 'Risk management and market controls',
  },
  {
    name: 'COMPLIANCE_OFFICER',
    permissions: [
      ...PERM.MANAGE_USERS, ...PERM.ALL_KYC, ...PERM.VIEW_WALLET,
      ...PERM.VIEW_DEPOSIT, ...PERM.VIEW_WITHDRAWAL, ...PERM.ALL_AUDIT,
      ...PERM.VIEW_SUPPORT, ...PERM.VIEW_COMMS, ...PERM.VIEW_SETTINGS,
    ] as Permission[],
    description: 'Compliance and regulatory oversight',
  },
  {
    name: 'SUPPORT_MANAGER',
    permissions: [
      ...PERM.MANAGE_USERS, ...PERM.ALL_SUPPORT, ...PERM.VIEW_KYC,
      ...PERM.VIEW_WALLET, ...PERM.VIEW_AUDIT, ...PERM.ALL_COMMS,
    ] as Permission[],
    description: 'Support team management',
  },
  {
    name: 'SUPPORT_AGENT',
    permissions: [
      ...PERM.VIEW_USERS, ...PERM.MANAGE_SUPPORT, ...PERM.VIEW_KYC,
      ...PERM.VIEW_WALLET, ...PERM.VIEW_COMMS,
    ] as Permission[],
    description: 'Customer support operations',
  },
  {
    name: 'SALES_MANAGER',
    permissions: [
      ...PERM.VIEW_USERS, ...PERM.VIEW_KYC, ...PERM.VIEW_WALLET,
      ...PERM.VIEW_SUPPORT, ...PERM.VIEW_COMMS, ...PERM.VIEW_FINANCE,
    ] as Permission[],
    description: 'Sales team oversight',
  },
  {
    name: 'SALES_AGENT',
    permissions: [
      ...PERM.VIEW_USERS, ...PERM.VIEW_KYC, ...PERM.VIEW_COMMS,
    ] as Permission[],
    description: 'Sales and client acquisition',
  },
  {
    name: 'AFFILIATE_MANAGER',
    permissions: [
      ...PERM.VIEW_USERS, ...PERM.VIEW_FINANCE, ...PERM.VIEW_COMMS,
    ] as Permission[],
    description: 'Affiliate and partner management',
  },
  {
    name: 'MARKETING_MANAGER',
    permissions: [
      ...PERM.VIEW_USERS, ...PERM.ALL_COMMS, ...PERM.VIEW_SUPPORT,
    ] as Permission[],
    description: 'Marketing and communications',
  },
  {
    name: 'AUDITOR',
    permissions: [
      ...PERM.ALL_AUDIT, ...PERM.VIEW_USERS, ...PERM.VIEW_TRADE,
      ...PERM.VIEW_FINANCE, ...PERM.VIEW_APPROVAL, ...PERM.VIEW_RISK,
    ] as Permission[],
    description: 'Audit and compliance review',
  },
  {
    name: 'READ_ONLY_ANALYST',
    permissions: [
      ...PERM.VIEW_USERS, ...PERM.VIEW_KYC, ...PERM.VIEW_WALLET,
      ...PERM.VIEW_DEPOSIT, ...PERM.VIEW_WITHDRAWAL, ...PERM.VIEW_TRADE,
      ...PERM.VIEW_SYMBOL, ...PERM.VIEW_MARKET, ...PERM.VIEW_RISK,
      ...PERM.VIEW_AUDIT, ...PERM.VIEW_FINANCE, ...PERM.VIEW_SETTINGS,
    ] as Permission[],
    description: 'Read-only analytics and reporting',
  },
  // Legacy roles (for backward compatibility)
  { name: 'MANAGER', permissions: PERM.MANAGE_USERS as Permission[], description: 'Legacy manager role' },
  { name: 'EMPLOYEE', permissions: ['support.handle'] as Permission[], description: 'Legacy employee role' },
  { name: 'IB', permissions: [] as Permission[], description: 'Introducing broker' },
  { name: 'USER', permissions: [] as Permission[], description: 'Regular user' },
];

// ─────────────────── SEED FUNCTION ───────────────────────────────────────
async function main() {
  await connectMongo();
  await ensureIndexes();

  // Seed roles
  for (const r of ROLES) {
    await col(COL.roles).updateOne(
      { name: r.name },
      { $set: { name: r.name, permissions: r.permissions, description: r.description, isSystem: true, createdAt: new Date() } },
      { upsert: true },
    );
  }
  console.log(`[seed] ${ROLES.length} roles seeded`);

  // Seed super admin user
  await col(COL.users).updateOne(
    { email: 'admin@platform.local' },
    { $setOnInsert: {
      email: 'admin@platform.local',
      passwordHash: await bcrypt.hash('Admin@12345', 12),
      firstName: 'Super', lastName: 'Admin',
      status: 'ACTIVE', emailVerified: true,
      twoFactorEnabled: false, roleName: 'SUPER_ADMIN',
      verificationLevel: 'PREMIUM',
      referralCode: crypto.randomBytes(4).toString('hex').toUpperCase(),
      referredById: null, lastLoginAt: null,
      createdAt: new Date(), updatedAt: new Date(),
    } },
    { upsert: true },
  );
  console.log('[seed] Super admin user: admin@platform.local / Admin@12345');

  // Seed symbols
  for (const s of DEFAULT_SYMBOLS) {
    await col(COL.symbols).updateOne(
      { name: s.name },
      { $set: {
        name: s.name, displayName: s.displayName, kind: s.kind,
        base: s.base, quote: s.quote,
        contractSize: s.contractSize, digits: s.digits,
        minLot: 0.01, maxLot: 100, lotStep: 0.01,
        spreadPoints: s.spreadPoints, commission: s.commission,
        enabled: true, source: s.source, externalSymbol: s.externalSymbol,
      } },
      { upsert: true },
    );
  }
  console.log(`[seed] ${DEFAULT_SYMBOLS.length} symbols seeded`);

  // Seed platform settings
  const settings = [
    { key: 'margin_call_level', value: '100' },
    { key: 'stop_out_level', value: '50' },
    { key: 'max_leverage', value: '500' },
    { key: 'min_deposit', value: '100' },
    { key: 'max_withdrawal', value: '50000' },
    { key: 'kyc_required_for_withdrawal', value: 'true' },
    { key: 'auto_approve_deposits_below', value: '1000' },
    { key: 'maintenance_mode', value: 'false' },
  ];
  for (const s of settings) {
    await col(COL.settings).updateOne(
      { _id: s.key as any },
      { $set: { value: s.value } },
      { upsert: true },
    );
  }
  console.log(`[seed] ${settings.length} platform settings seeded`);

  // Seed feed providers
  const feedProviders = [
    { name: 'Binance', type: 'binance', priority: 1, healthStatus: 'HEALTHY' as const },
    { name: 'Twelve Data', type: 'twelvedata', priority: 2, healthStatus: 'HEALTHY' as const },
    { name: 'Yahoo Finance', type: 'yahoo', priority: 3, healthStatus: 'HEALTHY' as const },
    { name: 'Finnhub', type: 'finnhub', priority: 4, healthStatus: 'HEALTHY' as const },
  ];
  for (const fp of feedProviders) {
    await col(COL.feedProviders).updateOne(
      { name: fp.name },
      { $set: { ...fp, createdAt: new Date() } },
      { upsert: true },
    );
  }
  console.log(`[seed] ${feedProviders.length} feed providers seeded`);

  // Seed market config
  const marketConfigs = [
    { key: 'global_trading_halt', value: false },
    { key: 'maintenance_mode', value: false },
    { key: 'default_leverage', value: 100 },
    { key: 'weekend_trading', value: false },
  ];
  for (const mc of marketConfigs) {
    await col(COL.marketConfig).updateOne(
      { key: mc.key },
      { $set: { ...mc, updatedAt: new Date() } },
      { upsert: true },
    );
  }
  console.log(`[seed] ${marketConfigs.length} market config entries seeded`);

  // ─────────────────── DEMO USERS & CLIENTS ───────────────────────────────────
  console.log('\n👥 Seeding demo users and clients...');

  const demoUsers = [
    {
      email: 'john.trader@email.com',
      password: 'Trader@123',
      firstName: 'John',
      lastName: 'Trader',
      role: 'USER',
      status: 'ACTIVE',
      balance: 100000,
      description: 'Active demo trader with $100K balance',
    },
    {
      email: 'sarah.investor@email.com',
      password: 'Invest@123',
      firstName: 'Sarah',
      lastName: 'Investor',
      role: 'USER',
      status: 'ACTIVE',
      balance: 250000,
      description: 'Premium trader with $250K balance',
    },
    {
      email: 'mike.newbie@email.com',
      password: 'Newbie@123',
      firstName: 'Mike',
      lastName: 'Newbie',
      role: 'USER',
      status: 'PENDING',
      balance: 50000,
      description: 'New user pending KYC',
    },
    {
      email: 'emma.pro@email.com',
      password: 'Pro@123',
      firstName: 'Emma',
      lastName: 'Professional',
      role: 'USER',
      status: 'ACTIVE',
      balance: 500000,
      description: 'Professional trader with $500K balance',
    },
    {
      email: 'alex.restricted@email.com',
      password: 'Restricted@123',
      firstName: 'Alex',
      lastName: 'Restricted',
      role: 'USER',
      status: 'RESTRICTED',
      balance: 75000,
      description: 'Restricted user (compliance issue)',
    },
  ];

  for (const du of demoUsers) {
    const email = du.email.toLowerCase();
    const existing = await col(COL.users).findOne({ email });
    
    if (!existing) {
      const now = new Date();
      const userId = new ObjectId();
      
      await col(COL.users).insertOne({
        _id: userId,
        email,
        passwordHash: await bcrypt.hash(du.password, 12),
        firstName: du.firstName,
        lastName: du.lastName,
        status: du.status,
        emailVerified: du.status === 'ACTIVE',
        twoFactorEnabled: false,
        roleName: du.role,
        verificationLevel: du.balance > 100000 ? 'PREMIUM' : 'STANDARD',
        referralCode: crypto.randomBytes(4).toString('hex').toUpperCase(),
        referredById: null,
        lastLoginAt: du.status === 'ACTIVE' ? new Date(Date.now() - Math.random() * 86400000 * 7) : null,
        createdAt: new Date(Date.now() - Math.random() * 86400000 * 30),
        updatedAt: now,
      });

      // Create wallet
      await col(COL.wallets).insertOne({
        userId,
        balance: du.balance,
        currency: 'USD',
        isFrozen: du.status === 'RESTRICTED',
        createdAt: now,
        updatedAt: now,
      });

      // Create trading account
      const tradingAccounts = col(COL.tradingAccounts);
      await tradingAccounts.insertOne({
        userId,
        login: `DEMO${Date.now()}`,
        type: 'DEMO',
        balance: du.balance,
        currency: 'USD',
        leverage: 100,
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      });

      console.log(`  ✅ Created: ${du.firstName} ${du.lastName} (${du.description})`);
    } else {
      console.log(`  ⏭️  Exists: ${du.firstName} ${du.lastName}`);
    }
  }

  // ─────────────────── DEMO ADMIN STAFF ───────────────────────────────────
  console.log('\n👨‍💼 Seeding demo admin staff...');

  const demoAdmins = [
    {
      email: 'ops.manager@apexfx.com',
      password: 'OpsMgr@123',
      firstName: 'Lisa',
      lastName: 'Operations',
      role: 'OPERATIONS_MANAGER',
      description: 'Operations manager - daily platform management',
    },
    {
      email: 'finance.manager@apexfx.com',
      password: 'FinMgr@123',
      firstName: 'David',
      lastName: 'Finance',
      role: 'FINANCE_MANAGER',
      description: 'Finance manager - deposits/withdrawals',
    },
    {
      email: 'risk.manager@apexfx.com',
      password: 'RiskMgr@123',
      firstName: 'Rachel',
      lastName: 'Risk',
      role: 'RISK_MANAGER',
      description: 'Risk manager - market controls',
    },
    {
      email: 'support.lead@apexfx.com',
      password: 'Support@123',
      firstName: 'Tom',
      lastName: 'Support',
      role: 'SUPPORT_MANAGER',
      description: 'Support manager - ticket management',
    },
    {
      email: 'compliance.officer@apexfx.com',
      password: 'Comply@123',
      firstName: 'Karen',
      lastName: 'Compliance',
      role: 'COMPLIANCE_OFFICER',
      description: 'Compliance officer - KYC/AML oversight',
    },
  ];

  for (const da of demoAdmins) {
    const email = da.email.toLowerCase();
    const existing = await col(COL.users).findOne({ email });
    
    if (!existing) {
      const now = new Date();
      const userId = new ObjectId();
      
      await col(COL.users).insertOne({
        _id: userId,
        email,
        passwordHash: await bcrypt.hash(da.password, 12),
        firstName: da.firstName,
        lastName: da.lastName,
        status: 'ACTIVE',
        emailVerified: true,
        twoFactorEnabled: false,
        roleName: da.role,
        verificationLevel: 'PREMIUM',
        referralCode: crypto.randomBytes(4).toString('hex').toUpperCase(),
        referredById: null,
        lastLoginAt: new Date(Date.now() - Math.random() * 86400000 * 3),
        createdAt: new Date(Date.now() - Math.random() * 86400000 * 60),
        updatedAt: now,
      });

      console.log(`  ✅ Created: ${da.firstName} ${da.lastName} (${da.description})`);
    } else {
      console.log(`  ⏭️  Exists: ${da.firstName} ${da.lastName}`);
    }
  }

  // ─────────────────── DEMO DEPOSITS & WITHDRAWALS ───────────────────────────────────
  console.log('\n💰 Seeding demo deposits and withdrawals...');

  const users = await col(COL.users).find({ roleName: 'USER' }).toArray();
  
  if (users.length > 0) {
    // Demo deposits
    const deposits = [
      { userId: users[0]._id, amount: 5000, status: 'COMPLETED' as const, method: 'BANK_TRANSFER' },
      { userId: users[0]._id, amount: 2000, status: 'PENDING' as const, method: 'CREDIT_CARD' },
      { userId: users[1]._id, amount: 10000, status: 'COMPLETED' as const, method: 'WIRE_TRANSFER' },
      { userId: users[1]._id, amount: 3000, status: 'APPROVED' as const, method: 'CRYPTO' },
      { userId: users[3]._id, amount: 25000, status: 'COMPLETED' as const, method: 'BANK_TRANSFER' },
    ];

    for (const dep of deposits) {
      await col(COL.deposits).insertOne({
        userId: dep.userId,
        amount: dep.amount,
        currency: 'USD',
        paymentMethod: dep.method,
        transactionId: `TXN${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        status: dep.status,
        proofUrl: dep.status === 'PENDING' ? 'https://example.com/proof.jpg' : null,
        reviewedBy: dep.status !== 'PENDING' ? new ObjectId() : null,
        reviewedAt: dep.status !== 'PENDING' ? new Date() : null,
        createdAt: new Date(Date.now() - Math.random() * 86400000 * 14),
        updatedAt: new Date(),
      });
    }
    console.log(`  ✅ Created ${deposits.length} demo deposits`);

    // Demo withdrawals
    const withdrawals = [
      { userId: users[0]._id, amount: 1000, status: 'COMPLETED' as const, method: 'BANK_TRANSFER' },
      { userId: users[1]._id, amount: 5000, status: 'PENDING' as const, method: 'WIRE_TRANSFER' },
      { userId: users[3]._id, amount: 15000, status: 'APPROVED' as const, method: 'CRYPTO' },
    ];

    for (const wd of withdrawals) {
      await col(COL.withdrawals).insertOne({
        userId: wd.userId,
        amount: wd.amount,
        currency: 'USD',
        paymentMethod: wd.method,
        status: wd.status,
        destinationAccount: { type: wd.method, details: '****1234' },
        reviewedBy: wd.status !== 'PENDING' ? new ObjectId() : null,
        reviewedAt: wd.status !== 'PENDING' ? new Date() : null,
        createdAt: new Date(Date.now() - Math.random() * 86400000 * 10),
        updatedAt: new Date(),
      });
    }
    console.log(`  ✅ Created ${withdrawals.length} demo withdrawals`);
  }

  // ─────────────────── DEMO SUPPORT TICKETS ───────────────────────────────────
  console.log('\n🎫 Seeding demo support tickets...');

  if (users.length > 0) {
    const tickets = [
      {
        userId: users[0]._id,
        subject: 'Cannot place trade on EUR/USD',
        category: 'TRADING' as const,
        priority: 'HIGH' as const,
        status: 'OPEN' as const,
        message: 'I\'m getting an error when trying to open a position on EUR/USD. The error says "Insufficient margin" but I have plenty of balance.',
      },
      {
        userId: users[1]._id,
        subject: 'Withdrawal request pending for 3 days',
        category: 'BILLING' as const,
        priority: 'URGENT' as const,
        status: 'ESCALATED' as const,
        message: 'I submitted a withdrawal request 3 days ago and it\'s still showing as PENDING. Can you please expedite this?',
      },
      {
        userId: users[2]._id,
        subject: 'How to complete KYC verification?',
        category: 'ACCOUNT' as const,
        priority: 'MEDIUM' as const,
        status: 'IN_PROGRESS' as const,
        message: 'I\'m trying to upload my KYC documents but the system keeps rejecting them. What format do you accept?',
      },
      {
        userId: users[3]._id,
        subject: 'Request for higher leverage',
        category: 'TRADING' as const,
        priority: 'LOW' as const,
        status: 'RESOLVED' as const,
        message: 'I\'d like to request higher leverage on my account. I\'m an experienced trader with good risk management.',
        resolution: 'Leverage increased to 1:200 based on account history and verification level.',
      },
    ];

    for (const ticket of tickets) {
      // Generate ticketId
      const seq = await nextSequence('support_ticket');
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2);
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const ticketId = `TKT-${year}${month}-${String(seq).padStart(5, '0')}`;
      
      const ticketResult = await col(COL.supportTickets).insertOne({
        ticketId,
        userId: ticket.userId,
        userEmail: 'user@example.com',
        userName: 'Demo User',
        subject: ticket.subject,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        messages: [{
          messageId: crypto.randomUUID(),
          senderId: ticket.userId,
          senderType: 'USER' as const,
          senderName: 'Demo User',
          content: ticket.message,
          attachments: [],
          isInternal: false,
          createdAt: new Date(Date.now() - Math.random() * 86400000 * 7),
        }],
        tags: [ticket.category.toLowerCase()],
        source: 'WEB' as const,
        resolution: (ticket as any).resolution || null,
        createdAt: new Date(Date.now() - Math.random() * 86400000 * 7),
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      });
    }
    console.log(`  ✅ Created ${tickets.length} demo support tickets`);
  }

  // ─────────────────── DEMO AUDIT LOGS ───────────────────────────────────
  console.log('\n📋 Seeding demo audit logs...');

  const auditActions = [
    { action: 'USER_LOGIN', resource: 'users', description: 'User logged in successfully' },
    { action: 'DEPOSIT_APPROVED', resource: 'deposits', description: 'Deposit approved by finance manager' },
    { action: 'WITHDRAWAL_REJECTED', resource: 'withdrawals', description: 'Withdrawal rejected - insufficient verification' },
    { action: 'KYC_APPROVED', resource: 'kyc', description: 'KYC documents approved' },
    { action: 'ROLE_ASSIGNED', resource: 'roles', description: 'Role changed from USER to PREMIUM' },
    { action: 'WALLET_CREDIT', resource: 'wallets', description: 'Wallet credited $10,000 bonus' },
    { action: 'SETTINGS_UPDATED', resource: 'settings', description: 'Platform settings updated' },
    { action: 'SUPPORT_TICKET_ESCALATED', resource: 'tickets', description: 'Support ticket escalated to manager' },
  ];

  for (const audit of auditActions) {
    await col(COL.adminActionLog).insertOne({
      actorId: new ObjectId(),
      actorType: 'ADMIN' as any,
      action: audit.action,
      resource: audit.resource,
      resourceId: new ObjectId(),
      changes: { before: null, after: { note: audit.description } },
      ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
      userAgent: 'Mozilla/5.0 (Admin Browser)',
      metadata: { description: audit.description },
      createdAt: new Date(Date.now() - Math.random() * 86400000 * 30),
    });
  }
  console.log(`  ✅ Created ${auditActions.length} demo audit logs`);

  // ─────────────────── DEMO SECURITY EVENTS ───────────────────────────────────
  console.log('\n🔒 Seeding demo security events...');

  const securityEvents = [
    { type: 'FAILED_LOGIN' as const, severity: 'LOW', description: 'Failed login attempt - wrong password' },
    { type: 'SUSPICIOUS_IP' as const, severity: 'MEDIUM', description: 'Login from new country detected' },
    { type: 'PASSWORD_CHANGED' as const, severity: 'LOW', description: 'User changed password' },
    { type: '2FA_ENABLED' as const, severity: 'LOW', description: 'User enabled two-factor authentication' },
    { type: 'ACCOUNT_LOCKED' as const, severity: 'HIGH', description: 'Account locked after 5 failed attempts' },
  ];

  if (users.length > 0) {
    for (const event of securityEvents) {
      await col(COL.securityEvents).insertOne({
        userId: users[Math.floor(Math.random() * users.length)]._id,
        type: event.type,
        severity: event.severity,
        message: event.description,
        ip: `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0 (Security Event)',
        metadata: { description: event.description },
        createdAt: new Date(Date.now() - Math.random() * 86400000 * 14),
      });
    }
    console.log(`  ✅ Created ${securityEvents.length} demo security events`);
  }

  // ─────────────────── DEMO NOTIFICATIONS ───────────────────────────────────
  console.log('\n📬 Seeding demo notifications...');

  const notifications = [
    { type: 'TRADE' as const, title: 'Trade Executed', message: 'Your EUR/USD buy order was filled at 1.0856' },
    { type: 'DEPOSIT' as const, title: 'Deposit Approved', message: 'Your deposit of $5,000 has been approved' },
    { type: 'KYC' as const, title: 'KYC Under Review', message: 'Your KYC documents are being reviewed' },
    { type: 'SYSTEM' as const, title: 'Maintenance Scheduled', message: 'System maintenance on Sunday 2AM-4AM UTC' },
    { type: 'PROMOTION' as const, title: 'Bonus Offer', message: 'Get 20% bonus on deposits this week!' },
  ];

  if (users.length > 0) {
    for (const notif of notifications) {
      await col(COL.notifications).insertOne({
        userId: users[Math.floor(Math.random() * users.length)]._id,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        read: Math.random() > 0.5,
        metadata: { description: notif.message },
        actionUrl: '/dashboard',
        createdAt: new Date(Date.now() - Math.random() * 86400000 * 5),
      });
    }
    console.log(`  ✅ Created ${notifications.length} demo notifications`);
  }

  console.log('\n' + '═'.repeat(80));
  console.log('🎉 DEMO DATA SEEDING COMPLETE!');
  console.log('═'.repeat(80));
  console.log('\n📧 LOGIN CREDENTIALS:');
  console.log('\n👨‍💼 ADMIN STAFF:');
  console.log('   Super Admin:     admin@platform.local / Admin@12345');
  console.log('   Operations Mgr:  ops.manager@apexfx.com / OpsMgr@123');
  console.log('   Finance Mgr:     finance.manager@apexfx.com / FinMgr@123');
  console.log('   Risk Mgr:        risk.manager@apexfx.com / RiskMgr@123');
  console.log('   Support Mgr:     support.lead@apexfx.com / Support@123');
  console.log('   Compliance:      compliance.officer@apexfx.com / Comply@123');
  console.log('\n👥 CLIENTS:');
  console.log('   John Trader:     john.trader@email.com / Trader@123 ($100K)');
  console.log('   Sarah Investor:  sarah.investor@email.com / Invest@123 ($250K)');
  console.log('   Mike Newbie:     mike.newbie@email.com / Newbie@123 ($50K, Pending)');
  console.log('   Emma Pro:        emma.pro@email.com / Pro@123 ($500K)');
  console.log('   Alex Restricted: alex.restricted@email.com / Restricted@123 ($75K, Restricted)');
  console.log('\n🌐 URLs:');
  console.log('   Admin Panel:     http://localhost:3000/admin/login');
  console.log('   User Login:      http://localhost:3000/login');
  console.log('   User Register:   http://localhost:3000/register');
  console.log('\n✅ Seed complete!');
  console.log('   Login: admin@platform.local / Admin@12345');
  await closeMongo();
}

main().catch((e) => { console.error(e); process.exit(1); });
