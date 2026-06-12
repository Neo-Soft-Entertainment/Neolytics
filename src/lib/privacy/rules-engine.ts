import {
  ApprovalStatus,
  ConsentStatus,
  DataProductType,
  PrivacyDecision
} from "@prisma/client";

import { env } from "@/env";
import { DataClassification, PrivacyRiskLevel } from "@/lib/privacy/constants";
import { filterBlockedExportFields, getExportableFields, getFieldClassifications } from "@/lib/privacy/field-classification";
import { assertPurposeAllowsOperation, getProcessingPurpose } from "@/lib/privacy/processing-purposes";

const blockedProductTypes = new Set<DataProductType>([
  DataProductType.RAW_EVENTS,
  DataProductType.USER_LEVEL_PROFILES,
  DataProductType.PERSONAL_IDENTIFIER_LISTS,
  DataProductType.PSEUDONYMOUS_IDENTIFIER_EXPORT,
  DataProductType.SENSITIVE_DATA_EXPORT,
  DataProductType.CHILD_OR_TEEN_COMMERCIAL_PROFILING
]);

function getMinimumCohortSize(value?: number | null) {
  return Math.max(value ?? env.PRIVACY_MIN_COHORT_SIZE, env.PRIVACY_MIN_COHORT_SIZE);
}

function roundMetricValue(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return value;
  }

  if (Math.abs(value) >= 100) {
    return Math.round(value / 5) * 5;
  }

  return Math.round(value * 10) / 10;
}

function generalizeValue(fieldName: string, value: unknown) {
  if (value === null || value === undefined) {
    return value;
  }

  const normalized = fieldName.toLowerCase();

  if (normalized.includes("timestamp") || normalized.endsWith("_at")) {
    const date = new Date(String(value));

    if (!Number.isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }
  }

  if (normalized.includes("location") || normalized.includes("latitude") || normalized.includes("longitude")) {
    return undefined;
  }

  return roundMetricValue(value);
}

export type PrivacyRulesInput = {
  purposeId: string;
  fieldNames: string[];
  productType: DataProductType;
  isExternalSharing: boolean;
  consentStatus?: ConsentStatus | null;
  buyerHasContract: boolean;
  cohortSize?: number | null;
  minimumCohortSize?: number | null;
  retentionExpired?: boolean;
  containsSensitiveData?: boolean;
  containsMinorData?: boolean;
  privacyRiskLevel?: PrivacyRiskLevel;
  requiresDpoApproval?: boolean;
  approvalStatus?: ApprovalStatus | null;
  allowAutoTransformation?: boolean;
};

export type PrivacyRulesEvaluation = {
  decision: PrivacyDecision;
  reason: string;
  blockedFields: string[];
  exportableFields: string[];
  transformations: string[];
};

