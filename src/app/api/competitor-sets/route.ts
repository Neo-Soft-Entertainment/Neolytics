import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { parseJsonBody } from "@/lib/request";
import { createCompetitorSet } from "@/lib/workspace-service";

const schema = z.object({
  workspaceId: z.string().optional(),
  name: z.string().min(2),
  description: z.string().optional(),
  appIds: z.array(z.number().int().positive()).min(2)
});

export async function POST(request: Request) {
  try {
    const context = await getApiContext();

    if (!context) {
      return unauthorized();
    }

    const body = await parseJsonBody(request, schema);
    const workspaceId = body.workspaceId ?? context.workspace.id;
    const workspace = await db.workspace.findFirst({
      where: {
        id: workspaceId,
        organizationId: context.organizationId
      }
    });

    if (!workspace) {
      return forbidden("Workspace does not belong to your organization.");
    }

    return ok(
      await createCompetitorSet({
        organizationId: context.organizationId,
        workspaceId,
        createdById: context.userId,
        name: body.name,
        description: body.description,
        appIds: body.appIds
      }),
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid request.");
    }

    return serverError();
  }
}
