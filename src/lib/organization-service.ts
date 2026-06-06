import { SubscriptionPlan } from "@prisma/client";

import { db } from "@/lib/db";
import { slugify } from "@/lib/slugify";
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

  return db.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: params.organizationName.trim(),
        slug: organizationSlug,
        subscriptionPlan: SubscriptionPlan.FREE
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
  const workspaceSlug = await buildUniqueSlug(slugify(params.name), async (slug) => {
    const count = await db.workspace.count({
      where: {
        organizationId: params.organizationId,
        slug
      }
    });

    return count > 0;
  });

  return db.workspace.create({
    data: {
      organizationId: params.organizationId,
      createdById: params.createdById,
      name: params.name.trim(),
      slug: workspaceSlug,
      description: params.description?.trim() || null
    }
  });
}
