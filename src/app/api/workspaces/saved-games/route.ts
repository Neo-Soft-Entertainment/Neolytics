import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canWriteOrganization } from "@/lib/authorization";
import { db } from "@/lib/db";
import { parseJsonBody } from "@/lib/request";
import { SubscriptionLimitError } from "@/lib/subscription-service";
import { saveGameToWorkspace } from "@/lib/workspace-service";

const schema = z.object({
  workspaceId: z.string().optional(),
  appId: z.coerce.number().int().positive()
});

export async function POST(request: Request) {
  try {
    const context = await getApiContext();

    if (!context) {
      return unauthorized();
    }

    if (!canWriteOrganization(context.organizationRole, context.organizationPermissions)) {
      return forbidden("Visualizadores não podem salvar jogos em áreas de trabalho.");
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
      return forbidden("A área de trabalho não pertence à sua organização.");
    }

    const game = await db.steamGame.findUniqueOrThrow({
      where: {
        appId: body.appId
      },
      select: {
        id: true
      }
    });

    return ok(
      await saveGameToWorkspace({
        organizationId: context.organizationId,
        workspaceId,
        steamGameId: game.id,
        userId: context.userId
      }),
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Requisição inválida.");
    }

    if (error instanceof SubscriptionLimitError) {
      return badRequest(error.message);
    }

    return serverError();
  }
}
