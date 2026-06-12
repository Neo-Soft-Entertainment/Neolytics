CREATE TYPE "ConsentStatus" AS ENUM ('GRANTED', 'REVOKED', 'EXPIRED');
CREATE TYPE "DataSubjectRequestType" AS ENUM (
  'CONFIRM_PROCESSING',
  'ACCESS_PERSONAL_DATA',
  'CORRECT_PERSONAL_DATA',
  'EXPORT_PORTABILITY',
  'DELETE_PERSONAL_DATA',
  'ANONYMIZE_OR_BLOCK_DATA',
  'REVOKE_CONSENT',
  'OBJECT_TO_PROCESSING',
  'REVIEW_AUTOMATED_DECISION'
);
CREATE TYPE "DataSubjectRequestStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'COMPLETED', 'REJECTED');
CREATE TYPE "RetentionDeletionStrategy" AS ENUM ('DELETE', 'ANONYMIZE', 'ARCHIVE', 'BLOCK');
CREATE TYPE "PrivacyIncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "PrivacyIncidentStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CONTAINED', 'RESOLVED', 'CLOSED');
CREATE TYPE "DataProductType" AS ENUM (
  'AGGREGATED_INSIGHTS',
  'SYNTHETIC_DATASET',
  'ANONYMIZED_STATISTICS',
  'COHORT_REPORT',
  'PARTNER_ACTIVATION_WITH_EXPLICIT_CONSENT',
  'RAW_EVENTS',
  'USER_LEVEL_PROFILES',
  'PERSONAL_IDENTIFIER_LISTS',
  'PSEUDONYMOUS_IDENTIFIER_EXPORT',
  'SENSITIVE_DATA_EXPORT',
  'CHILD_OR_TEEN_COMMERCIAL_PROFILING'
);
CREATE TYPE "PrivacyDecision" AS ENUM ('ALLOW', 'ALLOW_WITH_TRANSFORMATION', 'BLOCK', 'REQUIRE_REVIEW');

CREATE TABLE "UserConsent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "purposeId" TEXT NOT NULL,
  "consentTextVersion" TEXT NOT NULL,
  "status" "ConsentStatus" NOT NULL DEFAULT 'GRANTED',
  "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "source" TEXT NOT NULL,
  "ipHash" TEXT,
  "userAgentHash" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserConsent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DataSubjectRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT,
  "requestType" "DataSubjectRequestType" NOT NULL,
  "status" "DataSubjectRequestStatus" NOT NULL DEFAULT 'OPEN',
  "reason" TEXT,
  "dueAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "handledById" TEXT,
  "resolution" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DataSubjectRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PrivacyLegalHold" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "deletionStrategy" "RetentionDeletionStrategy",
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT,
  "releasedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PrivacyLegalHold_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PrivacyIncident" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "severity" "PrivacyIncidentSeverity" NOT NULL,
  "affectedDataCategories" JSONB NOT NULL,
  "affectedUserCountEstimate" INTEGER,
  "discoveredAt" TIMESTAMP(3) NOT NULL,
  "containedAt" TIMESTAMP(3),
  "rootCause" TEXT,
  "mitigationSteps" TEXT,
  "requiresAuthorityNotification" BOOLEAN NOT NULL DEFAULT false,
  "requiresUserNotification" BOOLEAN NOT NULL DEFAULT false,
  "status" "PrivacyIncidentStatus" NOT NULL DEFAULT 'OPEN',
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PrivacyIncident_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DataProduct" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "productName" TEXT NOT NULL,
  "productType" "DataProductType" NOT NULL,
  "description" TEXT NOT NULL,
  "sourceTables" JSONB NOT NULL,
  "outputFields" JSONB NOT NULL,
  "aggregationLevel" TEXT,
  "minimumCohortSize" INTEGER NOT NULL DEFAULT 100,
  "privacyRiskScore" INTEGER NOT NULL DEFAULT 0,
  "exportAllowed" BOOLEAN NOT NULL DEFAULT false,
  "requiresLegalReview" BOOLEAN NOT NULL DEFAULT true,
  "requiresDpoApproval" BOOLEAN NOT NULL DEFAULT true,
  "contractRequired" BOOLEAN NOT NULL DEFAULT true,
  "reidentificationProhibited" BOOLEAN NOT NULL DEFAULT true,
  "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
  "approvedAt" TIMESTAMP(3),
  "approvedById" TEXT,
  "buyerContractAccepted" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DataProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DataExportManifest" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "productId" TEXT NOT NULL,
  "requestedById" TEXT,
  "buyerName" TEXT NOT NULL,
  "buyerEmail" TEXT,
  "contractAcceptedAt" TIMESTAMP(3),
  "decision" "PrivacyDecision" NOT NULL,
  "reason" TEXT,
  "manifest" JSONB NOT NULL,
  "downloadedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DataExportManifest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PrivacyAuditLog" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "actorId" TEXT,
  "actorRole" TEXT,
  "action" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT,
  "decision" "PrivacyDecision",
  "reason" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PrivacyAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserConsent_userId_purposeId_key" ON "UserConsent"("userId", "purposeId");
