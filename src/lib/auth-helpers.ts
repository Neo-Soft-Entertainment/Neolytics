import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getActiveOrganizationId } from "@/lib/active-organization";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { db } from "@/lib/db";

export async function requireUser() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return session;
}

export async function getCurrentOrganization() {
  const session = await requireUser();
  const membership = await getCurrentOrganizationMembership(session.user.id);

  if (!membership) {
    redirect("/setup");
  }

  const organization = await db.organization.findUniqueOrThrow({
    where: {
      id: membership.organizationId
    },
    include: {
      workspaces: {
        orderBy: {
          createdAt: "asc"
        }
      }
    }
  });
  const activeWorkspaceId = await getActiveWorkspaceId();
  const currentWorkspace =
    organization.workspaces.find((workspace) => workspace.id === activeWorkspaceId) ??
    organization.workspaces[0] ??
    null;

  return {
    ...organization,
    currentWorkspace
  };
}

export async function requireApiUser() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  return session;
}

export async function getApiContext() {
  const session = await requireApiUser();

  if (!session?.user?.id) {
    return null;
  }

  const membership = await getCurrentOrganizationMembership(session.user.id);

  if (!membership) {
    return null;
  }

  const activeWorkspaceId = await getActiveWorkspaceId();
  const workspace = await db.workspace.findFirst({
    where: {
      organizationId: membership.organizationId,
      ...(activeWorkspaceId ? { id: activeWorkspaceId } : {})
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  const fallbackWorkspace = workspace
    ? workspace
    : await db.workspace.findFirst({
        where: {
          organizationId: membership.organizationId
        },
        orderBy: {
          createdAt: "asc"
        }
      });

  if (!fallbackWorkspace) {
    return null;
  }

  return {
    session,
    userId: session.user.id,
    organizationId: membership.organizationId,
    organizationRole: membership.role,
    organizationPermissions: membership.permissions,
    workspace: fallbackWorkspace
  };
}

async function getCurrentOrganizationMembership(userId: string) {
  const activeOrganizationId = await getActiveOrganizationId();

  if (activeOrganizationId) {
    const activeMembership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: activeOrganizationId,
          userId
        }
      }
    });

    if (activeMembership) {
      return activeMembership;
    }
  }

  return db.organizationMember.findFirst({
    where: {
      userId
    },
    orderBy: {
      joinedAt: "asc"
    }
  });
}
