import {
  DemoBugSeverity,
  DemoBugStatus,
  DemoDependencyEntityType,
  DemoElementKind,
  DemoEntityStatus,
  DemoPriority,
  DemoStage,
  type Prisma
} from "@prisma/client";

import { db } from "@/lib/db";

export const demoEntityStatuses = Object.values(DemoEntityStatus);
export const demoPriorities = Object.values(DemoPriority);
export const demoStages = Object.values(DemoStage);
export const demoElementKinds = Object.values(DemoElementKind);
export const demoDependencyTypes = Object.values(DemoDependencyEntityType);
export const demoBugSeverities = Object.values(DemoBugSeverity);
export const demoBugStatuses = Object.values(DemoBugStatus);

const readyStatuses = new Set<DemoEntityStatus>([DemoEntityStatus.IMPLEMENTED, DemoEntityStatus.TESTING]);
const weakDependencyStatuses = new Set<DemoEntityStatus>([
  DemoEntityStatus.IDEA,
  DemoEntityStatus.PLANNED,
  DemoEntityStatus.CUT,
  DemoEntityStatus.DEFERRED
]);
const activeBugStatuses = new Set<DemoBugStatus>([DemoBugStatus.OPEN, DemoBugStatus.IN_REVIEW, DemoBugStatus.FIXING]);

export type DemoManagerData = Awaited<ReturnType<typeof getDemoManagerData>>;

export async function getOrCreateDemoPlan(workspaceId: string, projectId: string) {
  const project = await db.project.findFirst({
    where: {
      id: projectId,
      workspaceId
    },
    select: {
      id: true
    }
  });

  if (!project) {
    return null;
  }

  return db.demoPlan.upsert({
    where: {
      workspaceId_projectId: {
        workspaceId,
        projectId
      }
    },
    create: {
      workspaceId,
      projectId
    },
    update: {}
  });
}

export async function getDemoManagerData(workspaceId: string, projectId: string) {
  const plan = await getOrCreateDemoPlan(workspaceId, projectId);

  if (!plan) {
    return null;
  }

  const [elements, playableSteps, emotionalBeats, dependencies, bugs, blockers] = await Promise.all([
    db.demoElement.findMany({
      where: { demoPlanId: plan.id, workspaceId, projectId },
      orderBy: [{ kind: "asc" }, { priority: "asc" }, { createdAt: "asc" }]
    }),
    db.demoPlayableStep.findMany({
      where: { demoPlanId: plan.id, workspaceId, projectId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
    }),
    db.demoEmotionalBeat.findMany({
      where: { demoPlanId: plan.id, workspaceId, projectId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
    }),
    db.demoDependency.findMany({
      where: { demoPlanId: plan.id, workspaceId, projectId },
      orderBy: { createdAt: "desc" }
    }),
    db.demoBug.findMany({
      where: { demoPlanId: plan.id, workspaceId, projectId },
      orderBy: [{ severity: "asc" }, { createdAt: "desc" }]
    }),
    db.demoBlocker.findMany({
      where: { demoPlanId: plan.id, workspaceId, projectId },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }]
    })
  ]);

  const diagnostic = getDemoDiagnostic({
    elements,
    playableSteps,
    dependencies,
    bugs,
    blockers
  });

  return {
    plan,
    elements,
    playableSteps,
    emotionalBeats,
    dependencies,
    bugs,
    blockers,
    diagnostic
  };
}

export async function updateDemoPlan(
  workspaceId: string,
  projectId: string,
  data: Prisma.DemoPlanUpdateInput
) {
  const plan = await getOrCreateDemoPlan(workspaceId, projectId);

  if (!plan) {
    return null;
  }

  return db.demoPlan.update({
    where: { id: plan.id },
    data
  });
}

