-- CreateEnum
CREATE TYPE "PayableTitleStatus" AS ENUM ('OPEN', 'PARTIALLY_PAID', 'PAID', 'CANCELED');

-- CreateEnum
CREATE TYPE "PayablePaymentType" AS ENUM ('BANK', 'CASH', 'CARD', 'TRANSFER', 'PIX', 'CHECK', 'BOLETO', 'OTHER');

-- CreateTable
CREATE TABLE "CostCenter" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostCenter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayableTitle" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT,
    "costCenterId" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "titleNumber" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "natureDescription" TEXT NOT NULL,
    "supplierIdentifier" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "actualDueDate" TIMESTAMP(3) NOT NULL,
    "titleAmountCents" BIGINT NOT NULL,
    "additionalAmountCents" BIGINT NOT NULL DEFAULT 0,
    "totalAmountCents" BIGINT NOT NULL,
    "paidAmountCents" BIGINT NOT NULL DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "status" "PayableTitleStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayableTitle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayableAllocation" (
    "id" TEXT NOT NULL,
    "payableTitleId" TEXT NOT NULL,
    "costCenterId" TEXT NOT NULL,
    "natureDescription" TEXT NOT NULL,
    "amountCents" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayableAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayablePayment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "payableTitleId" TEXT NOT NULL,
    "paymentType" "PayablePaymentType" NOT NULL,
    "bank" TEXT,
    "branch" TEXT,
    "account" TEXT,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "history" TEXT,
    "fineCents" BIGINT NOT NULL DEFAULT 0,
    "interestCents" BIGINT NOT NULL DEFAULT 0,
    "amountPaidCents" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayablePayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CostCenter_organizationId_createdAt_idx" ON "CostCenter"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "CostCenter_organizationId_code_key" ON "CostCenter"("organizationId", "code");

-- CreateIndex
CREATE INDEX "PayableTitle_organizationId_createdAt_idx" ON "PayableTitle"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "PayableTitle_organizationId_status_actualDueDate_idx" ON "PayableTitle"("organizationId", "status", "actualDueDate");

-- CreateIndex
CREATE INDEX "PayableTitle_projectId_actualDueDate_idx" ON "PayableTitle"("projectId", "actualDueDate");

-- CreateIndex
CREATE INDEX "PayableTitle_supplierIdentifier_idx" ON "PayableTitle"("supplierIdentifier");

-- CreateIndex
CREATE INDEX "PayableTitle_supplierName_idx" ON "PayableTitle"("supplierName");

-- CreateIndex
CREATE INDEX "PayableTitle_natureDescription_idx" ON "PayableTitle"("natureDescription");

-- CreateIndex
CREATE UNIQUE INDEX "PayableTitle_organizationId_prefix_titleNumber_key" ON "PayableTitle"("organizationId", "prefix", "titleNumber");

-- CreateIndex
CREATE INDEX "PayableAllocation_payableTitleId_createdAt_idx" ON "PayableAllocation"("payableTitleId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "PayableAllocation_costCenterId_createdAt_idx" ON "PayableAllocation"("costCenterId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "PayablePayment_organizationId_paymentDate_idx" ON "PayablePayment"("organizationId", "paymentDate" DESC);

-- CreateIndex
CREATE INDEX "PayablePayment_payableTitleId_paymentDate_idx" ON "PayablePayment"("payableTitleId", "paymentDate" DESC);

-- AddForeignKey
ALTER TABLE "CostCenter" ADD CONSTRAINT "CostCenter_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayableTitle" ADD CONSTRAINT "PayableTitle_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayableTitle" ADD CONSTRAINT "PayableTitle_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayableTitle" ADD CONSTRAINT "PayableTitle_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayableAllocation" ADD CONSTRAINT "PayableAllocation_payableTitleId_fkey" FOREIGN KEY ("payableTitleId") REFERENCES "PayableTitle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayableAllocation" ADD CONSTRAINT "PayableAllocation_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayablePayment" ADD CONSTRAINT "PayablePayment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayablePayment" ADD CONSTRAINT "PayablePayment_payableTitleId_fkey" FOREIGN KEY ("payableTitleId") REFERENCES "PayableTitle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
