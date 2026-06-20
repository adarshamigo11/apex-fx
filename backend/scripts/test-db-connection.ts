import { MongoClient } from 'mongodb';
import { env } from '../src/config/env';

async function testConnection() {
  console.log('🔍 Testing MongoDB Connection...\n');
  console.log('Connection String:', env.MONGODB_URI.substring(0, 30) + '...');
  console.log('Database:', env.MONGODB_DB);
  console.log('');

  const client = new MongoClient(env.MONGODB_URI);

  try {
    console.log('⏳ Connecting...');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    const db = client.db(env.MONGODB_DB);
    
    // Test basic operations
    const collections = await db.listCollections().toArray();
    console.log(`📊 Found ${collections.length} collections:`);
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });

    // Count users
    const userCount = await db.collection('users').countDocuments();
    console.log(`\n👥 Users: ${userCount}`);

    // Count roles
    const roleCount = await db.collection('roles').countDocuments();
    console.log(`🎭 Roles: ${roleCount}`);

    // Count symbols
    const symbolCount = await db.collection('symbols').countDocuments();
    console.log(`📈 Symbols: ${symbolCount}`);

    console.log('\n✅ Database connection is working perfectly!');
    
    if (userCount === 0) {
      console.log('\n⚠️  No users found. You need to run: npm run seed');
    } else {
      console.log('\n✅ Database already has data!');
    }

  } catch (error: any) {
    console.error('\n❌ Connection failed!');
    console.error('Error:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Check if your IP is whitelisted in MongoDB Atlas');
    console.error('2. Verify your connection string is correct');
    console.error('3. Check if MongoDB Atlas cluster is running');
    console.error('\n💡 To whitelist your IP:');
    console.error('   - Go to MongoDB Atlas → Network Access');
    console.error('   - Add IP Address: 0.0.0.0/0 (allow all)');
  } finally {
    await client.close();
  }
}

testConnection();