export async function createDemoElement(
  workspaceId: string,
  projectId: string,
  data: {
    kind: DemoElementKind;
    name: string;
    description?: string | null;
    status?: DemoEntityStatus;
    priority?: DemoPriority;
    tags?: string[];
    notes?: string | null;
  }
) {
  const plan = await getOrCreateDemoPlan(workspaceId, projectId);

  if (!plan) {
    return null;
  }

  return db.demoElement.create({
    data: {
      workspaceId,
      projectId,
      demoPlanId: plan.id,
      ...data
    }
  });
}

export async function updateDemoElement(
  workspaceId: string,
  projectId: string,
  elementId: string,
  data: Prisma.DemoElementUpdateInput
) {
  const element = await db.demoElement.findFirst({
    where: {
      id: elementId,
      workspaceId,
      projectId
    }
  });

  if (!element) {
    return null;
  }

  return db.demoElement.update({
    where: { id: elementId },
    data
  });
}

export async function deleteDemoElement(workspaceId: string, projectId: string, elementId: string) {
  const element = await db.demoElement.findFirst({
    where: {
      id: elementId,
      workspaceId,
      projectId
    }
  });

  if (!element) {
    return null;
  }

  await db.demoElement.delete({
    where: { id: elementId }
  });

  return { id: elementId };
}

export async function createPlayableStep(
  workspaceId: string,
  projectId: string,
  data: Prisma.DemoPlayableStepUncheckedCreateInput
) {
  const plan = await getOrCreateDemoPlan(workspaceId, projectId);

  if (!plan) {
    return null;
  }

  const count = await db.demoPlayableStep.count({
    where: {
      demoPlanId: plan.id
    }
  });

  return db.demoPlayableStep.create({
    data: {
      ...data,
      workspaceId,
      projectId,
      demoPlanId: plan.id,
      sortOrder: data.sortOrder ?? count
    }
  });
}

export async function updatePlayableStep(
  workspaceId: string,
  projectId: string,
  stepId: string,
  data: Prisma.DemoPlayableStepUpdateInput
) {
  const step = await db.demoPlayableStep.findFirst({
    where: {
      id: stepId,
      workspaceId,
      projectId
    }
  });

  if (!step) {
    return null;
  }

  return db.demoPlayableStep.update({
    where: { id: stepId },
    data
  });
}

export async function deletePlayableStep(workspaceId: string, projectId: string, stepId: string) {
  const step = await db.demoPlayableStep.findFirst({
    where: {
      id: stepId,
      workspaceId,
      projectId
    }
  });

  if (!step) {
    return null;
  }

  await db.demoPlayableStep.delete({
    where: { id: stepId }
  });

  return { id: stepId };
}

export async function reorderPlayableSteps(workspaceId: string, projectId: string, orderedIds: string[]) {
  const steps = await db.demoPlayableStep.findMany({
    where: {
      id: { in: orderedIds },
      workspaceId,
      projectId
    },
    select: {
      id: true
    }
  });

  if (steps.length !== orderedIds.length) {
    return null;
  }

  await db.$transaction(
    orderedIds.map((id, index) =>
      db.demoPlayableStep.update({
        where: { id },
        data: { sortOrder: index }
      })
    )
  );

  return { orderedIds };
}

export async function createEmotionalBeat(
  workspaceId: string,
  projectId: string,
  data: Prisma.DemoEmotionalBeatUncheckedCreateInput
) {
  const plan = await getOrCreateDemoPlan(workspaceId, projectId);

  if (!plan) {
    return null;
  }

  const count = await db.demoEmotionalBeat.count({
    where: {
      demoPlanId: plan.id
    }
  });

  return db.demoEmotionalBeat.create({
    data: {
      ...data,
      workspaceId,
      projectId,
      demoPlanId: plan.id,
      sortOrder: data.sortOrder ?? count
    }
  });
}

