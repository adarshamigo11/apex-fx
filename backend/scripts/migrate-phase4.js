/**
 * MongoDB Atlas Migration Script
 * Phase 4: Index Optimization - Add missing indexes to existing collections
 * 
 * This script adds recommended indexes for better query performance.
 * All indexes are created in the BACKGROUND to avoid blocking operations.
 * 
 * Usage: node scripts/migrate-phase4.js
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

const indexRecommendations = [
  // Users
  {
    collection: 'users',
    indexes: [
      { key: { email: 1 }, options: { unique: true, background: true } },
      { key: { status: 1 }, options: { background: true } },
      { key: { createdAt: -1 }, options: { background: true } },
      { key: { email: "text", phone: "text" }, options: { background: true } }, // Text search
    ]
  },
  
  // User KYC
  {
    collection: 'user_kyc',
    indexes: [
      { key: { userId: 1 }, options: { unique: true, background: true } },
      { key: { status: 1, createdAt: -1 }, options: { background: true } },
    ]
  },
  
  // User Wallets
  {
    collection: 'user_wallets',
    indexes: [
      { key: { userId: 1 }, options: { unique: true, background: true } },
      { key: { isFrozen: 1 }, options: { background: true } },
    ]
  },
  
  // Deposits
  {
    collection: 'deposits',
    indexes: [
      { key: { transactionId: 1 }, options: { unique: true, background: true } },
      { key: { status: 1, createdAt: -1 }, options: { background: true } },
    ]
  },
  
  // Withdrawals
  {
    collection: 'withdrawals',
    indexes: [
      { key: { status: 1, createdAt: -1 }, options: { background: true } },
    ]
  },
  
  // Notifications
  {
    collection: 'notifications',
    indexes: [
      { key: { userId: 1, read: 1, createdAt: -1 }, options: { background: true } },
    ]
  },
  
  // Login History
  {
    collection: 'login_history',
    indexes: [
      { key: { userId: 1 }, options: { background: true } },
      { key: { createdAt: -1 }, options: { background: true } },
    ]
  },
  
  // Audit Logs
  {
    collection: 'audit_logs',
    indexes: [
      { key: { actorId: 1, createdAt: -1 }, options: { background: true } },
      { key: { action: 1, createdAt: -1 }, options: { background: true } },
    ]
  },
  
  // Security Events
  {
    collection: 'security_events',
    indexes: [
      { key: { userId: 1, createdAt: -1 }, options: { background: true } },
      { key: { type: 1, createdAt: -1 }, options: { background: true } },
    ]
  },
  
  // Approval Requests
  {
    collection: 'approval_requests',
    indexes: [
      { key: { status: 1, createdAt: -1 }, options: { background: true } },
      { key: { requestedBy: 1, createdAt: -1 }, options: { background: true } },
    ]
  },
  
  // Trading Accounts
  {
    collection: 'trading_accounts',
    indexes: [
      { key: { userId: 1 }, options: { background: true } },
      { key: { login: 1 }, options: { unique: true, background: true } },
    ]
  },
  
  // Positions
  {
    collection: 'positions',
    indexes: [
      { key: { accountId: 1, status: 1 }, options: { background: true } },
    ]
  },
  
  // Trade History
  {
    collection: 'trade_history',
    indexes: [
      { key: { accountId: 1, closeTime: -1 }, options: { background: true } },
    ]
  },
  
  // Candles
  {
    collection: 'candles',
    indexes: [
      { key: { symbolName: 1, timeframe: 1, openTime: -1 }, options: { background: true } },
    ]
  },
  
  // Instruments (formerly symbols)
  {
    collection: 'instruments',
    indexes: [
      { key: { name: "text", displayName: "text" }, options: { background: true } }, // Text search
      { key: { enabled: 1 }, options: { background: true } },
      { key: { kind: 1 }, options: { background: true } },
    ]
  },
  
  // TTL Indexes (auto-expire documents)
  {
    collection: 'otps',
    indexes: [
      { key: { createdAt: 1 }, options: { expireAfterSeconds: 300, background: true } }, // 5 minutes
    ]
  },
  {
    collection: 'refresh_tokens',
    indexes: [
      { key: { expiresAt: 1 }, options: { expireAfterSeconds: 0, background: true } },
    ]
  },
  {
    collection: 'user_sessions',
    indexes: [
      { key: { expiresAt: 1 }, options: { expireAfterSeconds: 0, background: true } },
    ]
  },
  {
    collection: 'employee_sessions',
    indexes: [
      { key: { expiresAt: 1 }, options: { expireAfterSeconds: 0, background: true } },
    ]
  },
];

async function migratePhase4() {
  const client = new MongoClient(uri);
  
  try {
    console.log('🔌 Connecting to MongoDB Atlas...\n');
    await client.connect();
    
    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();
    const existingNames = collections.map(c => c.name);
    
    console.log('📊 PHASE 4: Index Optimization');
    console.log('═'.repeat(80));
    console.log(`Database: ${dbName}`);
    console.log(`Collections with index recommendations: ${indexRecommendations.length}`);
    console.log('═'.repeat(80));
    console.log();

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    let totalIndexesCreated = 0;
    const results = [];

    for (const rec of indexRecommendations) {
      console.log(`\n📁 Processing: ${rec.collection}`);
      console.log(`   Recommended indexes: ${rec.indexes.length}`);
      console.log('─'.repeat(60));

      // Check if collection exists
      if (!existingNames.includes(rec.collection)) {
        console.log(`⏭️  Collection '${rec.collection}' does not exist, skipping`);
        skipCount++;
        continue;
      }

      try {
        const collection = db.collection(rec.collection);
        const existingIndexes = await collection.indexes();
        const existingIndexKeys = existingIndexes.map(idx => JSON.stringify(idx.key));
        
        let indexesCreated = 0;

        for (const idx of rec.indexes) {
          const indexKey = JSON.stringify(idx.key);
          
          // Check if index already exists
          if (existingIndexKeys.includes(indexKey)) {
            console.log(`   ⏭️  Index already exists: ${indexKey}`);
            continue;
          }

          // Create index
          await collection.createIndex(idx.key, idx.options);
          console.log(`   ✅ Created index: ${indexKey}`);
          indexesCreated++;
          totalIndexesCreated++;
        }

        if (indexesCreated > 0) {
          console.log(`   ✅ Created ${indexesCreated} new indexes`);
        } else {
          console.log(`   ✅ All recommended indexes already exist`);
        }

        successCount++;
        results.push({
          collection: rec.collection,
          status: 'SUCCESS',
          indexesCreated,
        });

      } catch (error) {
        console.error(`❌ Error processing ${rec.collection}:`, error.message);
        errorCount++;
        results.push({
          collection: rec.collection,
          status: 'ERROR',
          error: error.message,
        });
      }
    }

    // Summary
    console.log('\n\n📊 MIGRATION SUMMARY');
    console.log('═'.repeat(80));
    console.log(`✅ Success: ${successCount} collections processed`);
    console.log(`⏭️  Skipped: ${skipCount} collections`);
    console.log(`❌ Errors: ${errorCount} collections`);
    console.log(`📈 Total Indexes Created: ${totalIndexesCreated}`);
    console.log(`📦 Total: ${indexRecommendations.length} collections attempted`);

    if (errorCount > 0) {
      console.log('\n❌ Collections with errors:');
      results.filter(r => r.status === 'ERROR').forEach(r => {
        console.log(`   - ${r.collection}: ${r.error}`);
      });
    }

    console.log('\n✅ Phase 4 migration complete');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Run migration
migratePhase4()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
