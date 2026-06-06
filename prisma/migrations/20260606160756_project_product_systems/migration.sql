-- CreateEnum
CREATE TYPE "ProjectStage" AS ENUM ('DISCOVERY', 'PRE_PRODUCTION', 'PRODUCTION', 'LIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "elevatorPitch" TEXT,
    "description" TEXT,
    "genreInput" TEXT,
    "tagInput" TEXT,
    "targetAudience" TEXT,
    "coreLoop" TEXT,
    "differentiator" TEXT,
    "monetizationModel" TEXT,
    "artDirection" TEXT,
    "playerFantasy" TEXT,
    "pricePointCents" INTEGER,
    "stage" "ProjectStage" NOT NULL DEFAULT 'DISCOVERY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectAnalysis" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "matchingGamesCount" INTEGER NOT NULL,
    "competitionCount" INTEGER NOT NULL,
    "releaseMomentum" INTEGER NOT NULL,
    "averageReviewScore" DOUBLE PRECISION,
    "averagePriceCents" INTEGER,
    "medianRevenueCents" BIGINT,
    "marketSummary" TEXT NOT NULL,
    "opportunitySummary" TEXT NOT NULL,
    "riskSummary" TEXT NOT NULL,
    "audienceAutofill" TEXT,
    "coreLoopAutofill" TEXT,
    "suggestedGenres" JSONB,
    "suggestedTags" JSONB,
    "differentiators" JSONB,
    "metadata" JSONB,

    CONSTRAINT "ProjectAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectCompetitorGame" (
    "projectId" TEXT NOT NULL,
    "steamGameId" TEXT NOT NULL,

    CONSTRAINT "ProjectCompetitorGame_pkey" PRIMARY KEY ("projectId","steamGameId")
);

-- CreateTable
CREATE TABLE "ProjectGdd" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectGdd_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KanbanBoard" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KanbanBoard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KanbanColumn" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KanbanColumn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KanbanCard" (
    "id" TEXT NOT NULL,
    "columnId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assigneeLabel" TEXT,
    "dueDate" TIMESTAMP(3),
    "labels" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KanbanCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Project_organizationId_createdAt_idx" ON "Project"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Project_workspaceId_createdAt_idx" ON "Project"("workspaceId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Project_workspaceId_slug_key" ON "Project"("workspaceId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectAnalysis_projectId_key" ON "ProjectAnalysis"("projectId");

-- CreateIndex
CREATE INDEX "ProjectCompetitorGame_steamGameId_idx" ON "ProjectCompetitorGame"("steamGameId");

-- CreateIndex
CREATE INDEX "ProjectGdd_projectId_createdAt_idx" ON "ProjectGdd"("projectId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "KanbanBoard_projectId_createdAt_idx" ON "KanbanBoard"("projectId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "KanbanColumn_boardId_sortOrder_idx" ON "KanbanColumn"("boardId", "sortOrder");

-- CreateIndex
CREATE INDEX "KanbanCard_columnId_sortOrder_idx" ON "KanbanCard"("columnId", "sortOrder");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAnalysis" ADD CONSTRAINT "ProjectAnalysis_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCompetitorGame" ADD CONSTRAINT "ProjectCompetitorGame_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCompetitorGame" ADD CONSTRAINT "ProjectCompetitorGame_steamGameId_fkey" FOREIGN KEY ("steamGameId") REFERENCES "SteamGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectGdd" ADD CONSTRAINT "ProjectGdd_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanbanBoard" ADD CONSTRAINT "KanbanBoard_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanbanColumn" ADD CONSTRAINT "KanbanColumn_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "KanbanBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanbanCard" ADD CONSTRAINT "KanbanCard_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "KanbanColumn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