export async function updateEmotionalBeat(
  workspaceId: string,
  projectId: string,
  beatId: string,
  data: Prisma.DemoEmotionalBeatUpdateInput
) {
  const beat = await db.demoEmotionalBeat.findFirst({
    where: {
      id: beatId,
      workspaceId,
      projectId
    }
  });

  if (!beat) {
    return null;
  }

  return db.demoEmotionalBeat.update({
    where: { id: beatId },
    data
  });
}

export async function deleteEmotionalBeat(workspaceId: string, projectId: string, beatId: string) {
  const beat = await db.demoEmotionalBeat.findFirst({
    where: {
      id: beatId,
      workspaceId,
      projectId
    }
  });

  if (!beat) {
    return null;
  }

  await db.demoEmotionalBeat.delete({
    where: { id: beatId }
  });

  return { id: beatId };
}

export async function reorderEmotionalBeats(workspaceId: string, projectId: string, orderedIds: string[]) {
  const beats = await db.demoEmotionalBeat.findMany({
    where: {
      id: { in: orderedIds },
      workspaceId,
      projectId
    },
    select: {
      id: true
    }
  });

  if (beats.length !== orderedIds.length) {
    return null;
  }

  await db.$transaction(
    orderedIds.map((id, index) =>
      db.demoEmotionalBeat.update({
        where: { id },
        data: { sortOrder: index }
      })
    )
  );

  return { orderedIds };
}

export async function createDependency(
  workspaceId: string,
  projectId: string,
  data: Prisma.DemoDependencyUncheckedCreateInput
) {
  const plan = await getOrCreateDemoPlan(workspaceId, projectId);

  if (!plan) {
    return null;
  }

  return db.demoDependency.create({
    data: {
      ...data,
      workspaceId,
      projectId,
      demoPlanId: plan.id
    }
  });
}

export async function updateDependency(
  workspaceId: string,
  projectId: string,
  dependencyId: string,
  data: Prisma.DemoDependencyUpdateInput
) {
  const dependency = await db.demoDependency.findFirst({
    where: {
      id: dependencyId,
      workspaceId,
      projectId
    }
  });

  if (!dependency) {
    return null;
  }

  return db.demoDependency.update({
    where: { id: dependencyId },
    data
  });
}

export async function deleteDependency(workspaceId: string, projectId: string, dependencyId: string) {
  const dependency = await db.demoDependency.findFirst({
    where: {
      id: dependencyId,
      workspaceId,
      projectId
    }
  });

  if (!dependency) {
    return null;
  }

  await db.demoDependency.delete({
    where: { id: dependencyId }
  });

  return { id: dependencyId };
}

export async function createBug(
  workspaceId: string,
  projectId: string,
  data: Prisma.DemoBugUncheckedCreateInput
) {
  const plan = await getOrCreateDemoPlan(workspaceId, projectId);

  if (!plan) {
    return null;
  }

  return db.demoBug.create({
    data: {
      ...data,
      workspaceId,
      projectId,
      demoPlanId: plan.id
    }
  });
}

export async function updateBug(
  workspaceId: string,
  projectId: string,
  bugId: string,
  data: Prisma.DemoBugUpdateInput
) {
  const bug = await db.demoBug.findFirst({
    where: {
      id: bugId,
      workspaceId,
      projectId
    }
  });

  if (!bug) {
    return null;
  }

  return db.demoBug.update({
    where: { id: bugId },
    data
  });
}

export async function deleteBug(workspaceId: string, projectId: string, bugId: string) {
  const bug = await db.demoBug.findFirst({
    where: {
      id: bugId,
      workspaceId,
      projectId
    }
  });

  if (!bug) {
    return null;
  }

  await db.demoBug.delete({
    where: { id: bugId }
  });

  return { id: bugId };
}

export async function createBlocker(
  workspaceId: string,
  projectId: string,
  data: Prisma.DemoBlockerUncheckedCreateInput
) {
  const plan = await getOrCreateDemoPlan(workspaceId, projectId);

  if (!plan) {
    return null;
  }

  return db.demoBlocker.create({
    data: {
      ...data,
      workspaceId,
      projectId,
      demoPlanId: plan.id
    }
  });
}

