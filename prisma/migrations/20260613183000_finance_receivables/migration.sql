CREATE TABLE "ReceivableTitle" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT,
    "prefix" TEXT NOT NULL,
    "titleNumber" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "sourceDescription" TEXT NOT NULL,
    "customerIdentifier" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "actualDueDate" TIMESTAMP(3) NOT NULL,
    "titleAmountCents" BIGINT NOT NULL,
    "receivedAmountCents" BIGINT NOT NULL DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "status" "PayableTitleStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceivableTitle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReceivablePayment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "receivableTitleId" TEXT NOT NULL,
    "paymentType" "PayablePaymentType" NOT NULL,
    "bank" TEXT,
    "branch" TEXT,
    "account" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "history" TEXT,
    "discountCents" BIGINT NOT NULL DEFAULT 0,
    "interestCents" BIGINT NOT NULL DEFAULT 0,
    "amountReceivedCents" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceivablePayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReceivableTitle_organizationId_prefix_titleNumber_key" ON "ReceivableTitle"("organizationId", "prefix", "titleNumber");
CREATE INDEX "ReceivableTitle_organizationId_createdAt_idx" ON "ReceivableTitle"("organizationId", "createdAt" DESC);
CREATE INDEX "ReceivableTitle_organizationId_status_actualDueDate_idx" ON "ReceivableTitle"("organizationId", "status", "actualDueDate");
CREATE INDEX "ReceivableTitle_projectId_actualDueDate_idx" ON "ReceivableTitle"("projectId", "actualDueDate");
CREATE INDEX "ReceivableTitle_customerIdentifier_idx" ON "ReceivableTitle"("customerIdentifier");
CREATE INDEX "ReceivableTitle_customerName_idx" ON "ReceivableTitle"("customerName");
CREATE INDEX "ReceivableTitle_sourceDescription_idx" ON "ReceivableTitle"("sourceDescription");
CREATE INDEX "ReceivablePayment_organizationId_receivedAt_idx" ON "ReceivablePayment"("organizationId", "receivedAt" DESC);
CREATE INDEX "ReceivablePayment_receivableTitleId_receivedAt_idx" ON "ReceivablePayment"("receivableTitleId", "receivedAt" DESC);

ALTER TABLE "ReceivableTitle" ADD CONSTRAINT "ReceivableTitle_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReceivableTitle" ADD CONSTRAINT "ReceivableTitle_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReceivablePayment" ADD CONSTRAINT "ReceivablePayment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReceivablePayment" ADD CONSTRAINT "ReceivablePayment_receivableTitleId_fkey" FOREIGN KEY ("receivableTitleId") REFERENCES "ReceivableTitle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReceivableTitle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReceivablePayment" ENABLE ROW LEVEL SECURITY;
