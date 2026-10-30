import { Redis } from 'ioredis';

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL is not defined");
}

// L'URL Upstash (rediss://) inclut le support TLS natif.
const connection = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export default connection;
