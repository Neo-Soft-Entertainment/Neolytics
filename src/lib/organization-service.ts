import { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { createAuditEvent } from "@/lib/audit-service";
import { slugify } from "@/lib/slugify";
import { enforceSubscriptionCapacity, getCurrentSubscriptionPeriodRange } from "@/lib/subscription-service";
import { buildUniqueSlug } from "@/lib/unique-slug";

export async function createOrganizationForUser(params: {
  userId: string;
  organizationName: string;
  workspaceName?: string;
}) {
  const organizationSlug = await buildUniqueSlug(slugify(params.organizationName), async (slug) => {
    const count = await db.organization.count({
      where: {
        slug
      }
    });

    return count > 0;
  });

  const workspaceLabel = params.workspaceName?.trim() || "Default Workspace";
  const workspaceSlug = slugify(workspaceLabel) || "default";
  const period = getCurrentSubscriptionPeriodRange();

  return db.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: params.organizationName.trim(),
        slug: organizationSlug,
        subscriptionPlan: SubscriptionPlan.FREE,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        subscriptionCurrentPeriodStart: period.start,
        subscriptionCurrentPeriodEnd: period.end
      }
    });

    await tx.organizationMember.create({
      data: {
        organizationId: organization.id,
        userId: params.userId,
        role: "OWNER"
      }
    });

    const workspace = await tx.workspace.create({
      data: {
        organizationId: organization.id,
        createdById: params.userId,
        name: workspaceLabel,
        slug: workspaceSlug,
        description: "Primary workspace"
      }
    });

    await createAuditEvent(tx, {
      organizationId: organization.id,
      userId: params.userId,
      entityType: "organization",
      entityId: organization.id,
      action: "organization.created",
      metadata: {
        name: organization.name,
        workspaceId: workspace.id
      }
    });

    return {
      organization,
      workspace
    };
  });
}

export async function createWorkspaceForOrganization(params: {
  organizationId: string;
  createdById: string;
  name: string;
  description?: string;
}) {
  await enforceSubscriptionCapacity(params.organizationId, "workspaces");

  const workspaceSlug = await buildUniqueSlug(slugify(params.name), async (slug) => {
    const count = await db.workspace.count({
      where: {
        organizationId: params.organizationId,
        slug
      }
    });

    return count > 0;
  });

  const workspace = await db.workspace.create({
    data: {
      organizationId: params.organizationId,
      createdById: params.createdById,
      name: params.name.trim(),
      slug: workspaceSlug,
      description: params.description?.trim() || null
    }
  });

  await createAuditEvent(db, {
    organizationId: params.organizationId,
    userId: params.createdById,
    entityType: "workspace",
    entityId: workspace.id,
    action: "workspace.created",
    metadata: {
      name: workspace.name
    }
  });

  return workspace;
}

export async function deleteOrganizationForUser(params: {
  organizationId: string;
  userId: string;
}) {
  const membership = await db.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: params.organizationId,
        userId: params.userId
      }
    }
  });

  if (!membership || membership.role !== "OWNER") {
    throw new Error("Only organization owners can delete the organization.");
  }

  await createAuditEvent(db, {
    organizationId: params.organizationId,
    userId: params.userId,
    entityType: "organization",
    entityId: params.organizationId,
    action: "organization.deleted"
  });

  await db.organization.delete({
    where: {
      id: params.organizationId
    }
  });
}

export async function deleteWorkspaceFromOrganization(params: {
  organizationId: string;
  workspaceId: string;
  userId: string;
}) {
  const membership = await db.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: params.organizationId,
        userId: params.userId
      }
    }
  });

  if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
    throw new Error("Only organization admins can delete workspaces.");
  }

  const workspaceCount = await db.workspace.count({
    where: {
      organizationId: params.organizationId
    }
  });

  if (workspaceCount <= 1) {
    throw new Error("At least one workspace must remain in the organization.");
  }

  const workspace = await db.workspace.findFirst({
    where: {
      id: params.workspaceId,
      organizationId: params.organizationId
    }
  });

  if (!workspace) {
    throw new Error("Área de trabalho não encontrada.");
  }

  await createAuditEvent(db, {
    organizationId: params.organizationId,
    userId: params.userId,
    entityType: "workspace",
    entityId: workspace.id,
    action: "workspace.deleted",
    metadata: {
      name: workspace.name
    }
  });

  await db.workspace.delete({
    where: {
      id: workspace.id
    }
  });
}
