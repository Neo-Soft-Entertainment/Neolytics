import { ApprovalStatus, DataProductType } from "@prisma/client";
import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { buildDataProductExport } from "@/lib/privacy/data-product-service";
import { hasPrivacyPermission } from "@/lib/privacy/permissions";
import { parseJsonBody } from "@/lib/request";

const rowSchema = z.record(z.string(), z.unknown());
const schema = z.object({
  purposeId: z.string().min(2),
  buyerName: z.string().trim().min(2).max(120),
  buyerEmail: z.string().trim().email().optional(),
  buyerHasContract: z.boolean(),
  cohortSize: z.coerce.number().int().nonnegative().optional(),
  rows: z.array(rowSchema).default([])
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!hasPrivacyPermission(context.organizationRole, context.organizationPermissions, "manage_data_products")) {
    return forbidden("This role cannot export data products.");
  }

  try {
    const body = await parseJsonBody(request, schema);
    const { productId } = await params;
    const product = await db.dataProduct.findUniqueOrThrow({
      where: {
        id: productId
      }
    });

    const result = await buildDataProductExport({
      organizationId: context.organizationId,
      actorId: context.userId,
      actorRole: context.organizationRole,
      buyerName: body.buyerName,
      buyerEmail: body.buyerEmail ?? null,
      buyerHasContract: body.buyerHasContract,
      purposeId: body.purposeId,
      cohortSize: body.cohortSize ?? null,
      rows: body.rows,
      product: {
        id: product.id,
        productName: product.productName,
        productType: product.productType as DataProductType,
        outputFields: Array.isArray(product.outputFields)
          ? product.outputFields.map((field) => String(field))
          : [],
        minimumCohortSize: product.minimumCohortSize,
        approvalStatus: product.approvalStatus as ApprovalStatus,
        privacyRiskScore: product.privacyRiskScore,
        requiresDpoApproval: product.requiresDpoApproval
      }
    });

    return ok(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid export payload.");
    }

    return serverError(error instanceof Error ? error.message : "Unable to export data product.");
  }
}