export async function updateBlocker(
  workspaceId: string,
  projectId: string,
  blockerId: string,
  data: Prisma.DemoBlockerUpdateInput
) {
  const blocker = await db.demoBlocker.findFirst({
    where: {
      id: blockerId,
      workspaceId,
      projectId
    }
  });

  if (!blocker) {
    return null;
  }

  return db.demoBlocker.update({
    where: { id: blockerId },
    data
  });
}

export async function deleteBlocker(workspaceId: string, projectId: string, blockerId: string) {
  const blocker = await db.demoBlocker.findFirst({
    where: {
      id: blockerId,
      workspaceId,
      projectId
    }
  });

  if (!blocker) {
    return null;
  }

  await db.demoBlocker.delete({
    where: { id: blockerId }
  });

  return { id: blockerId };
}

export async function exportDemoManager(workspaceId: string, projectId: string) {
  const data = await getDemoManagerData(workspaceId, projectId);

  if (!data) {
    return null;
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    plan: data.plan,
    elements: data.elements,
    playableSteps: data.playableSteps,
    emotionalBeats: data.emotionalBeats,
    dependencies: data.dependencies,
    bugs: data.bugs,
    blockers: data.blockers
  };
}

export async function importDemoManager(workspaceId: string, projectId: string, payload: unknown) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid Demo Manager JSON.");
  }

  const source = payload as Record<string, unknown>;
  const plan = await getOrCreateDemoPlan(workspaceId, projectId);

  if (!plan) {
    return null;
  }

    let resolvedValue0: any;
  if (Array.isArray(source.elements)) {
    resolvedValue0 = source.elements;
  } else {
    resolvedValue0 = [];
  }
const elements = resolvedValue0;
    let resolvedValue1: any;
  if (Array.isArray(source.playableSteps)) {
    resolvedValue1 = source.playableSteps;
  } else {
    resolvedValue1 = [];
  }
const playableSteps = resolvedValue1;
    let resolvedValue2: any;
  if (Array.isArray(source.emotionalBeats)) {
    resolvedValue2 = source.emotionalBeats;
  } else {
    resolvedValue2 = [];
  }
const emotionalBeats = resolvedValue2;
    let resolvedValue3: any;
  if (Array.isArray(source.dependencies)) {
    resolvedValue3 = source.dependencies;
  } else {
    resolvedValue3 = [];
  }
const dependencies = resolvedValue3;
    let resolvedValue4: any;
  if (Array.isArray(source.bugs)) {
    resolvedValue4 = source.bugs;
  } else {
    resolvedValue4 = [];
  }
const bugs = resolvedValue4;
    let resolvedValue5: any;
  if (Array.isArray(source.blockers)) {
    resolvedValue5 = source.blockers;
  } else {
    resolvedValue5 = [];
  }
const blockers = resolvedValue5;
    let resolvedValue6: any;
  if (source.plan && typeof source.plan === "object") {
    resolvedValue6 = (source.plan as Record<string, unknown>);
  } else {
    resolvedValue6 = {};
  }
