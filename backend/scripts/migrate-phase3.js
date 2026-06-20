/**
 * MongoDB Atlas Migration Script
 * Phase 3: Create Missing Collections with Indexes
 * 
 * This script creates new empty collections with proper indexes.
 * It is SAFE - it will not modify existing data.
 * 
 * Usage: node scripts/migrate-phase3.js
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

const collectionsToCreate = [
  // User Management
  {
    name: 'user_profiles',
    indexes: [
      { key: { userId: 1 }, unique: true, background: true },
      { key: { email: 1 }, background: true },
    ]
  },
  {
    name: 'user_sessions',
    indexes: [
      { key: { userId: 1 }, background: true },
      { key: { tokenHash: 1 }, unique: true, background: true },
      { key: { expiresAt: 1 }, expireAfterSeconds: 0, background: true }, // TTL
    ]
  },
  {
    name: 'user_activity_logs',
    indexes: [
      { key: { userId: 1, createdAt: -1 }, background: true },
      { key: { action: 1, createdAt: -1 }, background: true },
    ]
  },
  
  // Finance
  {
    name: 'transactions',
    indexes: [
      { key: { userId: 1, createdAt: -1 }, background: true },
      { key: { type: 1, createdAt: -1 }, background: true },
      { key: { referenceId: 1 }, background: true },
      { key: { status: 1 }, background: true },
    ]
  },
  {
    name: 'wallet_transfers',
    indexes: [
      { key: { fromUserId: 1, createdAt: -1 }, background: true },
      { key: { toUserId: 1, createdAt: -1 }, background: true },
      { key: { status: 1 }, background: true },
    ]
  },
  {
    name: 'payment_methods',
    indexes: [
      { key: { name: 1 }, unique: true, background: true },
      { key: { type: 1 }, background: true },
      { key: { isEnabled: 1 }, background: true },
    ]
  },
  
  // Market Operations
  {
    name: 'asset_categories',
    indexes: [
      { key: { name: 1 }, unique: true, background: true },
      { key: { sortOrder: 1 }, background: true },
    ]
  },
  {
    name: 'leverage_rules',
    indexes: [
      { key: { symbolName: 1 }, background: true },
      { key: { tier: 1 }, background: true },
    ]
  },
  {
    name: 'margin_rules',
    indexes: [
      { key: { symbolName: 1 }, background: true },
    ]
  },
  {
    name: 'risk_alerts',
    indexes: [
      { key: { userId: 1, createdAt: -1 }, background: true },
      { key: { type: 1, createdAt: -1 }, background: true },
      { key: { severity: 1 }, background: true },
      { key: { isRead: 1 }, background: true },
    ]
  },
  
  // Support
  {
    name: 'tickets',
    indexes: [
      { key: { userId: 1, createdAt: -1 }, background: true },
      { key: { status: 1, priority: 1 }, background: true },
      { key: { assignedTo: 1, status: 1 }, background: true },
      { key: { category: 1 }, background: true },
    ]
  },
  {
    name: 'ticket_messages',
    indexes: [
      { key: { ticketId: 1, createdAt: 1 }, background: true },
      { key: { senderId: 1 }, background: true },
    ]
  },
  {
    name: 'ticket_attachments',
    indexes: [
      { key: { ticketId: 1 }, background: true },
      { key: { messageId: 1 }, background: true },
    ]
  },
  
  // Notifications
  {
    name: 'email_logs',
    indexes: [
      { key: { userId: 1, sentAt: -1 }, background: true },
      { key: { status: 1 }, background: true },
    ]
  },
  {
    name: 'sms_logs',
    indexes: [
      { key: { userId: 1, sentAt: -1 }, background: true },
      { key: { status: 1 }, background: true },
    ]
  },
  {
    name: 'push_logs',
    indexes: [
      { key: { userId: 1, sentAt: -1 }, background: true },
      { key: { status: 1 }, background: true },
    ]
  },
  
  // Affiliate System
  {
    name: 'affiliates',
    indexes: [
      { key: { userId: 1 }, unique: true, background: true },
      { key: { referralCode: 1 }, unique: true, background: true },
      { key: { status: 1 }, background: true },
    ]
  },
  {
    name: 'referrals',
    indexes: [
      { key: { affiliateId: 1 }, background: true },
      { key: { referredUserId: 1 }, unique: true, background: true },
      { key: { status: 1 }, background: true },
    ]
  },
  {
    name: 'commissions',
    indexes: [
      { key: { affiliateId: 1, createdAt: -1 }, background: true },
      { key: { referredUserId: 1 }, background: true },
      { key: { status: 1 }, background: true },
    ]
  },
  
  // System
  {
    name: 'activity_logs',
    indexes: [
      { key: { userId: 1, createdAt: -1 }, background: true },
      { key: { action: 1, createdAt: -1 }, background: true },
    ]
  },
  {
    name: 'system_events',
    indexes: [
      { key: { type: 1, createdAt: -1 }, background: true },
      { key: { severity: 1 }, background: true },
    ]
  },
  {
    name: 'permissions',
    indexes: [
      { key: { code: 1 }, unique: true, background: true },
      { key: { module: 1 }, background: true },
    ]
  },
  {
    name: 'admins',
    indexes: [
      { key: { userId: 1 }, unique: true, background: true },
      { key: { employeeId: 1 }, unique: true, background: true },
      { key: { department: 1 }, background: true },
      { key: { status: 1 }, background: true },
    ]
  },
];

async function migratePhase3() {
  const client = new MongoClient(uri);
  
  try {
    console.log('🔌 Connecting to MongoDB Atlas...\n');
    await client.connect();
    
    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();
    const existingNames = collections.map(c => c.name);
    
    console.log('📊 PHASE 3: Create Missing Collections with Indexes');
    console.log('═'.repeat(80));
    console.log(`Database: ${dbName}`);
    console.log(`Collections to create: ${collectionsToCreate.length}`);
    console.log('═'.repeat(80));
    console.log();

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    const results = [];

    for (const colDef of collectionsToCreate) {
      console.log(`\n📁 Creating: ${colDef.name}`);
      console.log(`   Indexes: ${colDef.indexes.length}`);
      console.log('─'.repeat(60));

      // Check if collection already exists
      if (existingNames.includes(colDef.name)) {
        console.log(`⏭️  Collection '${colDef.name}' already exists, skipping`);
        skipCount++;
        continue;
      }

      try {
        // Create collection
        await db.createCollection(colDef.name);
        console.log(`✅ Created collection: ${colDef.name}`);

        // Create indexes
        for (const idx of colDef.indexes) {
          const indexOptions = { background: idx.background || false };
          
          if (idx.unique) {
            indexOptions.unique = true;
          }
          
          if (idx.expireAfterSeconds !== undefined) {
            indexOptions.expireAfterSeconds = idx.expireAfterSeconds;
          }
          
          await db.collection(colDef.name).createIndex(idx.key, indexOptions);
          console.log(`   ✅ Index: ${JSON.stringify(idx.key)}`);
        }

        successCount++;
        results.push({
          collection: colDef.name,
          status: 'SUCCESS',
          indexCount: colDef.indexes.length,
        });

      } catch (error) {
        console.error(`❌ Error creating ${colDef.name}:`, error.message);
        errorCount++;
        results.push({
          collection: colDef.name,
          status: 'ERROR',
          error: error.message,
        });
      }
    }

    // Summary
    console.log('\n\n📊 MIGRATION SUMMARY');
    console.log('═'.repeat(80));
    console.log(`✅ Success: ${successCount} collections created`);
    console.log(`⏭️  Skipped: ${skipCount} collections`);
    console.log(`❌ Errors: ${errorCount} collections`);
    console.log(`📦 Total: ${collectionsToCreate.length} collections attempted`);

    if (errorCount > 0) {
      console.log('\n❌ Collections with errors:');
      results.filter(r => r.status === 'ERROR').forEach(r => {
        console.log(`   - ${r.collection}: ${r.error}`);
      });
    }

    console.log('\n✅ Phase 3 migration complete');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Run migration
migratePhase3()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
