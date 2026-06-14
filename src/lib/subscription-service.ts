import { Prisma, SubscriptionPlan, SubscriptionStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { notifyOrganizationDiscordWebhook } from "@/lib/discord";
import {
  getSubscriptionPlanConfig,
  hasSubscriptionCapability,
  type SubscriptionCapability,
  type SubscriptionMetric
} from "@/lib/subscription-plans";

type DbClient = Prisma.TransactionClient | typeof db;

const metricLabels: Record<SubscriptionMetric, string> = {
  seats: "limite de assentos",
  workspaces: "limite de workspaces",
  savedGames: "limite de jogos salvos",
  competitorSets: "limite de conjuntos de concorrentes",
  projects: "limite de projetos ativos",
  reportsGenerated: "limite mensal de relatórios",
  exportsGenerated: "limite mensal de exportações",
  projectAnalysesRun: "limite mensal de análises de mercado",
  gddsGenerated: "limite mensal de GDDs",
  artAnalysesRun: "limite mensal de análises de arte"
};

export class SubscriptionLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SubscriptionLimitError";
  }
}

export function getCurrentSubscriptionPeriodKey(date = new Date()) {
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}`;
}

export function getCurrentSubscriptionPeriodRange(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));

  return { start, end };
}

async function getOrganizationPlan(client: DbClient, organizationId: string) {
  const organization = await client.organization.findUniqueOrThrow({
    where: {
      id: organizationId
    },
    select: {
      subscriptionPlan: true,
      subscriptionStatus: true
    }
  });

  if (organization.subscriptionStatus !== SubscriptionStatus.ACTIVE) {
    throw new SubscriptionLimitError("Esta organização não tem uma assinatura ativa.");
  }

  return organization.subscriptionPlan;
}

async function getCurrentMetricCount(client: DbClient, organizationId: string, metric: SubscriptionMetric) {
  if (metric === "seats") {
    const [members, invites] = await Promise.all([
      client.organizationMember.count({
        where: {
          organizationId
        }
      }),
      client.organizationInvitation.count({
        where: {
          organizationId,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: {
            gt: new Date()
          }
        }
      })
    ]);

    return members + invites;
  }

  if (metric === "workspaces") {
    return client.workspace.count({
      where: {
        organizationId
      }
    });
  }

  if (metric === "savedGames") {
    return client.savedGame.count({
      where: {
        workspace: {
          organizationId
        }
      }
    });
  }

  if (metric === "competitorSets") {
    return client.competitorSet.count({
      where: {
        organizationId
      }
    });
  }

  if (metric === "projects") {
    return client.project.count({
      where: {
        organizationId
      }
    });
  }

  return 0;
}

export async function enforceSubscriptionCapacity(
  organizationId: string,
  metric: Extract<SubscriptionMetric, "seats" | "workspaces" | "savedGames" | "competitorSets" | "projects">,
  client: DbClient = db
) {
  const plan = await getOrganizationPlan(client, organizationId);
  const limit = getSubscriptionPlanConfig(plan).limits[metric];

  if (limit === null) {
    return;
  }

  const current = await getCurrentMetricCount(client, organizationId, metric);

  if (current < limit) {
    return;
  }

  throw new SubscriptionLimitError(`Seu ${metricLabels[metric]} foi atingido no plano ${plan.toLowerCase()}.`);
}

export async function consumeSubscriptionUsage(
  organizationId: string,
  metric: Extract<SubscriptionMetric, "reportsGenerated" | "exportsGenerated" | "projectAnalysesRun" | "gddsGenerated" | "artAnalysesRun">,
  client: DbClient = db
) {
  const plan = await getOrganizationPlan(client, organizationId);
  const limit = getSubscriptionPlanConfig(plan).limits[metric];

  if (limit === null) {
    return;
  }

  const periodKey = getCurrentSubscriptionPeriodKey();
  const usage = await client.organizationSubscriptionUsage.upsert({
    where: {
      organizationId_periodKey: {
        organizationId,
        periodKey
      }
    },
    update: {},
    create: {
      organizationId,
      periodKey
    }
  });
  const current =
    metric === "reportsGenerated"
      ? usage.reportsGenerated
      : metric === "exportsGenerated"
        ? usage.exportsGenerated
        : metric === "projectAnalysesRun"
          ? usage.projectAnalysesRun
          : metric === "gddsGenerated"
            ? usage.gddsGenerated
            : usage.artAnalysesRun;

  if (current >= limit) {
    throw new SubscriptionLimitError(`Seu ${metricLabels[metric]} foi atingido no plano ${plan.toLowerCase()}.`);
  }

  const data: Prisma.OrganizationSubscriptionUsageUpdateInput =
    metric === "reportsGenerated"
      ? { reportsGenerated: { increment: 1 } }
      : metric === "exportsGenerated"
        ? { exportsGenerated: { increment: 1 } }
        : metric === "projectAnalysesRun"
          ? { projectAnalysesRun: { increment: 1 } }
          : metric === "gddsGenerated"
            ? { gddsGenerated: { increment: 1 } }
            : { artAnalysesRun: { increment: 1 } };

  await client.organizationSubscriptionUsage.update({
    where: {
      id: usage.id
    },
    data
  });
}

export async function recordSubscriptionUsage(
  organizationId: string,
  metric: Extract<SubscriptionMetric, "reportsGenerated" | "exportsGenerated" | "projectAnalysesRun" | "gddsGenerated" | "artAnalysesRun">,
  client: DbClient = db
) {
  const periodKey = getCurrentSubscriptionPeriodKey();
  const usage = await client.organizationSubscriptionUsage.upsert({
    where: {
      organizationId_periodKey: {
        organizationId,
        periodKey
      }
    },
    update: {},
    create: {
      organizationId,
      periodKey
    }
  });
  const data: Prisma.OrganizationSubscriptionUsageUpdateInput =
    metric === "reportsGenerated"
      ? { reportsGenerated: { increment: 1 } }
      : metric === "exportsGenerated"
        ? { exportsGenerated: { increment: 1 } }
        : metric === "projectAnalysesRun"
          ? { projectAnalysesRun: { increment: 1 } }
          : metric === "gddsGenerated"
            ? { gddsGenerated: { increment: 1 } }
            : { artAnalysesRun: { increment: 1 } };

  await client.organizationSubscriptionUsage.update({
    where: {
      id: usage.id
    },
    data
  });
}

export async function enforceSubscriptionCapability(
  organizationId: string,
  capability: SubscriptionCapability,
  client: DbClient = db
) {
  const plan = await getOrganizationPlan(client, organizationId);

  if (hasSubscriptionCapability(plan, capability)) {
    return;
  }

  throw new SubscriptionLimitError(`Este recurso não está disponível no plano ${plan.toLowerCase()}.`);
}

export async function getOrganizationSubscriptionSnapshot(organizationId: string) {
  const periodKey = getCurrentSubscriptionPeriodKey();
  const [organization, usage, seats, workspaces, savedGames, competitorSets, projects] = await Promise.all([
    db.organization.findUniqueOrThrow({
      where: {
        id: organizationId
      },
      select: {
        subscriptionPlan: true,
        subscriptionStatus: true,
        stripeSubscriptionId: true,
        subscriptionCurrentPeriodStart: true,
        subscriptionCurrentPeriodEnd: true,
        subscriptionCanceledAt: true
      }
    }),
    db.organizationSubscriptionUsage.findUnique({
      where: {
        organizationId_periodKey: {
          organizationId,
          periodKey
        }
      }
    }),
    getCurrentMetricCount(db, organizationId, "seats"),
    db.workspace.count({
      where: {
        organizationId
      }
    }),
    db.savedGame.count({
      where: {
        workspace: {
          organizationId
        }
      }
    }),
    db.competitorSet.count({
      where: {
        organizationId
      }
    }),
    db.project.count({
      where: {
        organizationId
      }
    })
  ]);

  const plan = getSubscriptionPlanConfig(organization.subscriptionPlan);

  return {
    organizationId,
    periodKey,
    plan: organization.subscriptionPlan,
    planLabel: plan.label,
    planDescription: plan.description,
    status: organization.subscriptionStatus,
    hasStripeSubscription: Boolean(organization.stripeSubscriptionId),
    currentPeriodStart: organization.subscriptionCurrentPeriodStart,
    currentPeriodEnd: organization.subscriptionCurrentPeriodEnd,
    canceledAt: organization.subscriptionCanceledAt,
    usage: {
      seats,
      workspaces: workspaces,
      savedGames: savedGames,
      competitorSets: competitorSets,
      projects: projects,
      reportsGenerated: usage?.reportsGenerated ?? 0,
      exportsGenerated: usage?.exportsGenerated ?? 0,
      projectAnalysesRun: usage?.projectAnalysesRun ?? 0,
      gddsGenerated: usage?.gddsGenerated ?? 0,
      artAnalysesRun: usage?.artAnalysesRun ?? 0
    },
    limits: plan.limits
  };
}

export async function updateOrganizationSubscriptionPlan(organizationId: string, plan: SubscriptionPlan) {
  const period = getCurrentSubscriptionPeriodRange();

  const organization = await db.organization.update({
    where: {
      id: organizationId
    },
    data: {
      subscriptionPlan: plan,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      subscriptionCurrentPeriodStart: period.start,
      subscriptionCurrentPeriodEnd: period.end,
      subscriptionCanceledAt: null
    }
  });

  await notifyOrganizationDiscordWebhook(organizationId, {
    content: `Organization subscription changed to **${plan}**.`,
    embeds: [
      {
        title: "Subscription updated",
        description: `${organization.name} is now on the ${plan} plan.`,
        color: 15844367,
        timestamp: new Date().toISOString()
      }
    ]
  });

  return organization;
}

export async function syncOrganizationSubscriptionFromStripe(params: {
  organizationId: string;
  plan: SubscriptionPlan;
  customerId: string | null;
  subscriptionId: string | null;
  priceId: string | null;
  isCanceled: boolean;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  canceledAt: Date | null;
}) {
  const organization = await db.organization.update({
    where: {
      id: params.organizationId
    },
    data: {
      subscriptionPlan: params.plan,
      subscriptionStatus: params.isCanceled ? SubscriptionStatus.CANCELED : SubscriptionStatus.ACTIVE,
      stripeCustomerId: params.customerId,
      stripeSubscriptionId: params.subscriptionId,
      stripePriceId: params.priceId,
      subscriptionCurrentPeriodStart: params.currentPeriodStart,
      subscriptionCurrentPeriodEnd: params.currentPeriodEnd,
      subscriptionCanceledAt: params.canceledAt
    }
  });

  await notifyOrganizationDiscordWebhook(params.organizationId, {
    content: `Organization subscription synced from Stripe as **${params.plan}**.`,
    embeds: [
      {
        title: "Stripe subscription synced",
        description: `${organization.name} is now on the ${params.plan} plan.`,
        color: 5763719,
        timestamp: new Date().toISOString()
      }
    ]
  });

  return organization;
}
