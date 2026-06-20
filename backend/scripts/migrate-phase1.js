/**
 * MongoDB Atlas Migration Script
 * Phase 1: Schema Standardization - Add standard fields to all collections
 * 
 * This script is NON-DESTRUCTIVE and SAFE to run.
 * It only adds missing fields, never deletes or modifies existing data.
 * 
 * Usage: node scripts/migrate-phase1.js
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

async function migratePhase1() {
  const client = new MongoClient(uri);
  
  try {
    console.log('🔌 Connecting to MongoDB Atlas...\n');
    await client.connect();
    
    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();
    
    console.log('📊 PHASE 1: Schema Standardization');
    console.log('═'.repeat(80));
    console.log(`Database: ${dbName}`);
    console.log(`Collections to process: ${collections.length}`);
    console.log('═'.repeat(80));
    console.log();

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    const results = [];

    for (const col of collections) {
      const collectionName = col.name;
      
      // Skip system collections
      if (collectionName.startsWith('system.')) {
        console.log(`⏭️  Skipping system collection: ${collectionName}`);
        skipCount++;
        continue;
      }

      console.log(`\n📁 Processing: ${collectionName}`);
      console.log('─'.repeat(60));

      try {
        const collection = db.collection(collectionName);
        
        // Check if collection already has all standard fields
        const sample = await collection.findOne({
          $or: [
            { createdAt: { $exists: false } },
            { updatedAt: { $exists: false } },
            { status: { $exists: false } },
            { isDeleted: { $exists: false } }
          ]
        });

        if (!sample) {
          console.log(`✅ All documents already have standard fields`);
          skipCount++;
          continue;
        }

        // Update all documents missing standard fields
        const updateResult = await collection.updateMany(
          {
            $or: [
              { createdAt: { $exists: false } },
              { updatedAt: { $exists: false } },
              { status: { $exists: false } },
              { isDeleted: { $exists: false } }
            ]
          },
          {
            $set: {
              createdAt: new Date(),
              updatedAt: new Date(),
              createdBy: null,
              updatedBy: null,
              status: 'ACTIVE',
              isDeleted: false
            }
          }
        );

        console.log(`✅ Updated ${updateResult.modifiedCount} documents`);
        console.log(`   - Added: createdAt, updatedAt, createdBy, updatedBy, status, isDeleted`);
        
        successCount++;
        results.push({
          collection: collectionName,
          status: 'SUCCESS',
          modifiedCount: updateResult.modifiedCount,
        });

      } catch (error) {
        console.error(`❌ Error processing ${collectionName}:`, error.message);
        errorCount++;
        results.push({
          collection: collectionName,
          status: 'ERROR',
          error: error.message,
        });
      }
    }

    // Summary
    console.log('\n\n📊 MIGRATION SUMMARY');
    console.log('═'.repeat(80));
    console.log(`✅ Success: ${successCount} collections`);
    console.log(`⏭️  Skipped: ${skipCount} collections`);
    console.log(`❌ Errors: ${errorCount} collections`);
    console.log(`📦 Total: ${collections.length} collections`);

    if (errorCount > 0) {
      console.log('\n⚠️  Collections with errors:');
      results.filter(r => r.status === 'ERROR').forEach(r => {
        console.log(`   - ${r.collection}: ${r.error}`);
      });
    }

    console.log('\n✅ Phase 1 migration complete');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Run migration
migratePhase1()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });

