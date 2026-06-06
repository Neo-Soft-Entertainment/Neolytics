import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getActiveOrganizationId } from "@/lib/active-organization";
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

  return db.organization.findUniqueOrThrow({
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

  const workspace = await db.workspace.findFirst({
    where: {
      organizationId: membership.organizationId
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  if (!workspace) {
    return null;
  }

  return {
    session,
    userId: session.user.id,
    organizationId: membership.organizationId,
    organizationRole: membership.role,
    workspace
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
