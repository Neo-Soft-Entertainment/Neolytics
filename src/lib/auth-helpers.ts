import { redirect } from "next/navigation";

import { auth } from "@/auth";
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
  const membership = session.user.organizations[0];

  if (!membership) {
    redirect("/setup");
  }

  return db.organization.findUniqueOrThrow({
    where: {
      id: membership.id
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

  const membership = session.user.organizations[0];

  if (!membership) {
    return null;
  }

  const workspace = await db.workspace.findFirst({
    where: {
      organizationId: membership.id
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
    organizationId: membership.id,
    workspace
  };
}
