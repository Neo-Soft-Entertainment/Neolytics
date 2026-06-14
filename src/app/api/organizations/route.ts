import { z } from "zod";

import { badRequest, ok, serverError, unauthorized } from "@/lib/api-response";
import { setActiveOrganizationCookie } from "@/lib/active-organization";
import { setActiveWorkspaceCookie } from "@/lib/active-workspace";
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

    const response = ok(created, { status: 201 });
    setActiveOrganizationCookie(response, created.organization.id);
    setActiveWorkspaceCookie(response, created.workspace.id);
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid organization payload.");
    }

    return serverError("Não foi possível criar a organização.");
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
    return badRequest(error instanceof Error ? error.message : "Não foi possível excluir a organização.");
  }
}
