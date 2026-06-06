import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(1),
  AUTH_URL: z.string().url(),
  REDIS_URL: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(16).optional(),
  STEAM_STORE_BASE_URL: z.string().url(),
  STEAM_API_BASE_URL: z.string().url(),
  STEAM_WEB_API_KEY: z.string().min(1).optional(),
  STEAM_DEFAULT_COUNTRY: z.string().min(2).default("us"),
  STEAM_DEFAULT_LANGUAGE: z.string().min(2).default("en"),
  STEAM_REVIEW_MULTIPLIER: z.coerce.number().positive().default(45),
  STEAM_REQUEST_DELAY_MS: z.coerce.number().int().nonnegative().default(250),
  STEAM_APP_SYNC_LIMIT: z.coerce.number().int().positive().default(500),
  STEAM_CRON_BATCH_SIZE: z.coerce.number().int().positive().max(100).default(25),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
  DISCORD_CLIENT_ID: z.string().min(1).optional(),
  DISCORD_CLIENT_SECRET: z.string().min(1).optional(),
  GOOGLE_SHEETS_CLIENT_EMAIL: z.string().email().optional(),
  GOOGLE_SHEETS_PRIVATE_KEY: z.string().min(1).optional(),
  GOOGLE_SHEETS_FOLDER_ID: z.string().min(1).optional()
});

export const env = envSchema.parse(process.env);
