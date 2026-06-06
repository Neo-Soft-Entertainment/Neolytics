import { env } from "@/env";
import { logger } from "@/lib/logger";
import { syncSteamBatch } from "@/lib/steam/ingest";

async function main() {
  const result = await syncSteamBatch({
    mode: "catalog",
    limit: env.STEAM_APP_SYNC_LIMIT
  });

  logger.info(result, "Steam sync finished");
}

main().catch((error) => {
  logger.error({ error }, "Steam sync failed");
  process.exit(1);
});
