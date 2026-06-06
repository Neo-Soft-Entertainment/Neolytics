import { z } from "zod";

import { badRequest, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { createWorkspaceForOrganization, deleteWorkspaceFromOrganization } from "@/lib/organization-service";
import { parseJsonBody, parseSearchParams } from "@/lib/request";
import { SubscriptionLimitError } from "@/lib/subscription-service";

const schema = z.object({
  name: z.string().min(2),
  description: z.string().optional()
});

export async function POST(request: Request) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  try {
    const body = await parseJsonBody(request, schema);
    const workspace = await createWorkspaceForOrganization({
      organizationId: context.organizationId,
      createdById: context.userId,
      name: body.name,
      description: body.description
    });

    return ok(workspace, { status: 201 });
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

  try {
    const url = new URL(request.url);
    const query = parseSearchParams(url, z.object({
      workspaceId: z.string().min(1)
    }));

    await deleteWorkspaceFromOrganization({
      organizationId: context.organizationId,
      workspaceId: query.workspaceId,
      userId: context.userId
    });

    return ok({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid workspace delete payload.");
    }

    return badRequest(error instanceof Error ? error.message : "Unable to delete workspace.");
  }
}
