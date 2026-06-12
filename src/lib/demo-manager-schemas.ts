import {
  DemoBugSeverity,
  DemoBugStatus,
  DemoDependencyEntityType,
  DemoElementKind,
  DemoEntityStatus,
  DemoPriority,
  DemoStage
} from "@prisma/client";
import { z } from "zod";

export const demoPlanSchema = z.object({
  demoGoal: z.string().nullable().optional(),
  demoScope: z.string().nullable().optional(),
  targetPlatform: z.string().nullable().optional(),
  targetBuildDate: z.coerce.date().nullable().optional(),
  currentStage: z.nativeEnum(DemoStage).optional(),
  progressEstimate: z.coerce.number().int().min(0).max(100).optional(),
  notes: z.string().nullable().optional(),
  stageExitCriteria: z.string().nullable().optional(),
  activeProblems: z.string().nullable().optional()
});

export const demoElementSchema = z.object({
  kind: z.nativeEnum(DemoElementKind),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  status: z.nativeEnum(DemoEntityStatus).optional(),
  priority: z.nativeEnum(DemoPriority).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().nullable().optional()
});

export const demoElementUpdateSchema = demoElementSchema.partial();

export const playableStepSchema = z.object({
  sortOrder: z.coerce.number().int().min(0).optional(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  playerAction: z.string().nullable().optional(),
  playerObjective: z.string().nullable().optional(),
  expectedResult: z.string().nullable().optional(),
  relatedLocationId: z.string().nullable().optional(),
  relatedCharacterIds: z.array(z.string()).optional(),
  relatedItemIds: z.array(z.string()).optional(),
  relatedMechanicIds: z.array(z.string()).optional(),
  relatedQuestIds: z.array(z.string()).optional(),
  relatedDialogueIds: z.array(z.string()).optional(),
  status: z.nativeEnum(DemoEntityStatus).optional(),
  priority: z.nativeEnum(DemoPriority).optional(),
  notes: z.string().nullable().optional()
});

export const playableStepUpdateSchema = playableStepSchema.partial();

export const emotionalBeatSchema = z.object({
  sortOrder: z.coerce.number().int().min(0).optional(),
  playableStepId: z.string().nullable().optional(),
  momentName: z.string().min(1),
  desiredEmotion: z.string().min(1),
  intensity: z.coerce.number().int().min(0).max(100).optional(),
  triggerElements: z.array(z.string()).optional(),
  notes: z.string().nullable().optional()
});

export const emotionalBeatUpdateSchema = emotionalBeatSchema.partial();

export const dependencySchema = z.object({
  sourceType: z.nativeEnum(DemoDependencyEntityType),
  sourceId: z.string().min(1),
  targetType: z.nativeEnum(DemoDependencyEntityType),
  targetId: z.string().min(1),
  dependencyType: z.string().min(1),
  description: z.string().nullable().optional(),
  isCritical: z.boolean().optional()
});

export const dependencyUpdateSchema = dependencySchema.partial();

export const bugSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  severity: z.nativeEnum(DemoBugSeverity).optional(),
  status: z.nativeEnum(DemoBugStatus).optional(),
  affectedEntityType: z.nativeEnum(DemoDependencyEntityType).nullable().optional(),
  affectedEntityId: z.string().nullable().optional(),
  affectedPlayableStepId: z.string().nullable().optional(),
  reproductionSteps: z.string().nullable().optional(),
  expectedResult: z.string().nullable().optional(),
  actualResult: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  resolvedAt: z.coerce.date().nullable().optional()
});

export const bugUpdateSchema = bugSchema.partial();

export const blockerSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  blockedEntityType: z.nativeEnum(DemoDependencyEntityType).nullable().optional(),
  blockedEntityId: z.string().nullable().optional(),
  cause: z.string().nullable().optional(),
  possibleSolution: z.string().nullable().optional(),
  status: z.nativeEnum(DemoBugStatus).optional(),
  priority: z.nativeEnum(DemoPriority).optional(),
  notes: z.string().nullable().optional(),
  resolvedAt: z.coerce.date().nullable().optional()
});

export const blockerUpdateSchema = blockerSchema.partial();

export const reorderSchema = z.object({
  orderedIds: z.array(z.string()).min(1)
});
