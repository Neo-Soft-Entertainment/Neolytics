-- CreateEnum
CREATE TYPE "OrganizationRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'INDIE', 'STUDIO', 'PUBLISHER', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "ReviewSentiment" AS ENUM ('OVERWHELMINGLY_POSITIVE', 'VERY_POSITIVE', 'POSITIVE', 'MOSTLY_POSITIVE', 'MIXED', 'MOSTLY_NEGATIVE', 'NEGATIVE', 'VERY_NEGATIVE', 'OVERWHELMINGLY_NEGATIVE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "EstimateConfidence" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('MARKET', 'GAME', 'COMPETITOR', 'OPPORTUNITY');

-- CreateEnum
CREATE TYPE "IngestionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("sessionToken")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "subscriptionPlan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMember" (
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrganizationRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("organizationId","userId")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SteamGame" (
    "id" TEXT NOT NULL,
    "appId" INTEGER NOT NULL,
    "type" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortDescription" TEXT,
    "releaseDate" TIMESTAMP(3),
    "releaseDateText" TEXT,
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "isEarlyAccess" BOOLEAN NOT NULL DEFAULT false,
    "capsuleImageUrl" TEXT,
    "headerImageUrl" TEXT,
    "websiteUrl" TEXT,
    "supportUrl" TEXT,
    "supportedLanguages" TEXT,
    "metacriticScore" INTEGER,
    "currentPlayers" INTEGER,
    "reviewScore" DOUBLE PRECISION,
    "reviewScoreLabel" "ReviewSentiment" NOT NULL DEFAULT 'UNKNOWN',
    "reviewCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastIngestedAt" TIMESTAMP(3),

    CONSTRAINT "SteamGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SteamGameSnapshot" (
    "id" TEXT NOT NULL,
    "steamGameId" TEXT NOT NULL,
    "ingestionRunId" TEXT,
    "snapshotDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "shortDescription" TEXT,
    "rawGenres" JSONB,
    "rawCategories" JSONB,
    "rawDevelopers" JSONB,
    "rawPublishers" JSONB,
    "rawPayload" JSONB,
    "releaseDate" TIMESTAMP(3),
    "releaseDateText" TEXT,
    "isFree" BOOLEAN NOT NULL,
    "isEarlyAccess" BOOLEAN NOT NULL,
    "websiteUrl" TEXT,
    "supportUrl" TEXT,
    "metacriticScore" INTEGER,
    "reviewScore" DOUBLE PRECISION,
    "reviewCount" INTEGER,
    "currentPlayers" INTEGER,

    CONSTRAINT "SteamGameSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SteamPrice" (
    "id" TEXT NOT NULL,
    "steamGameId" TEXT NOT NULL,
    "currency" TEXT,
    "initialPriceCents" INTEGER,
    "finalPriceCents" INTEGER,
    "discountPercent" INTEGER,
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SteamPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SteamPriceSnapshot" (
    "id" TEXT NOT NULL,
    "steamGameId" TEXT NOT NULL,
    "ingestionRunId" TEXT,
    "snapshotDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currency" TEXT,
    "initialPriceCents" INTEGER,
    "finalPriceCents" INTEGER,
    "discountPercent" INTEGER,
    "isFree" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SteamPriceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SteamReviewSnapshot" (
    "id" TEXT NOT NULL,
    "steamGameId" TEXT NOT NULL,
    "ingestionRunId" TEXT,
    "snapshotDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalReviews" INTEGER NOT NULL,
    "totalPositiveReviews" INTEGER NOT NULL,
    "totalNegativeReviews" INTEGER NOT NULL,
    "reviewScore" DOUBLE PRECISION,
    "reviewScoreLabel" "ReviewSentiment" NOT NULL DEFAULT 'UNKNOWN',

    CONSTRAINT "SteamReviewSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SteamPlayerCountSnapshot" (
    "id" TEXT NOT NULL,
    "steamGameId" TEXT NOT NULL,
    "ingestionRunId" TEXT,
    "snapshotDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPlayers" INTEGER NOT NULL,

    CONSTRAINT "SteamPlayerCountSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SteamTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "steamTagId" INTEGER,

    CONSTRAINT "SteamTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SteamGameTag" (
    "steamGameId" TEXT NOT NULL,
    "steamTagId" TEXT NOT NULL,
    "weight" INTEGER,

    CONSTRAINT "SteamGameTag_pkey" PRIMARY KEY ("steamGameId","steamTagId")
);

-- CreateTable
CREATE TABLE "SteamGenre" (
    "id" TEXT NOT NULL,
    "steamGenreId" INTEGER,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "SteamGenre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SteamGameGenre" (
    "steamGameId" TEXT NOT NULL,
    "steamGenreId" TEXT NOT NULL,

    CONSTRAINT "SteamGameGenre_pkey" PRIMARY KEY ("steamGameId","steamGenreId")
);

-- CreateTable
CREATE TABLE "SteamDeveloper" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "SteamDeveloper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SteamPublisher" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "SteamPublisher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SteamGameDeveloper" (
    "steamGameId" TEXT NOT NULL,
    "steamDeveloperId" TEXT NOT NULL,

    CONSTRAINT "SteamGameDeveloper_pkey" PRIMARY KEY ("steamGameId","steamDeveloperId")
);

-- CreateTable
CREATE TABLE "SteamGamePublisher" (
    "steamGameId" TEXT NOT NULL,
    "steamPublisherId" TEXT NOT NULL,

    CONSTRAINT "SteamGamePublisher_pkey" PRIMARY KEY ("steamGameId","steamPublisherId")
);

-- CreateTable
CREATE TABLE "SalesEstimate" (
    "id" TEXT NOT NULL,
    "steamGameId" TEXT NOT NULL,
    "ingestionRunId" TEXT,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewMultiplier" DOUBLE PRECISION NOT NULL,
    "genreAdjustment" DOUBLE PRECISION NOT NULL,
    "priceTierAdjustment" DOUBLE PRECISION NOT NULL,
    "ageAdjustment" DOUBLE PRECISION NOT NULL,
    "confidence" "EstimateConfidence" NOT NULL,
    "confidenceScore" INTEGER NOT NULL,
    "lowEstimate" INTEGER NOT NULL,
    "medianEstimate" INTEGER NOT NULL,
    "highEstimate" INTEGER NOT NULL,
    "explanation" TEXT NOT NULL,

    CONSTRAINT "SalesEstimate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevenueEstimate" (
    "id" TEXT NOT NULL,
    "steamGameId" TEXT NOT NULL,
    "ingestionRunId" TEXT,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "averagePriceCents" INTEGER NOT NULL,
    "lowGrossRevenueCents" INTEGER NOT NULL,
    "medianGrossRevenueCents" INTEGER NOT NULL,
    "highGrossRevenueCents" INTEGER NOT NULL,
    "lowNetRevenueCents" INTEGER NOT NULL,
    "medianNetRevenueCents" INTEGER NOT NULL,
    "highNetRevenueCents" INTEGER NOT NULL,
    "confidence" "EstimateConfidence" NOT NULL,
    "confidenceScore" INTEGER NOT NULL,
    "explanation" TEXT NOT NULL,

    CONSTRAINT "RevenueEstimate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiReport" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "createdById" TEXT NOT NULL,
    "reportType" "ReportType" NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "prompt" TEXT,
    "content" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "steamGameId" TEXT,

    CONSTRAINT "AiReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedGame" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "steamGameId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitorSet" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitorSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitorSetGame" (
    "competitorSetId" TEXT NOT NULL,
    "steamGameId" TEXT NOT NULL,

    CONSTRAINT "CompetitorSetGame_pkey" PRIMARY KEY ("competitorSetId","steamGameId")
);

-- CreateTable
CREATE TABLE "IngestionRun" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "source" TEXT NOT NULL,
    "sourceKey" TEXT,
    "status" "IngestionStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "IngestionRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");

-- CreateIndex
CREATE INDEX "Workspace_organizationId_idx" ON "Workspace"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_organizationId_slug_key" ON "Workspace"("organizationId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "SteamGame_appId_key" ON "SteamGame"("appId");

-- CreateIndex
CREATE UNIQUE INDEX "SteamGame_slug_key" ON "SteamGame"("slug");

-- CreateIndex
CREATE INDEX "SteamGame_name_idx" ON "SteamGame"("name");

-- CreateIndex
CREATE INDEX "SteamGame_releaseDate_idx" ON "SteamGame"("releaseDate");

-- CreateIndex
CREATE INDEX "SteamGame_reviewCount_idx" ON "SteamGame"("reviewCount");

-- CreateIndex
CREATE INDEX "SteamGameSnapshot_steamGameId_snapshotDate_idx" ON "SteamGameSnapshot"("steamGameId", "snapshotDate" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "SteamPrice_steamGameId_key" ON "SteamPrice"("steamGameId");

-- CreateIndex
CREATE INDEX "SteamPriceSnapshot_steamGameId_snapshotDate_idx" ON "SteamPriceSnapshot"("steamGameId", "snapshotDate" DESC);

-- CreateIndex
CREATE INDEX "SteamReviewSnapshot_steamGameId_snapshotDate_idx" ON "SteamReviewSnapshot"("steamGameId", "snapshotDate" DESC);

-- CreateIndex
CREATE INDEX "SteamPlayerCountSnapshot_steamGameId_snapshotDate_idx" ON "SteamPlayerCountSnapshot"("steamGameId", "snapshotDate" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "SteamTag_slug_key" ON "SteamTag"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SteamTag_name_key" ON "SteamTag"("name");

-- CreateIndex
CREATE INDEX "SteamGameTag_steamTagId_idx" ON "SteamGameTag"("steamTagId");

-- CreateIndex
CREATE UNIQUE INDEX "SteamGenre_name_key" ON "SteamGenre"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SteamGenre_slug_key" ON "SteamGenre"("slug");

-- CreateIndex
CREATE INDEX "SteamGameGenre_steamGenreId_idx" ON "SteamGameGenre"("steamGenreId");

-- CreateIndex
CREATE UNIQUE INDEX "SteamDeveloper_name_key" ON "SteamDeveloper"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SteamDeveloper_slug_key" ON "SteamDeveloper"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SteamPublisher_name_key" ON "SteamPublisher"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SteamPublisher_slug_key" ON "SteamPublisher"("slug");

-- CreateIndex
CREATE INDEX "SteamGameDeveloper_steamDeveloperId_idx" ON "SteamGameDeveloper"("steamDeveloperId");

-- CreateIndex
CREATE INDEX "SteamGamePublisher_steamPublisherId_idx" ON "SteamGamePublisher"("steamPublisherId");

-- CreateIndex
CREATE INDEX "SalesEstimate_steamGameId_calculatedAt_idx" ON "SalesEstimate"("steamGameId", "calculatedAt" DESC);

-- CreateIndex
CREATE INDEX "RevenueEstimate_steamGameId_calculatedAt_idx" ON "RevenueEstimate"("steamGameId", "calculatedAt" DESC);

-- CreateIndex
CREATE INDEX "AiReport_organizationId_createdAt_idx" ON "AiReport"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AiReport_workspaceId_createdAt_idx" ON "AiReport"("workspaceId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "SavedGame_userId_idx" ON "SavedGame"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedGame_workspaceId_steamGameId_key" ON "SavedGame"("workspaceId", "steamGameId");

-- CreateIndex
CREATE INDEX "CompetitorSet_organizationId_createdAt_idx" ON "CompetitorSet"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CompetitorSet_workspaceId_createdAt_idx" ON "CompetitorSet"("workspaceId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CompetitorSetGame_steamGameId_idx" ON "CompetitorSetGame"("steamGameId");

-- CreateIndex
CREATE INDEX "IngestionRun_source_startedAt_idx" ON "IngestionRun"("source", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "IngestionRun_status_startedAt_idx" ON "IngestionRun"("status", "startedAt" DESC);

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SteamGameSnapshot" ADD CONSTRAINT "SteamGameSnapshot_steamGameId_fkey" FOREIGN KEY ("steamGameId") REFERENCES "SteamGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SteamGameSnapshot" ADD CONSTRAINT "SteamGameSnapshot_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "IngestionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SteamPrice" ADD CONSTRAINT "SteamPrice_steamGameId_fkey" FOREIGN KEY ("steamGameId") REFERENCES "SteamGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SteamPriceSnapshot" ADD CONSTRAINT "SteamPriceSnapshot_steamGameId_fkey" FOREIGN KEY ("steamGameId") REFERENCES "SteamGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SteamPriceSnapshot" ADD CONSTRAINT "SteamPriceSnapshot_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "IngestionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SteamReviewSnapshot" ADD CONSTRAINT "SteamReviewSnapshot_steamGameId_fkey" FOREIGN KEY ("steamGameId") REFERENCES "SteamGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SteamReviewSnapshot" ADD CONSTRAINT "SteamReviewSnapshot_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "IngestionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SteamPlayerCountSnapshot" ADD CONSTRAINT "SteamPlayerCountSnapshot_steamGameId_fkey" FOREIGN KEY ("steamGameId") REFERENCES "SteamGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SteamPlayerCountSnapshot" ADD CONSTRAINT "SteamPlayerCountSnapshot_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "IngestionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SteamGameTag" ADD CONSTRAINT "SteamGameTag_steamGameId_fkey" FOREIGN KEY ("steamGameId") REFERENCES "SteamGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SteamGameTag" ADD CONSTRAINT "SteamGameTag_steamTagId_fkey" FOREIGN KEY ("steamTagId") REFERENCES "SteamTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SteamGameGenre" ADD CONSTRAINT "SteamGameGenre_steamGameId_fkey" FOREIGN KEY ("steamGameId") REFERENCES "SteamGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SteamGameGenre" ADD CONSTRAINT "SteamGameGenre_steamGenreId_fkey" FOREIGN KEY ("steamGenreId") REFERENCES "SteamGenre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SteamGameDeveloper" ADD CONSTRAINT "SteamGameDeveloper_steamGameId_fkey" FOREIGN KEY ("steamGameId") REFERENCES "SteamGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SteamGameDeveloper" ADD CONSTRAINT "SteamGameDeveloper_steamDeveloperId_fkey" FOREIGN KEY ("steamDeveloperId") REFERENCES "SteamDeveloper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SteamGamePublisher" ADD CONSTRAINT "SteamGamePublisher_steamGameId_fkey" FOREIGN KEY ("steamGameId") REFERENCES "SteamGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SteamGamePublisher" ADD CONSTRAINT "SteamGamePublisher_steamPublisherId_fkey" FOREIGN KEY ("steamPublisherId") REFERENCES "SteamPublisher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesEstimate" ADD CONSTRAINT "SalesEstimate_steamGameId_fkey" FOREIGN KEY ("steamGameId") REFERENCES "SteamGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesEstimate" ADD CONSTRAINT "SalesEstimate_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "IngestionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueEstimate" ADD CONSTRAINT "RevenueEstimate_steamGameId_fkey" FOREIGN KEY ("steamGameId") REFERENCES "SteamGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueEstimate" ADD CONSTRAINT "RevenueEstimate_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "IngestionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiReport" ADD CONSTRAINT "AiReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiReport" ADD CONSTRAINT "AiReport_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiReport" ADD CONSTRAINT "AiReport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiReport" ADD CONSTRAINT "AiReport_steamGameId_fkey" FOREIGN KEY ("steamGameId") REFERENCES "SteamGame"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedGame" ADD CONSTRAINT "SavedGame_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedGame" ADD CONSTRAINT "SavedGame_steamGameId_fkey" FOREIGN KEY ("steamGameId") REFERENCES "SteamGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedGame" ADD CONSTRAINT "SavedGame_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorSet" ADD CONSTRAINT "CompetitorSet_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorSet" ADD CONSTRAINT "CompetitorSet_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorSet" ADD CONSTRAINT "CompetitorSet_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorSetGame" ADD CONSTRAINT "CompetitorSetGame_competitorSetId_fkey" FOREIGN KEY ("competitorSetId") REFERENCES "CompetitorSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorSetGame" ADD CONSTRAINT "CompetitorSetGame_steamGameId_fkey" FOREIGN KEY ("steamGameId") REFERENCES "SteamGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestionRun" ADD CONSTRAINT "IngestionRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
