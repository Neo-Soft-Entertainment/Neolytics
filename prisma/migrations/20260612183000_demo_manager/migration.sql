CREATE TYPE "DemoElementKind" AS ENUM ('MECHANIC', 'CHARACTER', 'ITEM', 'LOCATION', 'DIALOGUE', 'QUEST');

CREATE TYPE "DemoEntityStatus" AS ENUM ('IDEA', 'PLANNED', 'IN_DEVELOPMENT', 'IMPLEMENTED', 'TESTING', 'REVIEW', 'CUT', 'DEFERRED');

CREATE TYPE "DemoPriority" AS ENUM ('ESSENTIAL', 'IMPORTANT', 'OPTIONAL', 'POST_DEMO');

CREATE TYPE "DemoStage" AS ENUM ('IDEATION', 'INITIAL_ORGANIZATION', 'DEMO_DEFINITION', 'PLAYABLE_LINE_PLANNING', 'FOUNDATION_IMPLEMENTATION', 'PLAYABLE_LINE_IMPLEMENTATION', 'POLISH', 'TESTING', 'PLAYABLE_DEMO', 'POST_DEMO');

CREATE TYPE "DemoDependencyEntityType" AS ENUM ('MECHANIC', 'CHARACTER', 'ITEM', 'LOCATION', 'DIALOGUE', 'QUEST', 'PLAYABLE_STEP', 'EMOTIONAL_BEAT', 'BUG', 'BLOCKER');

CREATE TYPE "DemoBugSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

CREATE TYPE "DemoBugStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'FIXING', 'RESOLVED', 'IGNORED', 'DEFERRED');

CREATE TABLE "DemoPlan" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "demoGoal" TEXT,
  "demoScope" TEXT,
  "targetPlatform" TEXT,
  "targetBuildDate" TIMESTAMP(3),
  "currentStage" "DemoStage" NOT NULL DEFAULT 'IDEATION',
  "progressEstimate" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "stageExitCriteria" TEXT,
  "activeProblems" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DemoPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DemoElement" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "demoPlanId" TEXT NOT NULL,
  "kind" "DemoElementKind" NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" "DemoEntityStatus" NOT NULL DEFAULT 'IDEA',
  "priority" "DemoPriority" NOT NULL DEFAULT 'IMPORTANT',
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DemoElement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DemoPlayableStep" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "demoPlanId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "playerAction" TEXT,
  "playerObjective" TEXT,
  "expectedResult" TEXT,
  "relatedLocationId" TEXT,
  "relatedCharacterIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "relatedItemIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "relatedMechanicIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "relatedQuestIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "relatedDialogueIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status" "DemoEntityStatus" NOT NULL DEFAULT 'IDEA',
  "priority" "DemoPriority" NOT NULL DEFAULT 'ESSENTIAL',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DemoPlayableStep_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DemoEmotionalBeat" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "demoPlanId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "playableStepId" TEXT,
  "momentName" TEXT NOT NULL,
  "desiredEmotion" TEXT NOT NULL,
  "intensity" INTEGER NOT NULL DEFAULT 50,
  "triggerElements" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DemoEmotionalBeat_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DemoDependency" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "demoPlanId" TEXT NOT NULL,
  "sourceType" "DemoDependencyEntityType" NOT NULL,
  "sourceId" TEXT NOT NULL,
  "targetType" "DemoDependencyEntityType" NOT NULL,
  "targetId" TEXT NOT NULL,
  "dependencyType" TEXT NOT NULL,
  "description" TEXT,
  "isCritical" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DemoDependency_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DemoBug" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "demoPlanId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "severity" "DemoBugSeverity" NOT NULL DEFAULT 'MEDIUM',
  "status" "DemoBugStatus" NOT NULL DEFAULT 'OPEN',
  "affectedEntityType" "DemoDependencyEntityType",
  "affectedEntityId" TEXT,
  "affectedPlayableStepId" TEXT,
  "reproductionSteps" TEXT,
  "expectedResult" TEXT,
  "actualResult" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DemoBug_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DemoBlocker" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "demoPlanId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "blockedEntityType" "DemoDependencyEntityType",
  "blockedEntityId" TEXT,
  "cause" TEXT,
  "possibleSolution" TEXT,
  "status" "DemoBugStatus" NOT NULL DEFAULT 'OPEN',
  "priority" "DemoPriority" NOT NULL DEFAULT 'IMPORTANT',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DemoBlocker_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DemoPlan_workspaceId_projectId_key" ON "DemoPlan"("workspaceId", "projectId");
