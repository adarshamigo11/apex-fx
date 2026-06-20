import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { connectMongo } from './config/mongo';
import { ensureIndexes } from './db/indexes';
import { connectRedis } from './config/redis';
import { initSocket } from './realtime/socket';

async function main() {
  await connectMongo();
  await ensureIndexes();
  await connectRedis().catch((e) => console.warn('[redis] not connected:', e.message));
  const app = createApp();
  const server = http.createServer(app);
  initSocket(server);
  server.listen(env.PORT, () => {
    const mode = env.TWELVE_DATA_API_KEY ? 'LIVE' : 'MOCK';
    const finnhub = env.FINNHUB_API_KEY ? 'YES' : 'NO';
    console.log(`API + WS on :${env.PORT} (data: ${mode}, finnhub-ws: ${finnhub})`);
  });
}
main().catch((e) => { console.error('Fatal startup error:', e); process.exit(1); });