const planInput = resolvedValue6;
  const idMap = new Map<string, string>();

  await db.$transaction(async (tx) => {
    await tx.demoDependency.deleteMany({ where: { demoPlanId: plan.id } });
    await tx.demoBug.deleteMany({ where: { demoPlanId: plan.id } });
    await tx.demoBlocker.deleteMany({ where: { demoPlanId: plan.id } });
    await tx.demoEmotionalBeat.deleteMany({ where: { demoPlanId: plan.id } });
    await tx.demoPlayableStep.deleteMany({ where: { demoPlanId: plan.id } });
    await tx.demoElement.deleteMany({ where: { demoPlanId: plan.id } });

    await tx.demoPlan.update({
      where: { id: plan.id },
      data: {
        demoGoal: stringOrNull(planInput.demoGoal),
        demoScope: stringOrNull(planInput.demoScope),
        targetPlatform: stringOrNull(planInput.targetPlatform),
        targetBuildDate: dateOrNull(planInput.targetBuildDate),
        currentStage: enumOrDefault(planInput.currentStage, demoStages, DemoStage.IDEATION),
        progressEstimate: numberInRange(planInput.progressEstimate, 0, 100, 0),
        notes: stringOrNull(planInput.notes),
        stageExitCriteria: stringOrNull(planInput.stageExitCriteria),
        activeProblems: stringOrNull(planInput.activeProblems)
      }
    });

    for (const raw of elements) {
      const item = raw as Record<string, unknown>;
      const created = await tx.demoElement.create({
        data: {
          workspaceId,
          projectId,
          demoPlanId: plan.id,
          kind: enumOrDefault(item.kind, demoElementKinds, DemoElementKind.ITEM),
          name: requiredString(item.name, "Untitled"),
          description: stringOrNull(item.description),
          status: enumOrDefault(item.status, demoEntityStatuses, DemoEntityStatus.IDEA),
          priority: enumOrDefault(item.priority, demoPriorities, DemoPriority.IMPORTANT),
          tags: stringArray(item.tags),
          notes: stringOrNull(item.notes)
        }
      });
      if (typeof item.id === "string") {
        idMap.set(item.id, created.id);
      }
    }

    for (const raw of playableSteps) {
      const item = raw as Record<string, unknown>;
      const created = await tx.demoPlayableStep.create({
        data: {
          workspaceId,
          projectId,
          demoPlanId: plan.id,
          sortOrder: numberInRange(item.sortOrder ?? item.order, 0, 10000, 0),
          title: requiredString(item.title, "Untitled step"),
          description: stringOrNull(item.description),
          playerAction: stringOrNull(item.playerAction),
          playerObjective: stringOrNull(item.playerObjective),
          expectedResult: stringOrNull(item.expectedResult),
          relatedLocationId: mappedId(item.relatedLocationId, idMap),
          relatedCharacterIds: mappedIdArray(item.relatedCharacterIds, idMap),
          relatedItemIds: mappedIdArray(item.relatedItemIds, idMap),
          relatedMechanicIds: mappedIdArray(item.relatedMechanicIds, idMap),
          relatedQuestIds: mappedIdArray(item.relatedQuestIds, idMap),
          relatedDialogueIds: mappedIdArray(item.relatedDialogueIds, idMap),
          status: enumOrDefault(item.status, demoEntityStatuses, DemoEntityStatus.IDEA),
          priority: enumOrDefault(item.priority, demoPriorities, DemoPriority.ESSENTIAL),
          notes: stringOrNull(item.notes)
        }
      });
      if (typeof item.id === "string") {
        idMap.set(item.id, created.id);
      }
    }

    for (const raw of emotionalBeats) {
      const item = raw as Record<string, unknown>;
      const created = await tx.demoEmotionalBeat.create({
        data: {
          workspaceId,
          projectId,
          demoPlanId: plan.id,
          sortOrder: numberInRange(item.sortOrder ?? item.order, 0, 10000, 0),
          playableStepId: mappedId(item.playableStepId, idMap),
          momentName: requiredString(item.momentName, "Emotional beat"),
          desiredEmotion: requiredString(item.desiredEmotion, "Curiosidade"),
          intensity: numberInRange(item.intensity, 0, 100, 50),
          triggerElements: stringArray(item.triggerElements),
          notes: stringOrNull(item.notes)
        }
      });
      if (typeof item.id === "string") {
        idMap.set(item.id, created.id);
      }
    }

    for (const raw of bugs) {
      const item = raw as Record<string, unknown>;
      const created = await tx.demoBug.create({
        data: {
          workspaceId,
          projectId,
          demoPlanId: plan.id,
          title: requiredString(item.title, "Bug"),
          description: stringOrNull(item.description),
          severity: enumOrDefault(item.severity, demoBugSeverities, DemoBugSeverity.MEDIUM),
          status: enumOrDefault(item.status, demoBugStatuses, DemoBugStatus.OPEN),
          affectedEntityType: enumOrNull(item.affectedEntityType, demoDependencyTypes),
          affectedEntityId: mappedId(item.affectedEntityId, idMap),
          affectedPlayableStepId: mappedId(item.affectedPlayableStepId, idMap),
          reproductionSteps: stringOrNull(item.reproductionSteps),
          expectedResult: stringOrNull(item.expectedResult),
          actualResult: stringOrNull(item.actualResult),
          notes: stringOrNull(item.notes),
          resolvedAt: dateOrNull(item.resolvedAt)
        }
      });
      if (typeof item.id === "string") {
        idMap.set(item.id, created.id);
      }
    }

    for (const raw of blockers) {
      const item = raw as Record<string, unknown>;
      const created = await tx.demoBlocker.create({
        data: {
          workspaceId,
          projectId,
          demoPlanId: plan.id,
          title: requiredString(item.title, "Blocker"),
          description: stringOrNull(item.description),
          blockedEntityType: enumOrNull(item.blockedEntityType, demoDependencyTypes),
          blockedEntityId: mappedId(item.blockedEntityId, idMap),
          cause: stringOrNull(item.cause),
          possibleSolution: stringOrNull(item.possibleSolution),
          status: enumOrDefault(item.status, demoBugStatuses, DemoBugStatus.OPEN),
          priority: enumOrDefault(item.priority, demoPriorities, DemoPriority.IMPORTANT),
          notes: stringOrNull(item.notes),
          resolvedAt: dateOrNull(item.resolvedAt)
        }
      });
      if (typeof item.id === "string") {
        idMap.set(item.id, created.id);
      }
    }

    for (const raw of dependencies) {
      const item = raw as Record<string, unknown>;
      const sourceId = mappedId(item.sourceId, idMap);
      const targetId = mappedId(item.targetId, idMap);

      if (!sourceId || !targetId) {
        continue;
      }

      await tx.demoDependency.create({
        data: {
          workspaceId,
          projectId,
          demoPlanId: plan.id,
          sourceType: enumOrDefault(item.sourceType, demoDependencyTypes, DemoDependencyEntityType.ITEM),
          sourceId,
          targetType: enumOrDefault(item.targetType, demoDependencyTypes, DemoDependencyEntityType.ITEM),
          targetId,
          dependencyType: requiredString(item.dependencyType, "Requires"),
          description: stringOrNull(item.description),
          isCritical: Boolean(item.isCritical)
        }
      });
    }
  });

  return getDemoManagerData(workspaceId, projectId);
}

