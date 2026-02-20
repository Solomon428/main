/**
 * Redis Client for CreditorFlow EMS
 * Provides caching and pub/sub capabilities
 */

import Redis from "ioredis";

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || "0"),
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  showFriendlyErrorStack: process.env.NODE_ENV === "development",
};

// Create Redis client
export const redis = new Redis(redisConfig);

// Create a separate client for pub/sub
export const redisPub = new Redis(redisConfig);
export const redisSub = new Redis(redisConfig);

// Handle connection events
redis.on("connect", () => {
  console.log("🔌 Redis connected");
});

redis.on("ready", () => {
  console.log("✅ Redis ready");
});

redis.on("error", (error) => {
  console.error("❌ Redis error:", error.message);
});

redis.on("reconnecting", () => {
  console.log("🔄 Redis reconnecting...");
});

// Cache helper functions
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Cache get error:", error);
    return null;
  }
}

export async function setCache<T>(
  key: string,
  value: T,
  ttlSeconds?: number,
): Promise<void> {
  try {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await redis.setex(key, ttlSeconds, serialized);
    } else {
      await redis.set(key, serialized);
    }
  } catch (error) {
    console.error("Cache set error:", error);
  }
}

export async function deleteCache(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (error) {
    console.error("Cache delete error:", error);
  }
}

export async function clearPattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.error("Cache clear pattern error:", error);
  }
}

// Pub/Sub helpers
export function subscribe(
  channel: string,
  callback: (message: string) => void,
): void {
  redisSub.subscribe(channel);
  redisSub.on("message", (receivedChannel, message) => {
    if (receivedChannel === channel) {
      callback(message);
    }
  });
}

export async function publish(channel: string, message: string): Promise<void> {
  await redisPub.publish(channel, message);
}

// Health check
export async function checkRedisHealth(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}

export default redis;
