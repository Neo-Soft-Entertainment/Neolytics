import { z } from "zod";

import { badRequest, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { createWorkspaceForOrganization } from "@/lib/organization-service";
import { parseJsonBody } from "@/lib/request";
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
