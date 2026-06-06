import IORedis from "ioredis";

import { env } from "@/env";

if (!env.REDIS_URL) {
  throw new Error("REDIS_URL is required for Redis-backed jobs.");
}

const globalForRedis = globalThis as unknown as {
  redis: IORedis | undefined;
};

export const redis =
  globalForRedis.redis ??
  new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null
  });

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}