export function evaluatePrivacyRules(input: PrivacyRulesInput): PrivacyRulesEvaluation {
  const purpose = getProcessingPurpose(input.purposeId);

  if (!purpose) {
    return {
      decision: PrivacyDecision.BLOCK,
      reason: `Unknown processing purpose: ${input.purposeId}`,
      blockedFields: input.fieldNames,
      exportableFields: [],
      transformations: []
    };
  }

  try {
    assertPurposeAllowsOperation({
      purposeId: input.purposeId,
      isExternalSharing: input.isExternalSharing,
      isMonetization:
        input.isExternalSharing &&
        input.productType !== DataProductType.PARTNER_ACTIVATION_WITH_EXPLICIT_CONSENT
    });
  } catch (error) {
    return {
      decision: PrivacyDecision.BLOCK,
      reason: error instanceof Error ? error.message : "Purpose validation failed.",
      blockedFields: input.fieldNames,
      exportableFields: [],
      transformations: []
    };
  }

  if (blockedProductTypes.has(input.productType)) {
    return {
      decision: PrivacyDecision.BLOCK,
      reason: `Blocked product type: ${input.productType}`,
      blockedFields: input.fieldNames,
      exportableFields: [],
      transformations: []
    };
  }

  if (input.retentionExpired) {
    return {
      decision: PrivacyDecision.BLOCK,
      reason: "Data is past the allowed retention period.",
      blockedFields: input.fieldNames,
      exportableFields: [],
      transformations: []
    };
  }

  if (purpose.requiresExplicitConsent && input.consentStatus !== ConsentStatus.GRANTED) {
    return {
      decision: PrivacyDecision.BLOCK,
      reason: "Explicit consent is required and is not active.",
      blockedFields: input.fieldNames,
      exportableFields: [],
      transformations: []
    };
  }

  if (input.containsSensitiveData || purpose.dataCategories.includes(DataClassification.SENSITIVE_PERSONAL)) {
    return {
      decision: PrivacyDecision.BLOCK,
      reason: "Sensitive personal data cannot be shared or monetized.",
      blockedFields: input.fieldNames,
      exportableFields: [],
      transformations: []
    };
  }

  if (input.containsMinorData || purpose.dataCategories.includes(DataClassification.CHILD_OR_TEEN_DATA)) {
    return {
      decision: PrivacyDecision.BLOCK,
      reason: "Children or teen data cannot be commercially profiled or exported.",
      blockedFields: input.fieldNames,
      exportableFields: [],
      transformations: []
    };
  }

  if (input.isExternalSharing && !input.buyerHasContract) {
    return {
      decision: PrivacyDecision.BLOCK,
      reason: "Buyer contract acceptance is required before export.",
      blockedFields: input.fieldNames,
      exportableFields: [],
      transformations: []
    };
  }

  if (
    input.requiresDpoApproval &&
    input.approvalStatus !== ApprovalStatus.APPROVED &&
    (input.privacyRiskLevel === PrivacyRiskLevel.HIGH || input.privacyRiskLevel === PrivacyRiskLevel.CRITICAL)
  ) {
    return {
      decision: PrivacyDecision.REQUIRE_REVIEW,
      reason: "High-risk data products require DPO approval before export.",
      blockedFields: [],
      exportableFields: getExportableFields(input.fieldNames),
      transformations: []
    };
  }

  const blockedFields = filterBlockedExportFields(input.fieldNames);
  const exportableFields = getExportableFields(input.fieldNames);
  const transformations: string[] = [];

  if ((input.cohortSize ?? getMinimumCohortSize(input.minimumCohortSize)) < getMinimumCohortSize(input.minimumCohortSize)) {
    transformations.push("suppress_small_cohorts");
  }

  if (blockedFields.length > 0) {
    if (!input.allowAutoTransformation) {
      return {
        decision: PrivacyDecision.BLOCK,
        reason: `Blocked export fields present: ${blockedFields.join(", ")}`,
        blockedFields,
        exportableFields,
        transformations
      };
    }

    transformations.push("remove_forbidden_fields");
  }

  if (input.isExternalSharing) {
    transformations.push("generalize_dates");
    transformations.push("remove_precise_locations");
    transformations.push("round_or_noise_metrics");
  }

  return {
    decision: transformations.length > 0 ? PrivacyDecision.ALLOW_WITH_TRANSFORMATION : PrivacyDecision.ALLOW,
    reason: transformations.length > 0 ? "Export allowed after privacy transformations." : "Export allowed.",
    blockedFields,
    exportableFields,
    transformations
  };
}

export function transformRowsForPrivacy(
  rows: Array<Record<string, unknown>>,
  fieldNames: string[],
  minimumCohortSize?: number | null
) {
  const threshold = getMinimumCohortSize(minimumCohortSize);

  return rows.flatMap((row) => {
    if (typeof row.cohort_size === "number" && row.cohort_size < threshold) {
      return [];
    }

    const nextRow: Record<string, unknown> = {};

    for (const fieldName of fieldNames) {
      const classifications = getFieldClassifications(fieldName);

      if (!classifications) {
        continue;
      }

      if (
        classifications.includes(DataClassification.BLOCKED_FOR_EXPORT) ||
        classifications.includes(DataClassification.PERSONAL) ||
        classifications.includes(DataClassification.SENSITIVE_PERSONAL) ||
        classifications.includes(DataClassification.PSEUDONYMOUS_IDENTIFIER) ||
        classifications.includes(DataClassification.CHILD_OR_TEEN_DATA)
      ) {
        continue;
      }

      nextRow[fieldName] = generalizeValue(fieldName, row[fieldName]);
    }

    return [nextRow];
  });
}
