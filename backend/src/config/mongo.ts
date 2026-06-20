import { MongoClient, Db } from 'mongodb';
import { env } from './env';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectMongo(): Promise<Db> {
  if (db) return db;
  client = new MongoClient(env.MONGODB_URI, {
    maxPoolSize: 20,
    retryWrites: true,
    w: 'majority',
  });
  await client.connect();
  db = client.db(env.MONGODB_DB);
  await client.db('admin').command({ ping: 1 });
  console.log(`[mongo] connected → ${env.MONGODB_DB}`);
  return db;
}

export function getClient(): MongoClient {
  if (!client) throw new Error('Mongo not connected');
  return client;
}

export function getDb(): Db {
  if (!db) throw new Error('Mongo not connected — call connectMongo() first');
  return db;
}

export async function closeMongo() {
  await client?.close();
  client = null; db = null;
}
