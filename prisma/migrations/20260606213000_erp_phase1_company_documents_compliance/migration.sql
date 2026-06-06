-- CreateEnum
CREATE TYPE "LegalEntityStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "TaxRegime" AS ENUM ('MEI', 'SIMPLES_NACIONAL', 'LUCRO_PRESUMIDO', 'LUCRO_REAL', 'OTHER');

-- CreateEnum
CREATE TYPE "CompanyDocumentType" AS ENUM (
    'CNPJ_CARD',
    'ARTICLES_OF_ASSOCIATION',
    'CONTRACT_AMENDMENT',
    'STATE_REGISTRATION',
    'MUNICIPAL_REGISTRATION',
    'TAX_CERTIFICATE',
    'TRADEMARK',
    'LICENSE',
    'NDA',
    'PUBLISHING_CONTRACT',
    'INVESTMENT_CONTRACT',
    'ACCOUNTING_RECORD',
    'OTHER'
);

-- CreateEnum
CREATE TYPE "CompanyDocumentStatus" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ComplianceType" AS ENUM ('TAX', 'LEGAL', 'CORPORATE', 'LABOR', 'ACCOUNTING', 'CERTIFICATE', 'OTHER');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'WAIVED', 'OVERDUE');

-- CreateTable
CREATE TABLE "LegalEntity" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tradeName" TEXT,
    "cnpj" TEXT,
    "legalNature" TEXT,
    "taxRegime" "TaxRegime" NOT NULL DEFAULT 'OTHER',
    "openingDate" TIMESTAMP(3),
    "status" "LegalEntityStatus" NOT NULL DEFAULT 'DRAFT',
    "cnaePrimary" TEXT,
    "cnaeSecondary" JSONB,
    "email" TEXT,
    "phone" TEXT,
    "websiteUrl" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "district" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "countryCode" TEXT NOT NULL DEFAULT 'BR',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalEntityBranch" (
    "id" TEXT NOT NULL,
    "legalEntityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tradeName" TEXT,
    "code" TEXT,
    "cnpj" TEXT,
    "stateRegistration" TEXT,
    "municipalRegistration" TEXT,
    "isHeadquarters" BOOLEAN NOT NULL DEFAULT false,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "district" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "countryCode" TEXT NOT NULL DEFAULT 'BR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalEntityBranch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalEntityShareholder" (
    "id" TEXT NOT NULL,
    "legalEntityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "role" TEXT,
    "ownershipPercent" DECIMAL(5,2),
    "joinedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalEntityShareholder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalEntityOfficer" (
    "id" TEXT NOT NULL,
    "legalEntityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "documentNumber" TEXT,
    "title" TEXT NOT NULL,
    "powers" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalEntityOfficer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyDocument" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "legalEntityId" TEXT,
    "projectId" TEXT,
    "type" "CompanyDocumentType" NOT NULL,
    "status" "CompanyDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "issuer" TEXT,
    "documentNumber" TEXT,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "tags" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyDocumentVersion" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "checksum" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyDocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "legalEntityId" TEXT,
    "projectId" TEXT,
    "sourceDocumentId" TEXT,
    "ownerUserId" TEXT,
    "type" "ComplianceType" NOT NULL,
    "status" "ComplianceStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LegalEntity_organizationId_slug_key" ON "LegalEntity"("organizationId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "LegalEntity_cnpj_key" ON "LegalEntity"("cnpj");

-- CreateIndex
CREATE INDEX "LegalEntity_organizationId_createdAt_idx" ON "LegalEntity"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "LegalEntityBranch_legalEntityId_code_key" ON "LegalEntityBranch"("legalEntityId", "code");

-- CreateIndex
CREATE INDEX "LegalEntityBranch_legalEntityId_createdAt_idx" ON "LegalEntityBranch"("legalEntityId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "LegalEntityShareholder_legalEntityId_createdAt_idx" ON "LegalEntityShareholder"("legalEntityId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "LegalEntityShareholder_documentNumber_idx" ON "LegalEntityShareholder"("documentNumber");

-- CreateIndex
CREATE INDEX "LegalEntityOfficer_legalEntityId_createdAt_idx" ON "LegalEntityOfficer"("legalEntityId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "LegalEntityOfficer_email_idx" ON "LegalEntityOfficer"("email");

-- CreateIndex
CREATE INDEX "CompanyDocument_organizationId_createdAt_idx" ON "CompanyDocument"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CompanyDocument_legalEntityId_createdAt_idx" ON "CompanyDocument"("legalEntityId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CompanyDocument_projectId_createdAt_idx" ON "CompanyDocument"("projectId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CompanyDocument_type_status_idx" ON "CompanyDocument"("type", "status");

-- CreateIndex
CREATE INDEX "CompanyDocument_expiresAt_idx" ON "CompanyDocument"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyDocumentVersion_documentId_version_key" ON "CompanyDocumentVersion"("documentId", "version");

-- CreateIndex
CREATE INDEX "CompanyDocumentVersion_documentId_createdAt_idx" ON "CompanyDocumentVersion"("documentId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CompanyDocumentVersion_uploadedById_createdAt_idx" ON "CompanyDocumentVersion"("uploadedById", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ComplianceItem_organizationId_createdAt_idx" ON "ComplianceItem"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ComplianceItem_organizationId_status_dueAt_idx" ON "ComplianceItem"("organizationId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "ComplianceItem_legalEntityId_status_dueAt_idx" ON "ComplianceItem"("legalEntityId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "ComplianceItem_projectId_status_dueAt_idx" ON "ComplianceItem"("projectId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "ComplianceItem_ownerUserId_status_dueAt_idx" ON "ComplianceItem"("ownerUserId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "AuditEvent_organizationId_createdAt_idx" ON "AuditEvent"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_createdAt_idx" ON "AuditEvent"("entityType", "entityId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AuditEvent_userId_createdAt_idx" ON "AuditEvent"("userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "LegalEntity" ADD CONSTRAINT "LegalEntity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalEntityBranch" ADD CONSTRAINT "LegalEntityBranch_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalEntityShareholder" ADD CONSTRAINT "LegalEntityShareholder_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalEntityOfficer" ADD CONSTRAINT "LegalEntityOfficer_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyDocument" ADD CONSTRAINT "CompanyDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyDocument" ADD CONSTRAINT "CompanyDocument_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyDocument" ADD CONSTRAINT "CompanyDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyDocumentVersion" ADD CONSTRAINT "CompanyDocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "CompanyDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyDocumentVersion" ADD CONSTRAINT "CompanyDocumentVersion_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceItem" ADD CONSTRAINT "ComplianceItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceItem" ADD CONSTRAINT "ComplianceItem_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceItem" ADD CONSTRAINT "ComplianceItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceItem" ADD CONSTRAINT "ComplianceItem_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "CompanyDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceItem" ADD CONSTRAINT "ComplianceItem_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
