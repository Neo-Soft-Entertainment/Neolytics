CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELED');

CREATE TYPE "SubscriptionPlan_new" AS ENUM ('FREE', 'PLUS', 'PRO');

ALTER TABLE "Organization"
ADD COLUMN     "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "subscriptionCurrentPeriodStart" TIMESTAMP(3),
ADD COLUMN     "subscriptionCurrentPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "subscriptionCanceledAt" TIMESTAMP(3);

UPDATE "Organization"
SET
  "subscriptionCurrentPeriodStart" = date_trunc('month', now()),
  "subscriptionCurrentPeriodEnd" = date_trunc('month', now()) + interval '1 month',
  "subscriptionStatus" = 'ACTIVE'
WHERE "subscriptionCurrentPeriodStart" IS NULL;

ALTER TABLE "Organization" ALTER COLUMN "subscriptionPlan" DROP DEFAULT;

ALTER TABLE "Organization"
ALTER COLUMN "subscriptionPlan" TYPE "SubscriptionPlan_new"
USING (
  CASE
    WHEN "subscriptionPlan"::text = 'FREE' THEN 'FREE'
    WHEN "subscriptionPlan"::text = 'INDIE' THEN 'PLUS'
    WHEN "subscriptionPlan"::text = 'STUDIO' THEN 'PRO'
    WHEN "subscriptionPlan"::text = 'PUBLISHER' THEN 'PRO'
    WHEN "subscriptionPlan"::text = 'ENTERPRISE' THEN 'PRO'
    ELSE 'FREE'
  END
)::"SubscriptionPlan_new";

ALTER TABLE "Organization" ALTER COLUMN "subscriptionPlan" SET DEFAULT 'FREE';

DROP TYPE "SubscriptionPlan";

ALTER TYPE "SubscriptionPlan_new" RENAME TO "SubscriptionPlan";

CREATE TABLE "OrganizationSubscriptionUsage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "reportsGenerated" INTEGER NOT NULL DEFAULT 0,
    "exportsGenerated" INTEGER NOT NULL DEFAULT 0,
    "projectAnalysesRun" INTEGER NOT NULL DEFAULT 0,
    "gddsGenerated" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationSubscriptionUsage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrganizationSubscriptionUsage_organizationId_periodKey_key" ON "OrganizationSubscriptionUsage"("organizationId", "periodKey");
CREATE INDEX "OrganizationSubscriptionUsage_organizationId_createdAt_idx" ON "OrganizationSubscriptionUsage"("organizationId", "createdAt" DESC);

ALTER TABLE "OrganizationSubscriptionUsage" ADD CONSTRAINT "OrganizationSubscriptionUsage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