function getDemoDiagnostic({
  elements,
  playableSteps,
  dependencies,
  bugs,
  blockers
}: {
  elements: Array<{ id: string; kind: DemoElementKind; status: DemoEntityStatus; priority: DemoPriority }>;
  playableSteps: Array<{
    id: string;
    status: DemoEntityStatus;
    priority: DemoPriority;
    relatedItemIds: string[];
    relatedMechanicIds: string[];
    relatedCharacterIds: string[];
    relatedQuestIds: string[];
    relatedDialogueIds: string[];
    relatedLocationId: string | null;
  }>;
  dependencies: Array<{
    sourceType: DemoDependencyEntityType;
    sourceId: string;
    targetType: DemoDependencyEntityType;
    targetId: string;
    isCritical: boolean;
  }>;
  bugs: Array<{
    severity: DemoBugSeverity;
    status: DemoBugStatus;
    affectedPlayableStepId: string | null;
    affectedEntityId: string | null;
  }>;
  blockers: Array<{
    status: DemoBugStatus;
    blockedEntityId: string | null;
  }>;
}) {
  const elementById = new Map(elements.map((element) => [element.id, element]));
  const stepById = new Map(playableSteps.map((step) => [step.id, step]));
  const essentialSteps = playableSteps.filter((step) => step.priority === DemoPriority.ESSENTIAL);
  const essentialStepIds = new Set(essentialSteps.map((step) => step.id));
  const hasPlayableLine = playableSteps.length >= 2;
  const essentialStepsReady = essentialSteps.every((step) => readyStatuses.has(step.status));
  const criticalDependencies = dependencies.filter(
    (dependency) =>
      dependency.isCritical &&
      dependency.sourceType === DemoDependencyEntityType.PLAYABLE_STEP &&
      essentialStepIds.has(dependency.sourceId)
  );
  const unresolvedCriticalDependencies = criticalDependencies.filter((dependency) => {
    if (dependency.targetType === DemoDependencyEntityType.PLAYABLE_STEP) {
      const step = stepById.get(dependency.targetId);
      return !step || !readyStatuses.has(step.status);
    }

    const element = elementById.get(dependency.targetId);
    return !element || !readyStatuses.has(element.status);
  });
  const criticalBugs = bugs.filter(
    (bug) =>
      bug.severity === DemoBugSeverity.CRITICAL &&
      activeBugStatuses.has(bug.status) &&
      (Boolean(bug.affectedPlayableStepId && essentialStepIds.has(bug.affectedPlayableStepId)) ||
        Boolean(bug.affectedEntityId && isEssentialRelatedEntity(bug.affectedEntityId, essentialSteps)))
  );
  const activeBlockers = blockers.filter(
    (blocker) =>
      activeBugStatuses.has(blocker.status) &&
      Boolean(blocker.blockedEntityId && (essentialStepIds.has(blocker.blockedEntityId) || isEssentialRelatedEntity(blocker.blockedEntityId, essentialSteps)))
  );
  const blockedStepIds = new Set<string>();

  for (const dependency of unresolvedCriticalDependencies) {
    blockedStepIds.add(dependency.sourceId);
  }

  for (const bug of criticalBugs) {
    if (bug.affectedPlayableStepId) {
      blockedStepIds.add(bug.affectedPlayableStepId);
    }
  }

  const weakDependencyAlerts = dependencies.filter((dependency) => {
    if (!dependency.isCritical) {
      return false;
    }

    const sourceIsEssential =
      (dependency.sourceType === DemoDependencyEntityType.PLAYABLE_STEP && essentialStepIds.has(dependency.sourceId)) ||
      (elementById.get(dependency.sourceId)?.priority === DemoPriority.ESSENTIAL);

    if (!sourceIsEssential) {
      return false;
    }

    const targetElement = elementById.get(dependency.targetId);
    return Boolean(targetElement && weakDependencyStatuses.has(targetElement.status));
  });

  const playable =
    hasPlayableLine &&
    essentialSteps.length > 0 &&
    essentialStepsReady &&
    unresolvedCriticalDependencies.length === 0 &&
    criticalBugs.length === 0 &&
    activeBlockers.length === 0;

  return {
    playable,
    hasPlayableLine,
    essentialStepsReady,
    unresolvedCriticalDependencies: unresolvedCriticalDependencies.length,
    criticalBugs: criticalBugs.length,
    activeBlockers: activeBlockers.length,
    criticalDependencies: criticalDependencies.length,
    weakDependencyAlerts: weakDependencyAlerts.length,
    blockedStepIds: Array.from(blockedStepIds),
    nextRecommendedStep: getNextRecommendedStep({
      hasPlayableLine,
      essentialSteps,
      essentialStepsReady,
      unresolvedCriticalDependencies,
      criticalBugs,
      activeBlockers,
      playable
    })
  };
}

