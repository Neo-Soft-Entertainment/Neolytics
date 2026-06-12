import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { setActiveWorkspaceCookie } from "@/lib/active-workspace";
import { getApiContext } from "@/lib/auth-helpers";
import { canWriteOrganization } from "@/lib/authorization";
import { db } from "@/lib/db";
import { createWorkspaceForOrganization, deleteWorkspaceFromOrganization } from "@/lib/organization-service";
import { parseJsonBody, parseSearchParams } from "@/lib/request";
import { SubscriptionLimitError } from "@/lib/subscription-service";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional()
});

export async function POST(request: Request) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canWriteOrganization(context.organizationRole)) {
    return forbidden("Viewers cannot create workspaces.");
  }

  try {
    const body = await parseJsonBody(request, schema);
    const workspace = await createWorkspaceForOrganization({
      organizationId: context.organizationId,
      createdById: context.userId,
      name: body.name,
      description: body.description
    });

    const response = ok(workspace, { status: 201 });
    setActiveWorkspaceCookie(response, workspace.id);
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid workspace payload.");
    }

    if (error instanceof SubscriptionLimitError) {
      return badRequest(error.message);
    }

    return serverError("Unable to create workspace.");
  }
}

export async function DELETE(request: Request) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canWriteOrganization(context.organizationRole)) {
    return forbidden("Viewers cannot delete workspaces.");
  }

  try {
    const url = new URL(request.url);
    const query = parseSearchParams(url, z.object({
      workspaceId: z.string().uuid()
    }));
    const nextWorkspace = await db.workspace.findFirst({
      where: {
        organizationId: context.organizationId,
        id: {
          not: query.workspaceId
        }
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    await deleteWorkspaceFromOrganization({
      organizationId: context.organizationId,
      workspaceId: query.workspaceId,
      userId: context.userId
    });

    const response = ok({ success: true });

    if (nextWorkspace) {
      setActiveWorkspaceCookie(response, nextWorkspace.id);
    }

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid workspace delete payload.");
    }

    return badRequest(error instanceof Error ? error.message : "Unable to delete workspace.");
  }
}
