import { z } from "zod";

import { badRequest, ok, unauthorized } from "@/lib/api-response";
import { setActiveOrganizationCookie } from "@/lib/active-organization";
import { setActiveWorkspaceCookie } from "@/lib/active-workspace";
import { requireApiUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { parseJsonBody } from "@/lib/request";

const schema = z.object({
  organizationId: z.string().min(1)
});

export async function PATCH(request: Request) {
  const session = await requireApiUser();

  if (!session?.user?.id) {
    return unauthorized();
  }

  try {
    const body = await parseJsonBody(request, schema);
    const membership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: body.organizationId,
          userId: session.user.id
        }
      }
    });

    if (!membership) {
      return badRequest("You do not belong to this organization.");
    }

    const workspace = await db.workspace.findFirst({
      where: {
        organizationId: body.organizationId
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    const response = ok({ success: true, organizationId: body.organizationId });
    setActiveOrganizationCookie(response, body.organizationId);

    if (workspace) {
      setActiveWorkspaceCookie(response, workspace.id);
    }

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid organization selection.");
    }

    return badRequest("Unable to switch organization.");
  }
}
