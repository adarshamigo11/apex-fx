// Minimal seed script that matches the exact schema
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

async function seed() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/apexfx';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('[mongo] connected');
    
    const db = client.db('apexfx');
    const users = db.collection('users');
    const wallets = db.collection('wallets');

    // Create demo users with ALL required fields
    const demoUsers = [
      { email: 'alice@example.local', fullName: 'Alice Demo' },
      { email: 'bob@example.local', fullName: 'Bob Demo' },
      { email: 'charlie@example.local', fullName: 'Charlie Demo' },
    ];

    for (const user of demoUsers) {
      const existing = await users.findOne({ email: user.email });
      if (existing) {
        console.log(`[skip] ${user.email} already exists (ID: ${existing._id})`);
        continue;
      }

      const passwordHash = await bcrypt.hash('User@12345', 10);
      const userId = new ObjectId();
      const now = new Date();
      
      // Insert user with all required fields
      await users.insertOne({
        _id: userId,
        email: user.email,
        passwordHash,
        fullName: user.fullName,
        roleName: 'USER',
        status: 'ACTIVE',
        verificationLevel: 'NONE',
        referralCode: `REF${userId.toString().slice(-6).toUpperCase()}`,
        createdAt: now,
        updatedAt: now,
      });

      console.log(`[✓] Created user: ${user.email}`);

      // Create wallet with all required fields
      await wallets.insertOne({
        _id: new ObjectId(),
        userId,
        balance: 10000,
        currency: 'USD',
        createdAt: now,
        updatedAt: now,
      });

      console.log(`[✓] Created wallet for ${user.email} (balance: $10,000)`);
    }

    console.log('\n✅ Demo users seeded successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('=====================================');
    console.log('Admin:   admin@platform.local / Admin@12345');
    console.log('Alice:   alice@example.local / User@12345');
    console.log('Bob:     bob@example.local / User@12345');
    console.log('Charlie: charlie@example.local / User@12345');
    console.log('=====================================\n');

  } catch (error) {
    console.error('Seed error:', error.message);
    if (error.errInfo) {
      console.error('Validation details:', JSON.stringify(error.errInfo, null, 2));
    }
    process.exit(1);
  } finally {
    await client.close();
  }
}

seed();
