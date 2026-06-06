import { z } from "zod";

const optionalString = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().min(1).optional());

const optionalEmail = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().email().optional());

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(1),
  AUTH_URL: z.string().url(),
  REDIS_URL: optionalString,
  CRON_SECRET: z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }, z.string().min(16).optional()),
  STEAM_STORE_BASE_URL: z.string().url(),
  STEAM_API_BASE_URL: z.string().url(),
  STEAM_WEB_API_KEY: optionalString,
  STEAM_DEFAULT_COUNTRY: z.string().min(2).default("us"),
  STEAM_DEFAULT_LANGUAGE: z.string().min(2).default("en"),
  STEAM_REVIEW_MULTIPLIER: z.coerce.number().positive().default(45),
  STEAM_REQUEST_DELAY_MS: z.coerce.number().int().nonnegative().default(250),
  STEAM_APP_SYNC_LIMIT: z.coerce.number().int().positive().default(500),
  STEAM_CRON_BATCH_SIZE: z.coerce.number().int().positive().max(100).default(25),
  ADMIN_EMAIL: optionalEmail,
  ADMIN_PASSWORD: z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }, z.string().min(8).optional()),
  GITHUB_ID: optionalString,
  GITHUB_SECRET: optionalString,
  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,
  DISCORD_CLIENT_ID: optionalString,
  DISCORD_CLIENT_SECRET: optionalString,
  STRIPE_SECRET_KEY: optionalString,
  STRIPE_WEBHOOK_SECRET: optionalString,
  STRIPE_PRICE_PLUS_MONTHLY: optionalString,
  STRIPE_PRICE_PRO_MONTHLY: optionalString,
  SUPABASE_URL: z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }, z.string().url().optional()),
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  COMPANY_DOCUMENTS_BUCKET: optionalString,
  GOOGLE_SHEETS_CLIENT_EMAIL: optionalEmail,
  GOOGLE_SHEETS_PRIVATE_KEY: optionalString,
  GOOGLE_SHEETS_FOLDER_ID: optionalString
});

export const env = envSchema.parse(process.env);
