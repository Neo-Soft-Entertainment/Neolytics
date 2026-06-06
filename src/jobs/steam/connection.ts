import { URL } from "node:url";

import { env } from "@/env";

if (!env.REDIS_URL) {
  throw new Error("REDIS_URL is required for BullMQ jobs.");
}

const redisUrl = new URL(env.REDIS_URL);

export const bullConnection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379),
  username: redisUrl.username || undefined,
  password: redisUrl.password || undefined
};