CREATE INDEX "UserConsent_status_updatedAt_idx" ON "UserConsent"("status", "updatedAt" DESC);
CREATE INDEX "UserConsent_userId_createdAt_idx" ON "UserConsent"("userId", "createdAt" DESC);
CREATE INDEX "DataSubjectRequest_userId_createdAt_idx" ON "DataSubjectRequest"("userId", "createdAt" DESC);
CREATE INDEX "DataSubjectRequest_organizationId_status_dueAt_idx" ON "DataSubjectRequest"("organizationId", "status", "dueAt");
CREATE INDEX "DataSubjectRequest_handledById_status_dueAt_idx" ON "DataSubjectRequest"("handledById", "status", "dueAt");
CREATE INDEX "PrivacyLegalHold_organizationId_active_createdAt_idx" ON "PrivacyLegalHold"("organizationId", "active", "createdAt" DESC);
CREATE INDEX "PrivacyLegalHold_resourceType_resourceId_active_idx" ON "PrivacyLegalHold"("resourceType", "resourceId", "active");
CREATE INDEX "PrivacyIncident_organizationId_severity_createdAt_idx" ON "PrivacyIncident"("organizationId", "severity", "createdAt" DESC);
CREATE INDEX "PrivacyIncident_status_discoveredAt_idx" ON "PrivacyIncident"("status", "discoveredAt" DESC);
CREATE INDEX "DataProduct_organizationId_createdAt_idx" ON "DataProduct"("organizationId", "createdAt" DESC);
CREATE INDEX "DataProduct_productType_approvalStatus_idx" ON "DataProduct"("productType", "approvalStatus");
CREATE INDEX "DataExportManifest_organizationId_createdAt_idx" ON "DataExportManifest"("organizationId", "createdAt" DESC);
CREATE INDEX "DataExportManifest_productId_createdAt_idx" ON "DataExportManifest"("productId", "createdAt" DESC);
CREATE INDEX "PrivacyAuditLog_organizationId_createdAt_idx" ON "PrivacyAuditLog"("organizationId", "createdAt" DESC);
CREATE INDEX "PrivacyAuditLog_actorId_createdAt_idx" ON "PrivacyAuditLog"("actorId", "createdAt" DESC);
CREATE INDEX "PrivacyAuditLog_resourceType_resourceId_createdAt_idx" ON "PrivacyAuditLog"("resourceType", "resourceId", "createdAt" DESC);

ALTER TABLE "UserConsent"
  ADD CONSTRAINT "UserConsent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DataSubjectRequest"
  ADD CONSTRAINT "DataSubjectRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DataSubjectRequest"
  ADD CONSTRAINT "DataSubjectRequest_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DataSubjectRequest"
  ADD CONSTRAINT "DataSubjectRequest_handledById_fkey"
  FOREIGN KEY ("handledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PrivacyLegalHold"
  ADD CONSTRAINT "PrivacyLegalHold_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PrivacyLegalHold"
  ADD CONSTRAINT "PrivacyLegalHold_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PrivacyIncident"
  ADD CONSTRAINT "PrivacyIncident_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PrivacyIncident"
  ADD CONSTRAINT "PrivacyIncident_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DataProduct"
  ADD CONSTRAINT "DataProduct_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DataProduct"
  ADD CONSTRAINT "DataProduct_approvedById_fkey"
  FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DataExportManifest"
  ADD CONSTRAINT "DataExportManifest_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DataExportManifest"
  ADD CONSTRAINT "DataExportManifest_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "DataProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DataExportManifest"
  ADD CONSTRAINT "DataExportManifest_requestedById_fkey"
  FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PrivacyAuditLog"
  ADD CONSTRAINT "PrivacyAuditLog_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PrivacyAuditLog"
  ADD CONSTRAINT "PrivacyAuditLog_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
