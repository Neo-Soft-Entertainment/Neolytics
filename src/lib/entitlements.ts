import { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";

import { env } from "@/env";
import { badRequest } from "@/lib/api-response";
import { createAuditEvent } from "@/lib/audit-service";
import { db } from "@/lib/db";
import {
  canPlanUseFeature,
  getEntitlementPolicyForPlan,
  getLimitLabel,
  getPlanLimit,
  hasReachedLimit,
  limitLabels,
  type EntitlementPolicy,
  type FeatureKey,
  type LimitKey,
  type LimitValue
} from "@/lib/subscription-plans";

export type EntitlementContext = {
  userId: string;
  workspaceId: string;
  organizationId?: string | null;
  subscriptionId?: string | null;
  currentPlanId?: string | null;
  currentPriceId?: string | null;
  subscriptionStatus?: string | null;
};

export class EntitlementError extends Error {
  payload:
    | {
        code: "FEATURE_NOT_AVAILABLE";
        featureKey: FeatureKey;
        message: string;
      }
    | {
        code: "LIMIT_REACHED";
        limitKey: LimitKey;
        currentUsage: number;
        limit: LimitValue;
        message: string;
      }
    | {
        code: "SUBSCRIPTION_INACTIVE";
        message: string;
      };

  constructor(payload: EntitlementError["payload"]) {
    super(payload.message);
    this.name = "EntitlementError";
    this.payload = payload;
  }
}

function getCurrentSubscriptionPeriodKey(date = new Date()) {
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}`;
}

function getPlanFromPriceId(priceId?: string | null) {
  if (!priceId) {
    return null;
  }

  if (priceId === env.STRIPE_PRICE_PLUS_MONTHLY) {
    return SubscriptionPlan.PLUS;
  }

  if (priceId === env.STRIPE_PRICE_PRO_MONTHLY) {
    return SubscriptionPlan.PRO;
  }

  return null;
}

function getPlanFromContext(context: EntitlementContext) {
  if (context.currentPlanId && Object.values(SubscriptionPlan).includes(context.currentPlanId as SubscriptionPlan)) {
    return context.currentPlanId as SubscriptionPlan;
  }

  return getPlanFromPriceId(context.currentPriceId);
}

async function resolveEntitlementSource(context: EntitlementContext) {
  const contextPlan = getPlanFromContext(context);

  if (contextPlan) {
    return {
      organizationId: context.organizationId ?? null,
      plan: contextPlan,
      status: context.subscriptionStatus ?? SubscriptionStatus.ACTIVE
    };
  }

  const workspace = await db.workspace.findUnique({
    where: {
      id: context.workspaceId
    },
    select: {
      organizationId: true,
      organization: {
        select: {
          subscriptionPlan: true,
          subscriptionStatus: true,
          stripePriceId: true
        }
      }
    }
  });

  if (!workspace) {
    return {
      organizationId: context.organizationId ?? null,
      plan: SubscriptionPlan.FREE,
      status: SubscriptionStatus.CANCELED
    };
  }

  return {
    organizationId: workspace.organizationId,
    plan: getPlanFromPriceId(workspace.organization.stripePriceId) ?? workspace.organization.subscriptionPlan,
    status: workspace.organization.subscriptionStatus
  };
}

export async function getEntitlementPolicy(context: EntitlementContext): Promise<EntitlementPolicy> {
  const source = await resolveEntitlementSource(context);

  if (source.status !== SubscriptionStatus.ACTIVE) {
    throw new EntitlementError({
      code: "SUBSCRIPTION_INACTIVE",
      message: "Sua assinatura não está ativa."
    });
  }

  return getEntitlementPolicyForPlan(source.plan);
}

export async function canUseFeature(context: EntitlementContext, featureKey: FeatureKey) {
  try {
    const source = await resolveEntitlementSource(context);

    if (source.status !== SubscriptionStatus.ACTIVE) {
      return false;
    }

    return canPlanUseFeature(source.plan, featureKey);
  } catch {
    return false;
  }
}

export async function assertCanUseFeature(context: EntitlementContext, featureKey: FeatureKey) {
  if (await canUseFeature(context, featureKey)) {
    return;
  }

  throw new EntitlementError({
    code: "FEATURE_NOT_AVAILABLE",
    featureKey,
    message: "Seu acesso atual não inclui este recurso."
  });
}

export async function getLimit(context: EntitlementContext, limitKey: LimitKey) {
  const source = await resolveEntitlementSource(context);

  if (source.status !== SubscriptionStatus.ACTIVE) {
    throw new EntitlementError({
      code: "SUBSCRIPTION_INACTIVE",
      message: "Sua assinatura não está ativa."
    });
  }

  return getPlanLimit(source.plan, limitKey);
}

export async function assertWithinLimit(
  context: EntitlementContext,
  limitKey: LimitKey,
  currentUsage: number
) {
  const limit = await getLimit(context, limitKey);

  if (!hasReachedLimit(currentUsage, limit)) {
    return;
  }

  throw new EntitlementError({
    code: "LIMIT_REACHED",
    limitKey,
    currentUsage,
    limit,
    message: "Você atingiu o limite disponível para este recurso."
  });
}

export async function getUsageCount(context: EntitlementContext, limitKey: LimitKey) {
  const source = await resolveEntitlementSource(context);
  const organizationId = source.organizationId ?? context.organizationId;

  if (!organizationId) {
    return 0;
  }

  if (limitKey === "gameBoardProjects") {
    return db.project.count({
      where: {
        organizationId
      }
    });
  }

  if (limitKey === "gdds") {
    return db.projectGdd.count({
      where: {
        project: {
          organizationId
        }
      }
    });
  }

  const periodKey = getCurrentSubscriptionPeriodKey();
    let resolvedValue0: any;
  if (limitKey === "steamXrayPerMonth") {
    resolvedValue0 = "usage.steamXray";
  } else {
        let resolvedValue1: any;
    if (limitKey === "viabilityAnalysesPerMonth") {
      resolvedValue1 = "usage.viabilityAnalysis";
    } else {
      resolvedValue1 = "usage.artAnalysis";
    }
resolvedValue0 = resolvedValue1;
  }
const action =
    resolvedValue0;

  return db.auditEvent.count({
    where: {
      organizationId,
      entityType: "workspace",
      entityId: context.workspaceId,
      action,
      metadata: {
        path: ["periodKey"],
        equals: periodKey
      }
    }
  });
}

export async function assertCurrentUsageWithinLimit(context: EntitlementContext, limitKey: LimitKey) {
  const currentUsage = await getUsageCount(context, limitKey);
  await assertWithinLimit(context, limitKey, currentUsage);
}

export async function recordUsage(context: EntitlementContext, params: {
  featureKey: FeatureKey;
  limitKey: LimitKey;
  metadata?: Record<string, unknown>;
}) {
  const source = await resolveEntitlementSource(context);
  const organizationId = source.organizationId ?? context.organizationId;

  if (!organizationId) {
    return null;
  }

  return createAuditEvent(db, {
    organizationId,
    userId: context.userId,
    entityType: "workspace",
    entityId: context.workspaceId,
    action: `usage.${params.featureKey}`,
    metadata: {
      featureKey: params.featureKey,
      limitKey: params.limitKey,
      periodKey: getCurrentSubscriptionPeriodKey(),
      limitLabel: limitLabels[params.limitKey],
      ...params.metadata
    }
  });
}

export { getLimitLabel, hasReachedLimit };

export function entitlementErrorResponse(error: EntitlementError) {
  return badRequest(error.payload.message, {
    entitlement: error.payload
  });
}