function isEssentialRelatedEntity(entityId: string, essentialSteps: Array<{
  relatedItemIds: string[];
  relatedMechanicIds: string[];
  relatedCharacterIds: string[];
  relatedQuestIds: string[];
  relatedDialogueIds: string[];
  relatedLocationId: string | null;
}>) {
  return essentialSteps.some(
    (step) =>
      step.relatedLocationId === entityId ||
      step.relatedItemIds.includes(entityId) ||
      step.relatedMechanicIds.includes(entityId) ||
      step.relatedCharacterIds.includes(entityId) ||
      step.relatedQuestIds.includes(entityId) ||
      step.relatedDialogueIds.includes(entityId)
  );
}

function getNextRecommendedStep({
  hasPlayableLine,
  essentialSteps,
  essentialStepsReady,
  unresolvedCriticalDependencies,
  criticalBugs,
  activeBlockers,
  playable
}: {
  hasPlayableLine: boolean;
  essentialSteps: Array<unknown>;
  essentialStepsReady: boolean;
  unresolvedCriticalDependencies: Array<unknown>;
  criticalBugs: Array<unknown>;
  activeBlockers: Array<unknown>;
  playable: boolean;
}) {
  if (playable) {
    return "Executar playtest completo e registrar feedback da demo.";
  }

  if (!hasPlayableLine) {
    return "Criar começo e fim claros para a linha jogável.";
  }

  if (essentialSteps.length === 0) {
    return "Marcar os passos essenciais que tornam a demo jogável.";
  }

  if (!essentialStepsReady) {
    return "Levar os passos essenciais para Implementado ou Testando.";
  }

  if (unresolvedCriticalDependencies.length > 0) {
    return "Resolver dependências críticas dos passos essenciais.";
  }

  if (criticalBugs.length > 0) {
    return "Corrigir bugs críticos que afetam a linha jogável.";
  }

  if (activeBlockers.length > 0) {
    return "Remover bloqueios ativos da linha jogável.";
  }

  return "Revisar escopo e validar a demo com alguém fora do time.";
}

