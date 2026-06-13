ALTER TYPE "OrganizationPermission" ADD VALUE 'MANAGE_COMMERCE';

CREATE TYPE "CommerceChannelType" AS ENUM (
  'DIRECT',
  'STEAM',
  'EPIC',
  'ITCH_IO',
  'MARKETPLACE',
  'RETAILER',
  'LICENSING',
  'SERVICE',
  'OTHER'
);

CREATE TYPE "CommerceOrderStatus" AS ENUM (
  'DRAFT',
  'QUOTED',
  'CONFIRMED',
  'IN_PRODUCTION',
  'FULFILLING',
  'FULFILLED',
  'CANCELED'
);

CREATE TYPE "CommerceFulfillmentStatus" AS ENUM (
  'NOT_REQUIRED',
  'PENDING',
  'PICKING',
  'READY_TO_SHIP',
  'SHIPPED',
  'DELIVERED',
  'BLOCKED'
);

CREATE TYPE "CommercePaymentStatus" AS ENUM (
  'PENDING',
  'AUTHORIZED',
  'PAID',
  'PARTIALLY_PAID',
  'REFUNDED',
  'CANCELED'
);

CREATE TABLE "CommerceChannel" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "CommerceChannelType" NOT NULL DEFAULT 'DIRECT',
  "externalCode" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CommerceChannel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommerceOrder" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "channelId" TEXT,
  "projectId" TEXT,
  "orderNumber" TEXT NOT NULL,
  "customerName" TEXT NOT NULL,
  "customerEmail" TEXT,
  "status" "CommerceOrderStatus" NOT NULL DEFAULT 'DRAFT',
  "fulfillmentStatus" "CommerceFulfillmentStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
  "paymentStatus" "CommercePaymentStatus" NOT NULL DEFAULT 'PENDING',
  "currencyCode" TEXT NOT NULL DEFAULT 'USD',
  "grossCents" BIGINT NOT NULL DEFAULT 0,
  "netCents" BIGINT NOT NULL DEFAULT 0,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "expectedShipAt" TIMESTAMP(3),
  "fulfilledAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CommerceOrder_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CommerceChannel_organizationId_active_idx" ON "CommerceChannel"("organizationId", "active");
CREATE INDEX "CommerceChannel_organizationId_createdAt_idx" ON "CommerceChannel"("organizationId", "createdAt" DESC);
CREATE UNIQUE INDEX "CommerceOrder_organizationId_orderNumber_key" ON "CommerceOrder"("organizationId", "orderNumber");
CREATE INDEX "CommerceOrder_organizationId_createdAt_idx" ON "CommerceOrder"("organizationId", "createdAt" DESC);
CREATE INDEX "CommerceOrder_organizationId_status_fulfillmentStatus_idx" ON "CommerceOrder"("organizationId", "status", "fulfillmentStatus");
CREATE INDEX "CommerceOrder_projectId_idx" ON "CommerceOrder"("projectId");
CREATE INDEX "CommerceOrder_channelId_idx" ON "CommerceOrder"("channelId");

ALTER TABLE "CommerceChannel"
  ADD CONSTRAINT "CommerceChannel_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommerceOrder"
  ADD CONSTRAINT "CommerceOrder_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommerceOrder"
  ADD CONSTRAINT "CommerceOrder_channelId_fkey"
  FOREIGN KEY ("channelId") REFERENCES "CommerceChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CommerceOrder"
  ADD CONSTRAINT "CommerceOrder_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CommerceOrder"
  ADD CONSTRAINT "CommerceOrder_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
