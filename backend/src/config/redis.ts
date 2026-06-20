import { createClient } from 'redis';
import { env } from './env';
export const redis = createClient({
  url: env.REDIS_URL,
  socket: { reconnectStrategy: (retries) => (retries > 5 ? new Error('Redis max retries') : Math.min(retries * 200, 2000)) },
});
redis.on('error', (e) => console.error('[redis]', e.message));
export async function connectRedis() {
  if (!redis.isOpen) await redis.connect();
}
