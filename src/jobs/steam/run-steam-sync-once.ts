import { env } from "@/env";
import { logger } from "@/lib/logger";
import { fetchSteamAppList } from "@/lib/steam/client";
import { syncSteamApp } from "@/lib/steam/ingest";

async function main() {
  const list = await fetchSteamAppList();
  const apps = list.applist.apps.filter((app) => app.name.trim().length > 0).slice(0, env.STEAM_APP_SYNC_LIMIT);

  for (const app of apps) {
    await syncSteamApp(app.appid);
  }

  logger.info({ processed: apps.length }, "Steam sync finished");
}

main().catch((error) => {
  logger.error({ error }, "Steam sync failed");
  process.exit(1);
});
