import { URL } from "node:url";

import { env } from "@/env";

const redisUrl = new URL(env.REDIS_URL);

export const bullConnection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379),
  username: redisUrl.username || undefined,
  password: redisUrl.password || undefined
};
