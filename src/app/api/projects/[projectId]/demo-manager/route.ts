import { z } from "zod";

import { badRequest, forbidden, notFound, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canWriteOrganization } from "@/lib/authorization";
import { getDemoManagerData, updateDemoPlan } from "@/lib/demo-manager-service";
import { demoPlanSchema } from "@/lib/demo-manager-schemas";
import { parseJsonBody } from "@/lib/request";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  void request;
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  const { projectId } = await params;
  const data = await getDemoManagerData(context.workspace.id, projectId);

  if (!data) {
    return notFound("Projeto não encontrado.");
  }

  return ok(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canWriteOrganization(context.organizationRole, context.organizationPermissions)) {
    return forbidden("Visualizadores não podem editar o Demo Manager.");
  }

  try {
    const body = await parseJsonBody(request, demoPlanSchema);
    const { projectId } = await params;
    const plan = await updateDemoPlan(context.workspace.id, projectId, body);

    if (!plan) {
      return notFound("Projeto não encontrado.");
    }

    return ok(plan);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid Demo Manager payload.");
    }

    return serverError("Não foi possível atualizar o Demo Manager.");
  }
}
