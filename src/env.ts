import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(1),
  AUTH_URL: z.string().url(),
  REDIS_URL: z.string().min(1),
  STEAM_STORE_BASE_URL: z.string().url(),
  STEAM_API_BASE_URL: z.string().url(),
  STEAM_DEFAULT_COUNTRY: z.string().min(2).default("us"),
  STEAM_DEFAULT_LANGUAGE: z.string().min(2).default("en"),
  STEAM_REVIEW_MULTIPLIER: z.coerce.number().positive().default(45),
  STEAM_REQUEST_DELAY_MS: z.coerce.number().int().nonnegative().default(250),
  STEAM_APP_SYNC_LIMIT: z.coerce.number().int().positive().default(500),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional()
});

export const env = envSchema.parse(process.env);
