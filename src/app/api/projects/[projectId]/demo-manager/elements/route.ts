import { z } from "zod";

import { badRequest, forbidden, notFound, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canWriteOrganization } from "@/lib/authorization";
import { createDemoElement } from "@/lib/demo-manager-service";
import { demoElementSchema } from "@/lib/demo-manager-schemas";
import { parseJsonBody } from "@/lib/request";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canWriteOrganization(context.organizationRole, context.organizationPermissions)) {
    return forbidden("Viewers cannot create Demo Manager items.");
  }

  try {
    const body = await parseJsonBody(request, demoElementSchema);
    const { projectId } = await params;
    const element = await createDemoElement(context.workspace.id, projectId, body);

    if (!element) {
      return notFound("Project not found.");
    }

    return ok(element, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid Demo Manager item payload.");
    }

    return serverError("Unable to create Demo Manager item.");
  }
}
