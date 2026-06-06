import { z } from "zod";

import { env } from "@/env";
import { ok, serverError, unauthorized } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { parseSearchParams } from "@/lib/request";
import { syncSteamBatch } from "@/lib/steam/ingest";

export const maxDuration = 300;

const querySchema = z.object({
  mode: z.enum(["refresh", "catalog"]).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional()
});

export async function GET(request: Request) {
  if (!env.CRON_SECRET) {
    return unauthorized("CRON_SECRET is not configured.");
  }

  const authorization = request.headers.get("authorization");

  if (authorization !== `Bearer ${env.CRON_SECRET}`) {
    return unauthorized("Invalid cron authorization.");
  }

  const url = new URL(request.url);
  const query = parseSearchParams(url, querySchema);

  try {
    const result = await syncSteamBatch({
      mode: query.mode,
      limit: query.limit,
      offset: query.offset ?? 0
    });

    return ok({
      triggeredAt: new Date().toISOString(),
      ...result
    });
  } catch (error) {
    logger.error({ error, query }, "Cron Steam sync failed");
    return serverError("Steam cron sync failed.");
  }
}
