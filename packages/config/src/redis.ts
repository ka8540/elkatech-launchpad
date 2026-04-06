import { Redis } from "ioredis";
import { getEnv } from "./env";

let redisClient: Redis | null = null;

export function getRedis() {
  if (!redisClient) {
    const url = getEnv().KV_URL || getEnv().REDIS_URL;
    if (url) {
      redisClient = new Redis(url, {
        retryStrategy(times) {
          return Math.min(times * 50, 2000);
        },
      });
    }
  }

  return redisClient;
}

export async function closeRedis() {
  if (redisClient) {
    redisClient.disconnect();
    redisClient = null;
  }
}
