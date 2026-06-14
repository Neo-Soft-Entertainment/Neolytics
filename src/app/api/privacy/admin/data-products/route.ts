import { DataProductType } from "@prisma/client";
import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { createDataProduct, listDataProducts } from "@/lib/privacy/data-product-service";
import { hasPrivacyPermission } from "@/lib/privacy/permissions";
import { parseJsonBody } from "@/lib/request";

const schema = z.object({
  productName: z.string().trim().min(2).max(120),
  productType: z.nativeEnum(DataProductType),
  description: z.string().trim().min(2).max(1000),
  sourceTables: z.array(z.string().trim().min(1)).min(1),
  outputFields: z.array(z.string().trim().min(1)).min(1),
  aggregationLevel: z.string().trim().min(2).max(80).optional(),
  minimumCohortSize: z.coerce.number().int().positive().optional(),
  privacyRiskScore: z.coerce.number().int().min(0).max(100).optional(),
  requiresLegalReview: z.boolean().optional(),
  requiresDpoApproval: z.boolean().optional(),
  contractRequired: z.boolean().optional()
});

export async function GET() {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!hasPrivacyPermission(context.organizationRole, context.organizationPermissions, "manage_data_products")) {
    return forbidden("Este cargo não pode acessar produtos de dados.");
  }

  return ok({
    dataProducts: await listDataProducts(context.organizationId)
  });
}

export async function POST(request: Request) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!hasPrivacyPermission(context.organizationRole, context.organizationPermissions, "manage_data_products")) {
    return forbidden("Este cargo não pode criar produtos de dados.");
  }

  try {
    const body = await parseJsonBody(request, schema);
    const product = await createDataProduct({
      organizationId: context.organizationId,
      actorId: context.userId,
      actorRole: context.organizationRole,
      productName: body.productName,
      productType: body.productType,
      description: body.description,
      sourceTables: body.sourceTables,
      outputFields: body.outputFields,
      aggregationLevel: body.aggregationLevel,
      minimumCohortSize: body.minimumCohortSize,
      privacyRiskScore: body.privacyRiskScore,
      requiresLegalReview: body.requiresLegalReview,
      requiresDpoApproval: body.requiresDpoApproval,
      contractRequired: body.contractRequired
    });

    return ok(product, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid data product payload.");
    }

    return serverError(error instanceof Error ? error.message : "Não foi possível criar o produto de dados.");
  }
}
