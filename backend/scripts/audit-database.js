/**
 * MongoDB Atlas Database Audit Script
 * Connects to Atlas and analyzes all collections, schemas, indexes, and data
 */
const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

async function auditDatabase() {
  const client = new MongoClient(uri);
  
  try {
    console.log('🔌 Connecting to MongoDB Atlas...\n');
    await client.connect();
    
    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();
    
    console.log('📊 DATABASE AUDIT REPORT');
    console.log('═'.repeat(80));
    console.log(`Database: ${dbName}`);
    console.log(`Total Collections: ${collections.length}`);
    console.log('═'.repeat(80));
    console.log();

    const auditResults = {
      collections: [],
      totalDocuments: 0,
      totalIndexes: 0,
      issues: [],
      recommendations: [],
    };

    // Analyze each collection
    for (const col of collections) {
      console.log(`\n📁 Analyzing: ${col.name}`);
      console.log('─'.repeat(60));
      
      const collection = db.collection(col.name);
      
      // Document count
      const count = await collection.countDocuments();
      auditResults.totalDocuments += count;
      console.log(`  Documents: ${count.toLocaleString()}`);
      
      // Storage size
      const stats = await db.command({ collStats: col.name });
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      console.log(`  Storage: ${sizeMB} MB`);
      
      // Indexes
      const indexes = await collection.indexes();
      auditResults.totalIndexes += indexes.length;
      console.log(`  Indexes: ${indexes.length}`);
      indexes.forEach(idx => {
        console.log(`    - ${JSON.stringify(idx.key)}`);
      });
      
      // Sample document (analyze schema)
      const sample = await collection.findOne({});
      if (sample) {
        const fields = Object.keys(sample);
        console.log(`  Fields: ${fields.length}`);
        console.log(`  Schema: ${fields.join(', ')}`);
        
        // Check for standard fields
        const requiredFields = ['createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'status', 'isDeleted'];
        const missing = requiredFields.filter(f => !fields.includes(f));
        if (missing.length > 0) {
          console.log(`  ⚠️  Missing standard fields: ${missing.join(', ')}`);
          auditResults.issues.push({
            collection: col.name,
            issue: 'Missing standard fields',
            details: missing,
          });
        }
        
        auditResults.collections.push({
          name: col.name,
          documentCount: count,
          storageSizeMB: parseFloat(sizeMB),
          indexCount: indexes.length,
          fieldCount: fields.length,
          fields,
          missingStandardFields: missing,
          sample: sample,
        });
      } else {
        console.log(`  ⚠️  Empty collection`);
        auditResults.issues.push({
          collection: col.name,
          issue: 'Empty collection',
        });
      }
    }

    // Check for potential duplicates
    console.log('\n\n🔍 DUPLICATE COLLECTION ANALYSIS');
    console.log('═'.repeat(80));
    const names = auditResults.collections.map(c => c.name);
    const duplicates = findPotentialDuplicates(names);
    if (duplicates.length > 0) {
      duplicates.forEach(d => {
        console.log(`⚠️  Potential duplicates: ${d.join(', ')}`);
        auditResults.issues.push({
          issue: 'Potential duplicate collections',
          details: d,
        });
      });
    } else {
      console.log('✅ No duplicate collections detected');
    }

    // Index optimization recommendations
    console.log('\n\n📈 INDEX OPTIMIZATION RECOMMENDATIONS');
    console.log('═'.repeat(80));
    const indexRecommendations = generateIndexRecommendations(auditResults.collections);
    indexRecommendations.forEach(rec => {
      console.log(`📌 ${rec.collection}: ${rec.recommendation}`);
      auditResults.recommendations.push(rec);
    });

    // Summary
    console.log('\n\n📊 SUMMARY');
    console.log('═'.repeat(80));
    console.log(`Total Collections: ${auditResults.collections.length}`);
    console.log(`Total Documents: ${auditResults.totalDocuments.toLocaleString()}`);
    console.log(`Total Indexes: ${auditResults.totalIndexes}`);
    console.log(`Issues Found: ${auditResults.issues.length}`);
    console.log(`Recommendations: ${auditResults.recommendations.length}`);

    // Missing collections from ideal schema
    console.log('\n\n🔧 MISSING COLLECTIONS (Ideal Schema)');
    console.log('═'.repeat(80));
    const missingCollections = identifyMissingCollections(auditResults.collections);
    missingCollections.forEach(col => {
      console.log(`❌ Missing: ${col}`);
    });

    return auditResults;
    
  } catch (error) {
    console.error('❌ Audit failed:', error);
    throw error;
  } finally {
    await client.close();
  }
}

function findPotentialDuplicates(names) {
  const duplicates = [];
  const normalized = names.map(n => n.toLowerCase().replace(/[_-]/g, ''));
  
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      if (normalized[i] === normalized[j] || normalized[i].includes(normalized[j]) || normalized[j].includes(normalized[i])) {
        duplicates.push([names[i], names[j]]);
      }
    }
  }
  
  return duplicates;
}

function generateIndexRecommendations(collections) {
  const recommendations = [];
  const commonFields = ['userId', 'email', 'status', 'createdAt', 'updatedAt'];
  
  collections.forEach(col => {
    commonFields.forEach(field => {
      if (col.fields.includes(field)) {
        const hasIndex = col.fields.some(f => f === '_id_') || 
                        col.name.includes(field);
        if (!hasIndex) {
          recommendations.push({
            collection: col.name,
            recommendation: `Add index on ${field}`,
            priority: 'HIGH',
            index: { [field]: 1 },
          });
        }
      }
    });
  });
  
  return recommendations;
}

function identifyMissingCollections(existingCollections) {
  const idealSchema = [
    'employees', 'employee_roles', 'employee_permissions', 'employee_sessions', 'employee_activity_logs',
    'admins', 'admin_roles', 'admin_permissions', 'admin_activity_logs',
    'users', 'user_profiles', 'user_kyc', 'user_wallets', 'user_sessions', 'user_devices', 'user_activity_logs',
    'deposits', 'withdrawals', 'transactions', 'wallet_transfers', 'payment_methods',
    'instruments', 'asset_categories', 'trading_sessions', 'market_status', 'price_feeds',
    'leverage_rules', 'margin_rules', 'exposure_rules', 'risk_alerts',
    'tickets', 'ticket_messages', 'ticket_attachments',
    'notifications', 'email_logs', 'sms_logs', 'push_logs',
    'affiliates', 'referrals', 'commissions',
    'settings', 'audit_logs', 'activity_logs', 'system_events',
    'roles', 'permissions', 'role_permissions',
  ];
  
  const existingNames = existingCollections.map(c => c.name);
  return idealSchema.filter(col => !existingNames.includes(col));
}

// Run audit
auditDatabase()
  .then(results => {
    console.log('\n✅ Audit complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Audit failed:', error);
    process.exit(1);
  });
