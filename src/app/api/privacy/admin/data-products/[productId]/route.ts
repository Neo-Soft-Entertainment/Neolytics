import { ApprovalStatus, PrivacyDecision } from "@prisma/client";
import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { createPrivacyAuditLog } from "@/lib/privacy/audit";
import { hasPrivacyPermission } from "@/lib/privacy/permissions";
import { parseJsonBody } from "@/lib/request";
import { getErrorMessage } from "@/lib/error-message";

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
    return forbidden("Este cargo não pode aprovar produtos de dados.");
  }

  try {
    const body = await parseJsonBody(request, schema);
    const { productId } = await params;
    const approvalStatus = body.approvalStatus;
        let resolvedValue0: any;
    if (approvalStatus === ApprovalStatus.APPROVED) {
      resolvedValue0 = new Date();
    } else {
      resolvedValue0 = null;
    }
    let resolvedValue1: any;
    if (approvalStatus === ApprovalStatus.APPROVED) {
      resolvedValue1 = context.userId;
    } else {
      resolvedValue1 = null;
    }
const product = await db.dataProduct.update({
      where: {
        id: productId
      },
      data: {
        approvalStatus,
        approvedAt: resolvedValue0,
        approvedById: resolvedValue1,
        exportAllowed: body.exportAllowed,
        buyerContractAccepted: body.buyerContractAccepted
      }
    });

        let resolvedValue2: any;
    if (approvalStatus === ApprovalStatus.APPROVED) {
      resolvedValue2 = PrivacyDecision.ALLOW;
    } else {
            let resolvedValue3: any;
      if (approvalStatus === ApprovalStatus.REJECTED) {
        resolvedValue3 = PrivacyDecision.BLOCK;
      } else {
        resolvedValue3 = PrivacyDecision.REQUIRE_REVIEW;
      }
resolvedValue2 = resolvedValue3;
    }
await createPrivacyAuditLog(db, {
      organizationId: context.organizationId,
      actorId: context.userId,
      actorRole: context.organizationRole,
      action: "data_product.approval_updated",
      resourceType: "data_product",
      resourceId: product.id,
      decision:
        resolvedValue2,
      reason: approvalStatus
    });

    return ok(product);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid data product approval payload.");
    }

    return serverError(getErrorMessage(error, "Não foi possível atualizar o produto de dados."));
  }
}
