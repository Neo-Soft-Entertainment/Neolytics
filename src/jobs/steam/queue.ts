import { Queue } from "bullmq";

import { bullConnection } from "@/jobs/steam/connection";

export const steamSyncQueue = new Queue("steam-sync", {
  connection: bullConnection
});
