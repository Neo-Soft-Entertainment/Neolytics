import { Worker } from "bullmq";

import { bullConnection } from "@/jobs/steam/connection";
import { logger } from "@/lib/logger";
import { syncSteamApp } from "@/lib/steam/ingest";

const worker = new Worker(
  "steam-sync",
  async (job) => {
    const appId = Number(job.data.appId);
    await syncSteamApp(appId);
  },
  {
    connection: bullConnection,
    concurrency: 2
  }
);

worker.on("completed", (job) => {
  logger.info({ jobId: job.id, appId: job.data.appId }, "Steam sync completed");
});

worker.on("failed", (job, error) => {
  logger.error({ jobId: job?.id, appId: job?.data.appId, error }, "Steam sync failed");
});

process.on("SIGINT", async () => {
  await worker.close();
  process.exit(0);
});
