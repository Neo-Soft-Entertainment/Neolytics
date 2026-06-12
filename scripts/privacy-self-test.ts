import { ApprovalStatus, ConsentStatus, DataProductType, PrivacyDecision } from "@prisma/client";

import { DataClassification, PrivacyRiskLevel } from "../src/lib/privacy/constants";
import {
  assertExportableFields,
  filterBlockedExportFields,
  validateFieldClassificationRegistry
} from "../src/lib/privacy/field-classification";
import { buildIncidentNotificationReport } from "../src/lib/privacy/incident-service";
import { getProcessingPurpose, validateProcessingPurpose } from "../src/lib/privacy/processing-purposes";
import { generateSyntheticDataset } from "../src/lib/privacy/data-product-service";
import { isRetentionExpired } from "../src/lib/privacy/retention-policies";
import { evaluatePrivacyRules, transformRowsForPrivacy } from "../src/lib/privacy/rules-engine";

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function expectThrow(fn: () => void, message: string) {
  let threw = false;

  try {
    fn();
  } catch {
    threw = true;
  }

  assert(threw, message);
}

async function main() {
  const fieldValidation = validateFieldClassificationRegistry([
    "email",
    "weekly_region_segment_metrics",
    "generated_market_dataset"
  ]);
  assert(fieldValidation.valid, "Known privacy fields should be classified.");

  expectThrow(
    () => assertExportableFields(["email", "weekly_region_segment_metrics"]),
    "Personal fields must never pass export validation."
  );

  const blockedFields = filterBlockedExportFields(["email", "user_id", "weekly_region_segment_metrics"]);
  assert(blockedFields.includes("email"), "Email must be blocked for export.");
  assert(blockedFields.includes("user_id"), "Pseudonymous identifiers must be blocked for export.");

  const aggregatedPurpose = getProcessingPurpose("aggregated_market_intelligence");
  assert(aggregatedPurpose, "Aggregated market intelligence purpose must exist.");
  assert(validateProcessingPurpose(aggregatedPurpose!).valid, "Aggregated monetization purpose should be valid.");

  const partnerPurpose = getProcessingPurpose("optional_partner_activation");
  assert(partnerPurpose?.requiresExplicitConsent, "Partner activation must require explicit consent.");
  assert(!partnerPurpose?.allowsDataMonetization, "Partner activation must not enable raw data monetization.");

  const allowedEvaluation = evaluatePrivacyRules({
    purposeId: "aggregated_market_intelligence",
    fieldNames: ["weekly_region_segment_metrics", "revenue"],
    productType: DataProductType.AGGREGATED_INSIGHTS,
    isExternalSharing: true,
    buyerHasContract: true,
    cohortSize: 240,
    minimumCohortSize: 100,
    approvalStatus: ApprovalStatus.APPROVED,
    requiresDpoApproval: false,
    privacyRiskLevel: PrivacyRiskLevel.MEDIUM
  });
  assert(allowedEvaluation.decision === PrivacyDecision.ALLOW_WITH_TRANSFORMATION, "Aggregated exports should be allowed with privacy transformations.");

  const rawEventsBlocked = evaluatePrivacyRules({
    purposeId: "aggregated_market_intelligence",
    fieldNames: ["event_id", "weekly_region_segment_metrics"],
    productType: DataProductType.RAW_EVENTS,
    isExternalSharing: true,
    buyerHasContract: true,
    approvalStatus: ApprovalStatus.APPROVED,
    requiresDpoApproval: false,
    privacyRiskLevel: PrivacyRiskLevel.MEDIUM
  });
  assert(rawEventsBlocked.decision === PrivacyDecision.BLOCK, "Raw events must be blocked.");

  const revokedConsentBlocked = evaluatePrivacyRules({
    purposeId: "optional_partner_activation",
    fieldNames: ["weekly_region_segment_metrics"],
    productType: DataProductType.PARTNER_ACTIVATION_WITH_EXPLICIT_CONSENT,
    isExternalSharing: true,
    buyerHasContract: true,
    consentStatus: ConsentStatus.REVOKED,
    approvalStatus: ApprovalStatus.APPROVED,
    requiresDpoApproval: false,
    privacyRiskLevel: PrivacyRiskLevel.HIGH
  });
  assert(revokedConsentBlocked.decision === PrivacyDecision.BLOCK, "Revoked consent must block further processing.");

  const smallCohortNeedsSuppression = evaluatePrivacyRules({
    purposeId: "aggregated_market_intelligence",
    fieldNames: ["weekly_region_segment_metrics", "revenue"],
    productType: DataProductType.COHORT_REPORT,
    isExternalSharing: true,
    buyerHasContract: true,
    cohortSize: 12,
    minimumCohortSize: 100,
    approvalStatus: ApprovalStatus.APPROVED,
    requiresDpoApproval: false,
    privacyRiskLevel: PrivacyRiskLevel.MEDIUM
  });
  assert(
    smallCohortNeedsSuppression.transformations.includes("suppress_small_cohorts"),
    "Small cohorts must be suppressed."
  );

  const noContractBlocked = evaluatePrivacyRules({
    purposeId: "aggregated_market_intelligence",
    fieldNames: ["weekly_region_segment_metrics"],
    productType: DataProductType.AGGREGATED_INSIGHTS,
    isExternalSharing: true,
    buyerHasContract: false,
    approvalStatus: ApprovalStatus.APPROVED,
    requiresDpoApproval: false,
    privacyRiskLevel: PrivacyRiskLevel.MEDIUM
  });
  assert(noContractBlocked.decision === PrivacyDecision.BLOCK, "Exports without buyer contract must be blocked.");

  const dpoReviewRequired = evaluatePrivacyRules({
    purposeId: "aggregated_market_intelligence",
    fieldNames: ["weekly_region_segment_metrics"],
    productType: DataProductType.AGGREGATED_INSIGHTS,
    isExternalSharing: true,
    buyerHasContract: true,
    approvalStatus: ApprovalStatus.PENDING,
    requiresDpoApproval: true,
    privacyRiskLevel: PrivacyRiskLevel.HIGH
  });
  assert(dpoReviewRequired.decision === PrivacyDecision.REQUIRE_REVIEW, "High-risk products must require DPO review.");

  const transformedRows = transformRowsForPrivacy(
    [{
      email: "user@example.com",
      user_id: "usr_123",
      exact_location: "Street 1",
      timestamp: "2026-06-12T10:00:00.000Z",
      revenue: 153.44,
      cohort_size: 130,
      weekly_region_segment_metrics: "North"
    }],
    ["email", "user_id", "exact_location", "timestamp", "revenue", "weekly_region_segment_metrics"],
    100
  );
  assert(!("email" in transformedRows[0]), "Transformed exports must remove personal fields.");
  assert(!("user_id" in transformedRows[0]), "Transformed exports must remove pseudonymous identifiers.");
  assert(transformedRows[0].timestamp === "2026-06-12", "Timestamps must be generalized.");
  assert(transformedRows[0].revenue === 155, "Metrics should be rounded for export.");

  const syntheticRows = generateSyntheticDataset(
    [{ installs: 1000, segment: "cozy" }],
    ["installs", "segment"],
    3
  );
  assert(syntheticRows.length === 3, "Synthetic dataset generator must return the requested row count.");
  assert(typeof syntheticRows[1].segment === "string", "Synthetic string fields must be generated.");

  const retentionExpired = isRetentionExpired(new Date("2020-01-01T00:00:00.000Z"), 365, new Date("2026-01-01T00:00:00.000Z"));
  assert(retentionExpired, "Retention policy helper must detect expired records.");

  const incidentReport = buildIncidentNotificationReport({
    incidentId: "inc_1",
    severity: "HIGH",
    affectedDataCategories: [DataClassification.PERSONAL],
    affectedUserCountEstimate: 12,
    discoveredAt: new Date("2026-06-12T12:00:00.000Z"),
    containedAt: new Date("2026-06-12T13:00:00.000Z"),
    rootCause: "Access control gap",
    mitigationSteps: "Rotated credentials and limited access",
    requiresAuthorityNotification: true,
    requiresUserNotification: true,
    status: "CONTAINED"
  });
  assert(incidentReport.requiresAuthorityNotification, "Incident reports must expose authority notification requirements.");

  console.log("Privacy self-test passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