CREATE INDEX "DemoPlan_workspaceId_updatedAt_idx" ON "DemoPlan"("workspaceId", "updatedAt" DESC);
CREATE INDEX "DemoPlan_projectId_idx" ON "DemoPlan"("projectId");

CREATE INDEX "DemoElement_workspaceId_projectId_kind_idx" ON "DemoElement"("workspaceId", "projectId", "kind");
CREATE INDEX "DemoElement_demoPlanId_kind_priority_idx" ON "DemoElement"("demoPlanId", "kind", "priority");

CREATE INDEX "DemoPlayableStep_workspaceId_projectId_sortOrder_idx" ON "DemoPlayableStep"("workspaceId", "projectId", "sortOrder");
CREATE INDEX "DemoPlayableStep_demoPlanId_priority_status_idx" ON "DemoPlayableStep"("demoPlanId", "priority", "status");

CREATE INDEX "DemoEmotionalBeat_workspaceId_projectId_sortOrder_idx" ON "DemoEmotionalBeat"("workspaceId", "projectId", "sortOrder");
CREATE INDEX "DemoEmotionalBeat_demoPlanId_idx" ON "DemoEmotionalBeat"("demoPlanId");

CREATE INDEX "DemoDependency_workspaceId_projectId_idx" ON "DemoDependency"("workspaceId", "projectId");
CREATE INDEX "DemoDependency_demoPlanId_sourceType_sourceId_idx" ON "DemoDependency"("demoPlanId", "sourceType", "sourceId");
CREATE INDEX "DemoDependency_demoPlanId_targetType_targetId_idx" ON "DemoDependency"("demoPlanId", "targetType", "targetId");

CREATE INDEX "DemoBug_workspaceId_projectId_severity_status_idx" ON "DemoBug"("workspaceId", "projectId", "severity", "status");
CREATE INDEX "DemoBug_demoPlanId_affectedPlayableStepId_idx" ON "DemoBug"("demoPlanId", "affectedPlayableStepId");

CREATE INDEX "DemoBlocker_workspaceId_projectId_status_idx" ON "DemoBlocker"("workspaceId", "projectId", "status");
CREATE INDEX "DemoBlocker_demoPlanId_blockedEntityType_blockedEntityId_idx" ON "DemoBlocker"("demoPlanId", "blockedEntityType", "blockedEntityId");

ALTER TABLE "DemoPlan" ADD CONSTRAINT "DemoPlan_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DemoPlan" ADD CONSTRAINT "DemoPlan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DemoElement" ADD CONSTRAINT "DemoElement_demoPlanId_fkey" FOREIGN KEY ("demoPlanId") REFERENCES "DemoPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DemoPlayableStep" ADD CONSTRAINT "DemoPlayableStep_demoPlanId_fkey" FOREIGN KEY ("demoPlanId") REFERENCES "DemoPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DemoEmotionalBeat" ADD CONSTRAINT "DemoEmotionalBeat_demoPlanId_fkey" FOREIGN KEY ("demoPlanId") REFERENCES "DemoPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DemoDependency" ADD CONSTRAINT "DemoDependency_demoPlanId_fkey" FOREIGN KEY ("demoPlanId") REFERENCES "DemoPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DemoBug" ADD CONSTRAINT "DemoBug_demoPlanId_fkey" FOREIGN KEY ("demoPlanId") REFERENCES "DemoPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DemoBlocker" ADD CONSTRAINT "DemoBlocker_demoPlanId_fkey" FOREIGN KEY ("demoPlanId") REFERENCES "DemoPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