function stringOrNull(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
    let resolvedValue7: any;
  if (trimmed) {
    resolvedValue7 = trimmed;
  } else {
    resolvedValue7 = null;
  }
return resolvedValue7;
}

function requiredString(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
    let resolvedValue8: any;
  if (trimmed) {
    resolvedValue8 = trimmed;
  } else {
    resolvedValue8 = fallback;
  }
return resolvedValue8;
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string").map((item: any) => item.trim()).filter(Boolean);
}

function numberInRange(value: unknown, min: number, max: number, fallback: number) {
    let resolvedValue9: any;
  if (typeof value === "number") {
    resolvedValue9 = value;
  } else {
    resolvedValue9 = Number(value);
  }
const numberValue = resolvedValue9;

  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(numberValue)));
}

function dateOrNull(value: unknown) {
  if (typeof value !== "string" && !(value instanceof Date)) {
    return null;
  }

  const date = new Date(value);
    let resolvedValue10: any;
  if (Number.isNaN(date.getTime())) {
    resolvedValue10 = null;
  } else {
    resolvedValue10 = date;
  }
return resolvedValue10;
}

function enumOrDefault<T extends string>(value: unknown, values: T[], fallback: T) {
    let resolvedValue11: any;
  if (typeof value === "string" && values.includes(value as T)) {
    resolvedValue11 = (value as T);
  } else {
    resolvedValue11 = fallback;
  }
return resolvedValue11;
}

function enumOrNull<T extends string>(value: unknown, values: T[]) {
    let resolvedValue12: any;
  if (typeof value === "string" && values.includes(value as T)) {
    resolvedValue12 = (value as T);
  } else {
    resolvedValue12 = null;
  }
return resolvedValue12;
}

function mappedId(value: unknown, idMap: Map<string, string>) {
  if (typeof value !== "string") {
    return null;
  }

  return idMap.get(value) ?? value;
}

function mappedIdArray(value: unknown, idMap: Map<string, string>) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string").map((item: any) => idMap.get(item) ?? item);
}
