import { ApprovalStatus, PrivacyDecision } from "@prisma/client";
import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { createPrivacyAuditLog } from "@/lib/privacy/audit";
import { hasPrivacyPermission } from "@/lib/privacy/permissions";
import { parseJsonBody } from "@/lib/request";

const schema = z.object({
  approvalStatus: z.nativeEnum(ApprovalStatus),
  exportAllowed: z.boolean().optional(),
  buyerContractAccepted: z.boolean().optional()
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!hasPrivacyPermission(context.organizationRole, context.organizationPermissions, "manage_data_products")) {
    return forbidden("This role cannot approve data products.");
  }

  try {
    const body = await parseJsonBody(request, schema);
    const { productId } = await params;
    const approvalStatus = body.approvalStatus;
    const product = await db.dataProduct.update({
      where: {
        id: productId
      },
      data: {
        approvalStatus,
        approvedAt: approvalStatus === ApprovalStatus.APPROVED ? new Date() : null,
        approvedById: approvalStatus === ApprovalStatus.APPROVED ? context.userId : null,
        exportAllowed: body.exportAllowed,
        buyerContractAccepted: body.buyerContractAccepted
      }
    });

    await createPrivacyAuditLog(db, {
      organizationId: context.organizationId,
      actorId: context.userId,
      actorRole: context.organizationRole,
      action: "data_product.approval_updated",
      resourceType: "data_product",
      resourceId: product.id,
      decision:
        approvalStatus === ApprovalStatus.APPROVED
          ? PrivacyDecision.ALLOW
          : approvalStatus === ApprovalStatus.REJECTED
            ? PrivacyDecision.BLOCK
            : PrivacyDecision.REQUIRE_REVIEW,
      reason: approvalStatus
    });

    return ok(product);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid data product approval payload.");
    }

    return serverError(error instanceof Error ? error.message : "Unable to update data product.");
  }
}
