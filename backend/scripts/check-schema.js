/**
 * Check MongoDB collection validators
 */
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB);
    
    // Get collection info
    const collections = await db.listCollections().toArray();
    
    for (const col of collections) {
      if (col.options && col.options.validator) {
        console.log(`\n${col.name}:`);
        console.log(JSON.stringify(col.options.validator, null, 2));
      }
    }
    
    // Get sample user
    const sampleUser = await db.collection('users').findOne({});
    console.log('\n\nSample User Document:');
    console.log(JSON.stringify(sampleUser, null, 2));
    
  } finally {
    await client.close();
  }
}

main();
