import { z } from "zod";

import { badRequest, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext, requireApiUser } from "@/lib/auth-helpers";
import { createOrganizationForUser, deleteOrganizationForUser } from "@/lib/organization-service";
import { parseJsonBody } from "@/lib/request";

const schema = z.object({
  organizationName: z.string().min(2),
  workspaceName: z.string().min(2)
});

export async function POST(request: Request) {
  const session = await requireApiUser();

  if (!session?.user?.id) {
    return unauthorized();
  }

  try {
    const body = await parseJsonBody(request, schema);
    const created = await createOrganizationForUser({
      userId: session.user.id,
      organizationName: body.organizationName,
      workspaceName: body.workspaceName
    });

    return ok(created, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid organization payload.");
    }

    return serverError("Unable to create organization.");
  }
}

export async function DELETE() {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  try {
    await deleteOrganizationForUser({
      organizationId: context.organizationId,
      userId: context.userId
    });

    return ok({ success: true });
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Unable to delete organization.");
  }
}
