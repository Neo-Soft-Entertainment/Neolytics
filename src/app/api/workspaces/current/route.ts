import { z } from "zod";

import { badRequest, ok, unauthorized } from "@/lib/api-response";
import { setActiveWorkspaceCookie } from "@/lib/active-workspace";
import { getApiContext } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { parseJsonBody } from "@/lib/request";

const schema = z.object({
  workspaceId: z.string().min(1)
});

export async function PATCH(request: Request) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  try {
    const body = await parseJsonBody(request, schema);
    const workspace = await db.workspace.findFirst({
      where: {
        id: body.workspaceId,
        organizationId: context.organizationId
      }
    });

    if (!workspace) {
      return badRequest("Área de trabalho não encontrada na organização atual.");
    }

    const response = ok({ success: true, workspaceId: workspace.id });
    setActiveWorkspaceCookie(response, workspace.id);
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Seleção de área de trabalho inválida.");
    }

    return badRequest("Não foi possível trocar a área de trabalho.");
  }
}
