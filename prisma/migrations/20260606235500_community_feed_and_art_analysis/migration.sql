-- CreateEnum
CREATE TYPE "CommunityPostType" AS ENUM ('GENERAL', 'MARKET', 'IDEA', 'ART', 'SHOWCASE', 'HELP');

-- AlterTable
ALTER TABLE "OrganizationSubscriptionUsage"
ADD COLUMN "artAnalysesRun" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ProjectArtAnalysis" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "distinctivenessScore" INTEGER NOT NULL,
    "productionComplexityScore" INTEGER NOT NULL,
    "marketFitScore" INTEGER NOT NULL,
    "visualTrendScore" INTEGER NOT NULL,
    "styleSummary" TEXT NOT NULL,
    "fitSummary" TEXT NOT NULL,
    "productionSummary" TEXT NOT NULL,
    "recommendationSummary" TEXT NOT NULL,
    "paletteKeywords" JSONB,
    "moodKeywords" JSONB,
    "metadata" JSONB,

    CONSTRAINT "ProjectArtAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityPost" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "authorId" TEXT NOT NULL,
    "projectId" TEXT,
    "type" "CommunityPostType" NOT NULL DEFAULT 'GENERAL',
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" JSONB,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityPostLike" (
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityPostLike_pkey" PRIMARY KEY ("postId","userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectArtAnalysis_projectId_key" ON "ProjectArtAnalysis"("projectId");

-- CreateIndex
CREATE INDEX "CommunityPost_organizationId_createdAt_idx" ON "CommunityPost"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CommunityPost_projectId_createdAt_idx" ON "CommunityPost"("projectId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CommunityPost_authorId_createdAt_idx" ON "CommunityPost"("authorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CommunityPostLike_userId_createdAt_idx" ON "CommunityPostLike"("userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "ProjectArtAnalysis" ADD CONSTRAINT "ProjectArtAnalysis_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPostLike" ADD CONSTRAINT "CommunityPostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPostLike" ADD CONSTRAINT "CommunityPostLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
