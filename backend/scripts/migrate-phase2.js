/**
 * MongoDB Atlas Migration Script
 * Phase 2: Collection Renames - Standardize naming conventions
 * 
 * This script uses MongoDB's atomic renameCollection command.
 * It is SAFE and will not lose data.
 * 
 * Usage: node scripts/migrate-phase2.js
 * 
 * WARNING: This will temporarily break the application until code is updated
 * to use the new collection names. Run during maintenance window.
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

const renames = [
  { from: 'kyc', to: 'user_kyc', reason: 'Module consistency' },
  { from: 'wallets', to: 'user_wallets', reason: 'Module consistency' },
  { from: 'device_history', to: 'user_devices', reason: 'Module consistency' },
  { from: 'symbols', to: 'instruments', reason: 'Industry standard naming' },
  { from: 'market_config', to: 'market_status', reason: 'More descriptive' },
  { from: 'feed_providers', to: 'price_feeds', reason: 'More descriptive' },
  { from: 'risk_rules', to: 'exposure_rules', reason: 'More specific' },
  { from: 'roles', to: 'admin_roles', reason: 'Module separation' },
  { from: 'employee_activity_logs', to: 'admin_activity_logs', reason: 'Role alignment' },
];

async function migratePhase2() {
  const client = new MongoClient(uri);
  
  try {
    console.log('🔌 Connecting to MongoDB Atlas...\n');
    await client.connect();
    
    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();
    const existingNames = collections.map(c => c.name);
    
    console.log('📊 PHASE 2: Collection Renames');
    console.log('═'.repeat(80));
    console.log(`Database: ${dbName}`);
    console.log(`Collections to rename: ${renames.length}`);
    console.log('═'.repeat(80));
    console.log();

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    const results = [];

    for (const rename of renames) {
      console.log(`\n📁 Renaming: ${rename.from} → ${rename.to}`);
      console.log(`   Reason: ${rename.reason}`);
      console.log('─'.repeat(60));

      // Check if source collection exists
      if (!existingNames.includes(rename.from)) {
        console.log(`⏭️  Source collection '${rename.from}' does not exist, skipping`);
        skipCount++;
        continue;
      }

      // Check if target collection already exists
      if (existingNames.includes(rename.to)) {
        console.log(`⚠️  Target collection '${rename.to}' already exists, skipping`);
        console.log(`   Action: Manually verify and delete/merge '${rename.to}' first`);
        skipCount++;
        continue;
      }

      try {
        // Perform atomic rename
        const result = await db.adminCommand({
          renameCollection: `${dbName}.${rename.from}`,
          to: `${dbName}.${rename.to}`
        });

        console.log(`✅ Successfully renamed: ${rename.from} → ${rename.to}`);
        console.log(`   OK: ${result.ok === 1 ? 'Yes' : 'No'}`);
        
        successCount++;
        results.push({
          from: rename.from,
          to: rename.to,
          status: 'SUCCESS',
        });

      } catch (error) {
        console.error(`❌ Error renaming ${rename.from}:`, error.message);
        errorCount++;
        results.push({
          from: rename.from,
          to: rename.to,
          status: 'ERROR',
          error: error.message,
        });
      }
    }

    // Summary
    console.log('\n\n📊 MIGRATION SUMMARY');
    console.log('═'.repeat(80));
    console.log(`✅ Success: ${successCount} collections renamed`);
    console.log(`⏭️  Skipped: ${skipCount} collections`);
    console.log(`❌ Errors: ${errorCount} collections`);
    console.log(`📦 Total: ${renames.length} renames attempted`);

    if (successCount > 0) {
      console.log('\n⚠️  IMPORTANT: Update application code to use new collection names!');
      console.log('Collections renamed:');
      results.filter(r => r.status === 'SUCCESS').forEach(r => {
        console.log(`   - ${r.from} → ${r.to}`);
      });
    }

    if (errorCount > 0) {
      console.log('\n❌ Collections with errors:');
      results.filter(r => r.status === 'ERROR').forEach(r => {
        console.log(`   - ${r.from} → ${r.to}: ${r.error}`);
      });
    }

    console.log('\n✅ Phase 2 migration complete');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Run migration
migratePhase2()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
