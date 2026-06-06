-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SIGNED', 'COMPLETED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "ContractCounterpartyType" AS ENUM ('PUBLISHER', 'INVESTOR', 'CLIENT', 'VENDOR', 'CONTRACTOR', 'PLATFORM', 'OTHER');

-- CreateEnum
CREATE TYPE "RoyaltyStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PENDING', 'PAID', 'OVERDUE', 'CANCELED');

-- CreateEnum
CREATE TYPE "ProjectMilestoneStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELED');

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "counterpartyName" TEXT NOT NULL,
    "counterpartyType" "ContractCounterpartyType" NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "totalValueCents" BIGINT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "autoRenews" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoyaltyAgreement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT,
    "contractId" TEXT,
    "name" TEXT NOT NULL,
    "partnerName" TEXT NOT NULL,
    "status" "RoyaltyStatus" NOT NULL DEFAULT 'DRAFT',
    "basisPoints" INTEGER NOT NULL,
    "recoupable" BOOLEAN NOT NULL DEFAULT false,
    "recoupCapCents" BIGINT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoyaltyAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoyaltyStatement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT,
    "royaltyAgreementId" TEXT NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "grossRevenueCents" BIGINT NOT NULL,
    "deductibleCents" BIGINT NOT NULL DEFAULT 0,
    "netRevenueCents" BIGINT NOT NULL,
    "royaltyDueCents" BIGINT NOT NULL,
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoyaltyStatement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssuedInvoice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT,
    "contractId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "amountCents" BIGINT NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "issuedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IssuedInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceivedInvoice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT,
    "contractId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "amountCents" BIGINT NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "issuedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceivedInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMilestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "ownerLabel" TEXT,
    "status" "ProjectMilestoneStatus" NOT NULL DEFAULT 'PLANNED',
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "budgetedCostCents" BIGINT NOT NULL DEFAULT 0,
    "expectedRevenueCents" BIGINT NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT,
    "contractId" TEXT,
    "requestedById" TEXT NOT NULL,
    "decidedById" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "actionLabel" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "amountCents" BIGINT,
    "reason" TEXT,
    "decisionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Contract_organizationId_createdAt_idx" ON "Contract"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Contract_projectId_createdAt_idx" ON "Contract"("projectId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Contract_organizationId_status_createdAt_idx" ON "Contract"("organizationId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "RoyaltyAgreement_organizationId_createdAt_idx" ON "RoyaltyAgreement"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "RoyaltyAgreement_projectId_createdAt_idx" ON "RoyaltyAgreement"("projectId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "RoyaltyAgreement_contractId_createdAt_idx" ON "RoyaltyAgreement"("contractId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "RoyaltyStatement_organizationId_createdAt_idx" ON "RoyaltyStatement"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "RoyaltyStatement_projectId_createdAt_idx" ON "RoyaltyStatement"("projectId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "RoyaltyStatement_royaltyAgreementId_createdAt_idx" ON "RoyaltyStatement"("royaltyAgreementId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "IssuedInvoice_projectId_createdAt_idx" ON "IssuedInvoice"("projectId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "IssuedInvoice_contractId_createdAt_idx" ON "IssuedInvoice"("contractId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "IssuedInvoice_organizationId_status_dueAt_idx" ON "IssuedInvoice"("organizationId", "status", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "IssuedInvoice_organizationId_invoiceNumber_key" ON "IssuedInvoice"("organizationId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "ReceivedInvoice_projectId_createdAt_idx" ON "ReceivedInvoice"("projectId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ReceivedInvoice_contractId_createdAt_idx" ON "ReceivedInvoice"("contractId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ReceivedInvoice_organizationId_status_dueAt_idx" ON "ReceivedInvoice"("organizationId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "ProjectMilestone_projectId_sortOrder_idx" ON "ProjectMilestone"("projectId", "sortOrder");

-- CreateIndex
CREATE INDEX "ProjectMilestone_projectId_status_dueAt_idx" ON "ProjectMilestone"("projectId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "ApprovalRequest_organizationId_createdAt_idx" ON "ApprovalRequest"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ApprovalRequest_organizationId_status_createdAt_idx" ON "ApprovalRequest"("organizationId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ApprovalRequest_entityType_entityId_createdAt_idx" ON "ApprovalRequest"("entityType", "entityId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ApprovalRequest_projectId_createdAt_idx" ON "ApprovalRequest"("projectId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoyaltyAgreement" ADD CONSTRAINT "RoyaltyAgreement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoyaltyAgreement" ADD CONSTRAINT "RoyaltyAgreement_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoyaltyAgreement" ADD CONSTRAINT "RoyaltyAgreement_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoyaltyStatement" ADD CONSTRAINT "RoyaltyStatement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoyaltyStatement" ADD CONSTRAINT "RoyaltyStatement_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoyaltyStatement" ADD CONSTRAINT "RoyaltyStatement_royaltyAgreementId_fkey" FOREIGN KEY ("royaltyAgreementId") REFERENCES "RoyaltyAgreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuedInvoice" ADD CONSTRAINT "IssuedInvoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuedInvoice" ADD CONSTRAINT "IssuedInvoice_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuedInvoice" ADD CONSTRAINT "IssuedInvoice_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivedInvoice" ADD CONSTRAINT "ReceivedInvoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivedInvoice" ADD CONSTRAINT "ReceivedInvoice_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivedInvoice" ADD CONSTRAINT "ReceivedInvoice_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMilestone" ADD CONSTRAINT "ProjectMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
