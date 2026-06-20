/**
 * Fix duplicate null ticketId values in support_tickets collection
 * Run once to clean up the database
 */
import { MongoClient } from 'mongodb';
import { env } from '../src/config/env';

async function fixTicketIds() {
  console.log('Connecting to MongoDB...');
  const client = new MongoClient(env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected successfully');
    
    const db = client.db(env.MONGODB_DB);
    const collection = db.collection('support_tickets');
    
    // Find all documents with null or missing ticketId
    const ticketsWithoutId = await collection.find({
      $or: [
        { ticketId: null },
        { ticketId: { $exists: false } }
      ]
    }).toArray();
    
    console.log(`Found ${ticketsWithoutId.length} tickets without ticketId`);
    
    if (ticketsWithoutId.length === 0) {
      console.log('No fixes needed');
      return;
    }
    
    // Get current sequence value
    const counters = db.collection('counters');
    const counterDoc = await counters.findOne({ _id: 'support_ticket' });
    let seq = counterDoc?.seq || 0;
    
    // Update each ticket with a unique ticketId
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    for (const ticket of ticketsWithoutId) {
      seq++;
      const newTicketId = `TKT-${year}${month}-${String(seq).padStart(5, '0')}`;
      
      await collection.updateOne(
        { _id: ticket._id },
        { $set: { ticketId: newTicketId } }
      );
      
      console.log(`Updated ticket ${ticket._id} with ticketId: ${newTicketId}`);
    }
    
    // Update the counter
    await counters.updateOne(
      { _id: 'support_ticket' },
      { $set: { seq } },
      { upsert: true }
    );
    
    console.log(`Successfully updated ${ticketsWithoutId.length} tickets`);
    console.log(`Counter updated to: ${seq}`);
    
  } catch (error) {
    console.error('Error fixing ticket IDs:', error);
    throw error;
  } finally {
    await client.close();
    console.log('Connection closed');
  }
}

fixTicketIds()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
