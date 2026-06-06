import { env } from "@/env";
import { logger } from "@/lib/logger";
import { fetchSteamAppList } from "@/lib/steam/client";
import { steamSyncQueue } from "@/jobs/steam/queue";

function getCliLimit() {
  const raw = process.argv.find((value) => value.startsWith("--limit="));

  if (!raw) {
    return env.STEAM_APP_SYNC_LIMIT;
  }

  const value = Number(raw.split("=")[1]);

  return Number.isFinite(value) && value > 0 ? value : env.STEAM_APP_SYNC_LIMIT;
}

async function main() {
  const limit = getCliLimit();
  const list = await fetchSteamAppList();
  const apps = list.applist.apps.filter((app) => app.name.trim().length > 0).slice(0, limit);

  for (const app of apps) {
    await steamSyncQueue.add(
      "steam-app-sync",
      { appId: app.appid },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000
        },
        removeOnComplete: 1000,
        removeOnFail: 5000
      }
    );
  }

  logger.info({ enqueued: apps.length }, "Steam sync jobs enqueued");
  await steamSyncQueue.close();
  process.exit(0);
}

main().catch((error) => {
  logger.error({ error }, "Failed to enqueue Steam sync jobs");
  process.exit(1);
});
