ALTER TABLE "Organization"
ADD COLUMN "discordWebhookUrl" TEXT,
ADD COLUMN "discordWebhookEnabled" BOOLEAN NOT NULL DEFAULT false;
