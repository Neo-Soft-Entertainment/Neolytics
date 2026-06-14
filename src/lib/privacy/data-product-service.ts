import {
  ApprovalStatus,
  DataProductType,
  Prisma,
  PrismaClient,
  PrivacyDecision
} from "@prisma/client";

import { db } from "@/lib/db";
import { createPrivacyAuditLog } from "@/lib/privacy/audit";
import { PrivacyRiskLevel } from "@/lib/privacy/constants";
import { assertExportableFields } from "@/lib/privacy/field-classification";
import { evaluatePrivacyRules, transformRowsForPrivacy } from "@/lib/privacy/rules-engine";

type DataProductClient = PrismaClient | Prisma.TransactionClient;

const allowedProductTypes = new Set<DataProductType>([
  DataProductType.AGGREGATED_INSIGHTS,
  DataProductType.SYNTHETIC_DATASET,
  DataProductType.ANONYMIZED_STATISTICS,
  DataProductType.COHORT_REPORT,
  DataProductType.PARTNER_ACTIVATION_WITH_EXPLICIT_CONSENT
]);

function getDataProductClient(client?: DataProductClient) {
  return client ?? db;
}

export async function listDataProducts(organizationId: string, client?: DataProductClient) {
  return getDataProductClient(client).dataProduct.findMany({
    where: {
      OR: [
        {
          organizationId
        },
        {
          organizationId: null
        }
      ]
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}

export async function createDataProduct(params: {
  organizationId?: string | null;
  actorId: string;
  actorRole?: string | null;
  productName: string;
  productType: DataProductType;
  description: string;
  sourceTables: string[];
  outputFields: string[];
  aggregationLevel?: string | null;
  minimumCohortSize?: number | null;
  privacyRiskScore?: number | null;
  requiresLegalReview?: boolean;
  requiresDpoApproval?: boolean;
  contractRequired?: boolean;
  buyerContractAccepted?: boolean;
  client?: DataProductClient;
}) {
  if (!allowedProductTypes.has(params.productType)) {
    throw new Error(`Blocked data product type: ${params.productType}`);
  }

  assertExportableFields(params.outputFields);

  const productClient = getDataProductClient(params.client);
  const product = await productClient.dataProduct.create({
    data: {
      organizationId: params.organizationId ?? null,
      productName: params.productName,
      productType: params.productType,
      description: params.description,
      sourceTables: params.sourceTables,
      outputFields: params.outputFields,
      aggregationLevel: params.aggregationLevel ?? null,
      minimumCohortSize: params.minimumCohortSize ?? 100,
      privacyRiskScore: params.privacyRiskScore ?? 0,
      exportAllowed: true,
      requiresLegalReview: params.requiresLegalReview ?? true,
      requiresDpoApproval: params.requiresDpoApproval ?? true,
      contractRequired: params.contractRequired ?? true,
      buyerContractAccepted: params.buyerContractAccepted ?? false,
      reidentificationProhibited: true,
      approvalStatus: ApprovalStatus.PENDING
    }
  });

  await createPrivacyAuditLog(productClient, {
    organizationId: params.organizationId ?? null,
    actorId: params.actorId,
    actorRole: params.actorRole ?? null,
    action: "data_product.created",
    resourceType: "data_product",
    resourceId: product.id,
    decision: PrivacyDecision.REQUIRE_REVIEW,
    reason: product.productType
  });

  return product;
}

export function generateSyntheticDataset(
  rows: Array<Record<string, unknown>>,
  outputFields: string[],
  rowCount = rows.length
) {
  return Array.from({ length: rowCount }).map((_, index) => {
    const seed = rows[index % Math.max(rows.length, 1)] ?? {};
    const nextRow: Record<string, unknown> = {};

    for (const fieldName of outputFields) {
      const value = seed[fieldName];

      if (typeof value === "number") {
        nextRow[fieldName] = Math.max(0, Math.round(value * (0.9 + ((index % 7) + 1) / 100)));
        continue;
      }

      if (typeof value === "string") {
        nextRow[fieldName] = `${fieldName}_synthetic_${index + 1}`;
        continue;
      }

      nextRow[fieldName] = value ?? null;
    }

    return nextRow;
  });
}

export async function buildDataProductExport(params: {
  organizationId?: string | null;
  actorId: string;
  actorRole?: string | null;
  buyerName: string;
  buyerEmail?: string | null;
  buyerHasContract: boolean;
  product: {
    id: string;
    productName: string;
    productType: DataProductType;
    outputFields: string[];
    minimumCohortSize: number;
    approvalStatus: ApprovalStatus;
    privacyRiskScore: number;
    requiresDpoApproval: boolean;
  };
  purposeId: string;
  cohortSize?: number | null;
  rows: Array<Record<string, unknown>>;
  client?: DataProductClient;
}) {
    let resolvedValue0: any;
  if (params.product.privacyRiskScore >= 90) {
    resolvedValue0 = PrivacyRiskLevel.CRITICAL;
  } else {
        let resolvedValue4: any;
    if (params.product.privacyRiskScore >= 70) {
      resolvedValue4 = PrivacyRiskLevel.HIGH;
    } else {
            let resolvedValue6: any;
      if (params.product.privacyRiskScore >= 40) {
        resolvedValue6 = PrivacyRiskLevel.MEDIUM;
      } else {
        resolvedValue6 = PrivacyRiskLevel.LOW;
      }
resolvedValue4 = resolvedValue6;
    }
resolvedValue0 = resolvedValue4;
  }
const evaluation = evaluatePrivacyRules({
    purposeId: params.purposeId,
    fieldNames: params.product.outputFields,
    productType: params.product.productType,
    isExternalSharing: true,
    buyerHasContract: params.buyerHasContract,
    cohortSize: params.cohortSize ?? null,
    minimumCohortSize: params.product.minimumCohortSize,
    privacyRiskLevel:
      resolvedValue0,
    requiresDpoApproval: params.product.requiresDpoApproval,
    approvalStatus: params.product.approvalStatus,
    allowAutoTransformation: true
  });

    let resolvedValue1: any;
  if (evaluation.decision === PrivacyDecision.ALLOW) {
    resolvedValue1 = params.rows;
  } else {
        let resolvedValue5: any;
    if (evaluation.decision === PrivacyDecision.BLOCK || evaluation.decision === PrivacyDecision.REQUIRE_REVIEW) {
      resolvedValue5 = [];
    } else {
      resolvedValue5 = transformRowsForPrivacy(
          params.rows,
          params.product.outputFields,
          params.product.minimumCohortSize
        );
    }
resolvedValue1 = resolvedValue5;
  }
const transformedRows =
    resolvedValue1;

    let resolvedValue2: any;
  if (params.product.productType === DataProductType.SYNTHETIC_DATASET) {
    resolvedValue2 = generateSyntheticDataset(transformedRows, evaluation.exportableFields);
  } else {
    resolvedValue2 = transformedRows;
  }
const exportRows =
    resolvedValue2;

  const manifest = {
    productId: params.product.id,
    productName: params.product.productName,
    buyerName: params.buyerName,
    buyerEmail: params.buyerEmail ?? null,
    decision: evaluation.decision,
    reason: evaluation.reason,
    outputFields: evaluation.exportableFields,
    blockedFields: evaluation.blockedFields,
    transformations: evaluation.transformations,
    generatedAt: new Date().toISOString(),
    reidentificationProhibited: true
  };

  const productClient = getDataProductClient(params.client);
    let resolvedValue3: any;
  if (params.buyerHasContract) {
    resolvedValue3 = new Date();
  } else {
    resolvedValue3 = null;
  }
const savedManifest = await productClient.dataExportManifest.create({
    data: {
      organizationId: params.organizationId ?? null,
      productId: params.product.id,
      requestedById: params.actorId,
      buyerName: params.buyerName,
      buyerEmail: params.buyerEmail ?? null,
      contractAcceptedAt: resolvedValue3,
      decision: evaluation.decision,
      reason: evaluation.reason,
      manifest
    }
  });

  await createPrivacyAuditLog(productClient, {
    organizationId: params.organizationId ?? null,
    actorId: params.actorId,
    actorRole: params.actorRole ?? null,
    action: "data_product.export_attempted",
    resourceType: "data_product",
    resourceId: params.product.id,
    decision: evaluation.decision,
    reason: evaluation.reason,
    metadata: manifest
  });

  return {
    evaluation,
    manifest: savedManifest,
    rows: exportRows
  };
}
