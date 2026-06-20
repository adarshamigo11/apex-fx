/**
 * Enhanced Seed Script - Creates demo users, clients, and test data
 * Run: npx ts-node src/scripts/seed-demo.ts
 */

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { ObjectId } from 'mongodb';
import { connectMongo, closeMongo } from '../config/mongo';
import { col, COL } from '../db/collections';

async function main() {
  await connectMongo();

  console.log('🌱 Seeding demo data...\n');

  // Get existing admin user
  const adminUser = await col(COL.users).findOne({ email: 'admin@platform.local' });
  if (!adminUser) {
    console.log('❌ Admin user not found. Run seed.ts first!');
    await closeMongo();
    return;
  }

  console.log('👥 Creating demo client users...\n');

  const demoClients = [
    {
      email: 'john.trader@email.com',
      password: 'Trader@123',
      firstName: 'John',
      lastName: 'Trader',
      status: 'ACTIVE',
      balance: 100000,
    },
    {
      email: 'sarah.investor@email.com',
      password: 'Invest@123',
      firstName: 'Sarah',
      lastName: 'Investor',
      status: 'ACTIVE',
      balance: 250000,
    },
    {
      email: 'mike.newbie@email.com',
      password: 'Newbie@123',
      firstName: 'Mike',
      lastName: 'Newbie',
      status: 'PENDING',
      balance: 50000,
    },
    {
      email: 'emma.pro@email.com',
      password: 'Pro@123',
      firstName: 'Emma',
      lastName: 'Professional',
      status: 'ACTIVE',
      balance: 500000,
    },
    {
      email: 'alex.restricted@email.com',
      password: 'Restricted@123',
      firstName: 'Alex',
      lastName: 'Restricted',
      status: 'RESTRICTED',
      balance: 75000,
    },
  ];

  const createdUsers: any[] = [];

  for (const client of demoClients) {
    const email = client.email.toLowerCase();
    const existing = await col(COL.users).findOne({ email });

    if (existing) {
      console.log(`  ⏭️  Exists: ${client.firstName} ${client.lastName}`);
      createdUsers.push(existing);
      continue;
    }

    const now = new Date();
    const result = await col(COL.users).insertOne({
      email,
      passwordHash: await bcrypt.hash(client.password, 12),
      firstName: client.firstName,
      lastName: client.lastName,
      status: client.status,
      emailVerified: client.status === 'ACTIVE',
      twoFactorEnabled: false,
      roleName: 'USER',
      verificationLevel: client.balance > 100000 ? 'PREMIUM' : 'BASIC',
      referralCode: crypto.randomBytes(4).toString('hex').toUpperCase(),
      referredById: null,
      lastLoginAt: client.status === 'ACTIVE' ? new Date(Date.now() - Math.random() * 86400000 * 7) : null,
      createdAt: now,
      updatedAt: now,
    });

    const userId = result.insertedId;

    // Create wallet
    await col(COL.wallets).insertOne({
      userId,
      balance: client.balance,
      currency: 'USD',
      isFrozen: client.status === 'RESTRICTED',
      createdAt: now,
      updatedAt: now,
    });

    // Create trading account
    await col(COL.tradingAccounts).insertOne({
      userId,
      login: `DEMO${Date.now()}${Math.floor(Math.random() * 1000)}`,
      type: 'DEMO',
      balance: client.balance,
      currency: 'USD',
      leverage: 100,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    });

    const newUser = await col(COL.users).findOne({ _id: userId });
    createdUsers.push(newUser);

    console.log(`  ✅ Created: ${client.firstName} ${client.lastName} ($${client.balance.toLocaleString()})`);
  }

  console.log('\n👨‍💼 Creating demo admin staff...\n');

  const demoAdmins = [
    {
      email: 'ops.manager@apexfx.com',
      password: 'OpsMgr@123',
      firstName: 'Lisa',
      lastName: 'Operations',
      roleName: 'OPERATIONS_MANAGER',
    },
    {
      email: 'finance.manager@apexfx.com',
      password: 'FinMgr@123',
      firstName: 'David',
      lastName: 'Finance',
      roleName: 'FINANCE_MANAGER',
    },
    {
      email: 'risk.manager@apexfx.com',
      password: 'RiskMgr@123',
      firstName: 'Rachel',
      lastName: 'Risk',
      roleName: 'RISK_MANAGER',
    },
    {
      email: 'support.lead@apexfx.com',
      password: 'Support@123',
      firstName: 'Tom',
      lastName: 'Support',
      roleName: 'SUPPORT_MANAGER',
    },
    {
      email: 'compliance.officer@apexfx.com',
      password: 'Comply@123',
      firstName: 'Karen',
      lastName: 'Compliance',
      roleName: 'COMPLIANCE_OFFICER',
    },
  ];

  for (const admin of demoAdmins) {
    const email = admin.email.toLowerCase();
    const existing = await col(COL.users).findOne({ email });

    if (existing) {
      console.log(`  ⏭️  Exists: ${admin.firstName} ${admin.lastName}`);
      continue;
    }

    const now = new Date();
    const result = await col(COL.users).insertOne({
      email,
      passwordHash: await bcrypt.hash(admin.password, 12),
      firstName: admin.firstName,
      lastName: admin.lastName,
      status: 'ACTIVE',
      emailVerified: true,
      twoFactorEnabled: false,
      roleName: admin.roleName,
      verificationLevel: 'PREMIUM',
      referralCode: crypto.randomBytes(4).toString('hex').toUpperCase(),
      referredById: null,
      lastLoginAt: new Date(Date.now() - Math.random() * 86400000 * 3),
      createdAt: now,
      updatedAt: now,
    });

    // Create employee profile
    await col(COL.employeeProfiles).insertOne({
      userId: result.insertedId,
      department: admin.roleName.replace('_MANAGER', '').replace('_OFFICER', ''),
      title: admin.roleName.replace(/_/g, ' ').toLowerCase(),
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    });

    console.log(`  ✅ Created: ${admin.firstName} ${admin.lastName} (${admin.roleName})`);
  }

  console.log('\n💰 Creating demo deposits...\n');

  if (createdUsers.length > 0) {
    const deposits = [
      { userId: createdUsers[0]._id, amount: 5000, status: 'COMPLETED', method: 'BANK_TRANSFER' },
      { userId: createdUsers[0]._id, amount: 2000, status: 'PENDING', method: 'CREDIT_CARD' },
      { userId: createdUsers[1]._id, amount: 10000, status: 'COMPLETED', method: 'WIRE_TRANSFER' },
      { userId: createdUsers[3]._id, amount: 25000, status: 'COMPLETED', method: 'BANK_TRANSFER' },
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
        reviewedBy: dep.status !== 'PENDING' ? adminUser._id : null,
        reviewedAt: dep.status !== 'PENDING' ? new Date() : null,
        createdAt: new Date(Date.now() - Math.random() * 86400000 * 14),
        updatedAt: new Date(),
      });
    }
    console.log(`  ✅ Created ${deposits.length} deposits`);

    console.log('\n💸 Creating demo withdrawals...\n');

    const withdrawals = [
      { userId: createdUsers[0]._id, amount: 1000, status: 'COMPLETED', method: 'BANK_TRANSFER' },
      { userId: createdUsers[1]._id, amount: 5000, status: 'PENDING', method: 'WIRE_TRANSFER' },
      { userId: createdUsers[3]._id, amount: 15000, status: 'APPROVED', method: 'CRYPTO' },
    ];

    for (const wd of withdrawals) {
      await col(COL.withdrawals).insertOne({
        userId: wd.userId,
        amount: wd.amount,
        currency: 'USD',
        paymentMethod: wd.method,
        status: wd.status,
        destinationAccount: { type: wd.method, details: '****1234' },
        reviewedBy: wd.status !== 'PENDING' ? adminUser._id : null,
        reviewedAt: wd.status !== 'PENDING' ? new Date() : null,
        createdAt: new Date(Date.now() - Math.random() * 86400000 * 10),
        updatedAt: new Date(),
      });
    }
    console.log(`  ✅ Created ${withdrawals.length} withdrawals`);
  }

  console.log('\n🎉 Demo data seeding complete!');
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

  await closeMongo();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
