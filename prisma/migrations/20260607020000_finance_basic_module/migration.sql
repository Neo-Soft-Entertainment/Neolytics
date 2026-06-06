-- CreateEnum
CREATE TYPE "BudgetStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RevenueSourceType" AS ENUM ('STEAM', 'PUBLISHER', 'INVESTOR', 'GRANT', 'SERVICE', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('PAYROLL', 'CONTRACTOR', 'SOFTWARE', 'MARKETING', 'LEGAL', 'ACCOUNTING', 'ART', 'AUDIO', 'QA', 'LOCALIZATION', 'TAX', 'OTHER');

-- CreateEnum
CREATE TYPE "FinanceEntryStatus" AS ENUM ('PLANNED', 'PENDING', 'PAID', 'RECEIVED', 'CANCELED');

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT,
    "name" TEXT NOT NULL,
    "status" "BudgetStatus" NOT NULL DEFAULT 'DRAFT',
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "totalPlannedCents" BIGINT NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetLine" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "vendorName" TEXT,
    "plannedCents" BIGINT NOT NULL,
    "actualCents" BIGINT NOT NULL DEFAULT 0,
    "dueAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevenueEntry" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT,
    "sourceType" "RevenueSourceType" NOT NULL,
    "sourceName" TEXT NOT NULL,
    "status" "FinanceEntryStatus" NOT NULL DEFAULT 'RECEIVED',
    "grossCents" BIGINT NOT NULL,
    "netCents" BIGINT NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevenueEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseEntry" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT,
    "category" "ExpenseCategory" NOT NULL,
    "vendorName" TEXT NOT NULL,
    "status" "FinanceEntryStatus" NOT NULL DEFAULT 'PENDING',
    "amountCents" BIGINT NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "dueAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Budget_organizationId_createdAt_idx" ON "Budget"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Budget_projectId_createdAt_idx" ON "Budget"("projectId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Budget_organizationId_status_createdAt_idx" ON "Budget"("organizationId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "BudgetLine_budgetId_createdAt_idx" ON "BudgetLine"("budgetId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "BudgetLine_budgetId_dueAt_idx" ON "BudgetLine"("budgetId", "dueAt");

-- CreateIndex
CREATE INDEX "RevenueEntry_organizationId_receivedAt_idx" ON "RevenueEntry"("organizationId", "receivedAt" DESC);

-- CreateIndex
CREATE INDEX "RevenueEntry_projectId_receivedAt_idx" ON "RevenueEntry"("projectId", "receivedAt" DESC);

-- CreateIndex
CREATE INDEX "RevenueEntry_organizationId_sourceType_receivedAt_idx" ON "RevenueEntry"("organizationId", "sourceType", "receivedAt" DESC);

-- CreateIndex
CREATE INDEX "ExpenseEntry_organizationId_occurredAt_idx" ON "ExpenseEntry"("organizationId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "ExpenseEntry_projectId_occurredAt_idx" ON "ExpenseEntry"("projectId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "ExpenseEntry_organizationId_category_occurredAt_idx" ON "ExpenseEntry"("organizationId", "category", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "ExpenseEntry_organizationId_status_dueAt_idx" ON "ExpenseEntry"("organizationId", "status", "dueAt");

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetLine" ADD CONSTRAINT "BudgetLine_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueEntry" ADD CONSTRAINT "RevenueEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueEntry" ADD CONSTRAINT "RevenueEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseEntry" ADD CONSTRAINT "ExpenseEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseEntry" ADD CONSTRAINT "ExpenseEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
