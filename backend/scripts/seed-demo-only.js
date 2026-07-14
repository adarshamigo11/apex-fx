// Quick seed script - creates only essential demo users
import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

async function seed() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/apexfx';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('[mongo] connected');
    
    const db = client.db('apexfx');
    const users = db.collection('users');
    const wallets = db.collection('wallets');
    const kyc = db.collection('kyc');

    // Create demo users
    const demoUsers = [
      { email: 'alice@example.local', name: 'Alice Demo', role: 'USER', status: 'ACTIVE' },
      { email: 'bob@example.local', name: 'Bob Demo', role: 'USER', status: 'ACTIVE' },
      { email: 'charlie@example.local', name: 'Charlie Demo', role: 'USER', status: 'ACTIVE' },
    ];

    for (const user of demoUsers) {
      const existing = await users.findOne({ email: user.email });
      if (existing) {
        console.log(`[skip] ${user.email} already exists`);
        continue;
      }

      const passwordHash = await bcrypt.hash('User@12345', 10);
      const userId = new ObjectId();
      
      await users.insertOne({
        _id: userId,
        email: user.email,
        passwordHash,
        fullName: user.name,
        role: user.role,
        status: user.status,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create wallet
      await wallets.insertOne({
        _id: new ObjectId(),
        userId,
        balance: 10000,
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log(`[✓] Created ${user.email} / User@12345`);
    }

    console.log('\n✅ Demo users seeded successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('Admin: admin@platform.local / Admin@12345');
    console.log('Alice: alice@example.local / User@12345');
    console.log('Bob: bob@example.local / User@12345');
    console.log('Charlie: charlie@example.local / User@12345');

  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seed();
