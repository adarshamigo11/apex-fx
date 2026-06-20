/**
 * Seed default account types that Super Admin can manage
 * Run: npx tsx src/scripts/seed-account-types.ts
 */
import { connectMongo } from '../config/mongo';
import { col, COL } from '../db/collections';
import { AccountTypeConfigDoc } from '../db/models';

async function main() {
  await connectMongo();
  
  const existing = await col<AccountTypeConfigDoc>(COL.accountTypes).countDocuments();
  if (existing > 0) {
    console.log(`⚠️  ${existing} account types already exist. Skipping seed.`);
    process.exit(0);
  }

  const now = new Date();

  const accountTypes: Omit<AccountTypeConfigDoc, '_id'>[] = [
    {
      name: 'DEMO',
      displayName: 'Demo Account',
      description: 'Practice trading with virtual funds. No risk, full features.',
      category: 'DEMO',
      defaultLeverage: 100,
      maxLeverage: 500,
      minDeposit: 0,
      defaultBalance: 10000,
      commission: 0,
      spreadMarkup: 0,
      currency: ['USD'],
      features: ['virtual_funds', 'all_instruments', 'expert_advisors'],
      enabled: true,
      sortOrder: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      name: 'STANDARD',
      displayName: 'Standard Account',
      description: 'Perfect for beginners. Low minimum deposit with competitive spreads.',
      category: 'LIVE',
      defaultLeverage: 100,
      maxLeverage: 500,
      minDeposit: 100,
      defaultBalance: 0,
      commission: 0,
      spreadMarkup: 1.2,
      currency: ['USD', 'EUR', 'GBP'],
      features: ['all_instruments', 'expert_advisors', 'hedging'],
      enabled: true,
      sortOrder: 2,
      createdAt: now,
      updatedAt: now,
    },
    {
      name: 'RAW',
      displayName: 'Raw Spread Account',
      description: 'Ultra-low spreads with a small commission per lot. For active traders.',
      category: 'LIVE',
      defaultLeverage: 200,
      maxLeverage: 500,
      minDeposit: 500,
      defaultBalance: 0,
      commission: 3.5,
      spreadMarkup: 0,
      currency: ['USD', 'EUR', 'GBP', 'AUD'],
      features: ['raw_spreads', 'all_instruments', 'expert_advisors', 'hedging', 'scalping'],
      enabled: true,
      sortOrder: 3,
      createdAt: now,
      updatedAt: now,
    },
    {
      name: 'VIP',
      displayName: 'VIP Account',
      description: 'Premium trading conditions. Dedicated account manager, lowest spreads.',
      category: 'LIVE',
      defaultLeverage: 300,
      maxLeverage: 1000,
      minDeposit: 10000,
      defaultBalance: 0,
      commission: 2.0,
      spreadMarkup: 0,
      currency: ['USD', 'EUR', 'GBP', 'AUD', 'CHF', 'JPY'],
      features: ['raw_spreads', 'all_instruments', 'expert_advisors', 'hedging', 'scalping', 'dedicated_manager', 'priority_support', 'swap_free'],
      enabled: true,
      sortOrder: 4,
      createdAt: now,
      updatedAt: now,
    },
    {
      name: 'ECN',
      displayName: 'ECN Pro Account',
      description: 'Direct market access with institutional-grade liquidity.',
      category: 'LIVE',
      defaultLeverage: 200,
      maxLeverage: 500,
      minDeposit: 5000,
      defaultBalance: 0,
      commission: 2.5,
      spreadMarkup: 0,
      currency: ['USD', 'EUR', 'GBP'],
      features: ['ecn_execution', 'raw_spreads', 'all_instruments', 'expert_advisors', 'hedging', 'scalping', 'api_access'],
      enabled: true,
      sortOrder: 5,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const result = await col<AccountTypeConfigDoc>(COL.accountTypes).insertMany(accountTypes as any);
  console.log(`✅ Seeded ${result.insertedCount} account types:`);
  accountTypes.forEach(t => console.log(`   • ${t.name} (${t.displayName}) - ${t.category} - Min: $${t.minDeposit}`));
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
