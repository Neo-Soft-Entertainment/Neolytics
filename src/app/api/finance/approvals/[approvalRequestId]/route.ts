import { ApprovalStatus } from "@prisma/client";
import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canManageFinance } from "@/lib/authorization";
import { updateApprovalRequest } from "@/lib/finance-service";
import { parseJsonBody } from "@/lib/request";

const schema = z.object({
  status: z.nativeEnum(ApprovalStatus),
  decisionNotes: z.string().optional()
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ approvalRequestId: string }> }
) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!canManageFinance(context.organizationRole, context.organizationPermissions)) {
    return forbidden("Only organization admins can approve financial requests.");
  }

  try {
    const body = await parseJsonBody(request, schema);
    const { approvalRequestId } = await params;
    const approval = await updateApprovalRequest({
      organizationId: context.organizationId,
      userId: context.userId,
      approvalRequestId,
      status: body.status,
      decisionNotes: body.decisionNotes
    });

    return ok(approval);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid approval payload.");
    }

    return serverError(error instanceof Error ? error.message : "Unable to update approval.");
  }
}
