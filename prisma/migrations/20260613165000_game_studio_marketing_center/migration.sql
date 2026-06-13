CREATE TYPE "MarketingCampaignStatus" AS ENUM (
  'DRAFT',
  'PLANNED',
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
  'CANCELED'
);

CREATE TYPE "MarketingCampaignChannel" AS ENUM (
  'STEAM_STORE',
  'STEAM_NEXT_FEST',
  'DISCORD',
  'TIKTOK',
  'YOUTUBE',
  'INSTAGRAM',
  'REDDIT',
  'X',
  'PRESS',
  'INFLUENCER',
  'EMAIL',
  'META_ADS',
  'GOOGLE_ADS',
  'FESTIVAL',
  'COMMUNITY',
  'OTHER'
);

CREATE TYPE "MarketingCampaignObjective" AS ENUM (
  'WISHLISTS',
  'DEMO_DOWNLOADS',
  'LAUNCH_SALES',
  'PLAYTESTING',
  'PRESS_AWARENESS',
  'COMMUNITY_GROWTH',
  'PUBLISHER_SIGNAL',
  'RETENTION',
  'OTHER'
);

CREATE TABLE "MarketingCampaign" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "projectId" TEXT,
  "name" TEXT NOT NULL,
  "channel" "MarketingCampaignChannel" NOT NULL,
  "objective" "MarketingCampaignObjective" NOT NULL DEFAULT 'WISHLISTS',
  "status" "MarketingCampaignStatus" NOT NULL DEFAULT 'PLANNED',
  "currencyCode" TEXT NOT NULL DEFAULT 'USD',
  "budgetCents" BIGINT NOT NULL DEFAULT 0,
  "spendCents" BIGINT NOT NULL DEFAULT 0,
  "impressions" INTEGER NOT NULL DEFAULT 0,
  "clicks" INTEGER NOT NULL DEFAULT 0,
  "wishlists" INTEGER NOT NULL DEFAULT 0,
  "demoDownloads" INTEGER NOT NULL DEFAULT 0,
  "conversions" INTEGER NOT NULL DEFAULT 0,
  "revenueCents" BIGINT NOT NULL DEFAULT 0,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MarketingCampaign_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MarketingCampaign_organizationId_status_startsAt_idx" ON "MarketingCampaign"("organizationId", "status", "startsAt");
CREATE INDEX "MarketingCampaign_organizationId_channel_createdAt_idx" ON "MarketingCampaign"("organizationId", "channel", "createdAt" DESC);
CREATE INDEX "MarketingCampaign_projectId_createdAt_idx" ON "MarketingCampaign"("projectId", "createdAt" DESC);

ALTER TABLE "MarketingCampaign"
  ADD CONSTRAINT "MarketingCampaign_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MarketingCampaign"
  ADD CONSTRAINT "MarketingCampaign_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MarketingCampaign"
  ADD CONSTRAINT "MarketingCampaign_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MarketingCampaign" ENABLE ROW LEVEL SECURITY;
