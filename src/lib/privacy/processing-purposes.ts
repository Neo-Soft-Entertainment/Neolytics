import { DataClassification, PrivacyLegalBasis, PrivacyRiskLevel } from "@/lib/privacy/constants";

export type ProcessingPurposeDefinition = {
  purposeId: string;
  purposeName: string;
  description: string;
  dataCategories: DataClassification[];
  legalBasis: PrivacyLegalBasis;
  retentionPeriodDays: number;
  isExternalSharingAllowed: boolean;
  requiresExplicitConsent: boolean;
  allowsDataMonetization: boolean;
  riskLevel: PrivacyRiskLevel;
};

export const processingPurposes: ProcessingPurposeDefinition[] = [
  {
    purposeId: "account_authentication",
    purposeName: "Account authentication",
    description: "Authenticate users and protect account access.",
    dataCategories: [DataClassification.PERSONAL, DataClassification.PSEUDONYMOUS_IDENTIFIER],
    legalBasis: PrivacyLegalBasis.CONTRACT_EXECUTION,
    retentionPeriodDays: 3650,
    isExternalSharingAllowed: false,
    requiresExplicitConsent: false,
    allowsDataMonetization: false,
    riskLevel: PrivacyRiskLevel.HIGH
  },
  {
    purposeId: "workspace_operations",
    purposeName: "Workspace operations",
    description: "Operate organizations, workspaces, reports, and core SaaS features.",
    dataCategories: [DataClassification.PERSONAL, DataClassification.INTERNAL],
    legalBasis: PrivacyLegalBasis.CONTRACT_EXECUTION,
    retentionPeriodDays: 3650,
    isExternalSharingAllowed: false,
    requiresExplicitConsent: false,
    allowsDataMonetization: false,
    riskLevel: PrivacyRiskLevel.MEDIUM
  },
  {
    purposeId: "security_monitoring",
    purposeName: "Security monitoring",
    description: "Protect accounts, services, and investigate abuse or fraud.",
    dataCategories: [DataClassification.PSEUDONYMOUS_IDENTIFIER, DataClassification.INTERNAL],
    legalBasis: PrivacyLegalBasis.LEGITIMATE_INTEREST,
    retentionPeriodDays: 730,
    isExternalSharingAllowed: false,
    requiresExplicitConsent: false,
    allowsDataMonetization: false,
    riskLevel: PrivacyRiskLevel.HIGH
  },
  {
    purposeId: "privacy_request_handling",
    purposeName: "Privacy request handling",
    description: "Process LGPD data subject rights and compliance operations.",
    dataCategories: [DataClassification.PERSONAL, DataClassification.INTERNAL],
    legalBasis: PrivacyLegalBasis.LEGAL_OBLIGATION,
    retentionPeriodDays: 1825,
    isExternalSharingAllowed: false,
    requiresExplicitConsent: false,
    allowsDataMonetization: false,
    riskLevel: PrivacyRiskLevel.HIGH
  },
  {
    purposeId: "optional_partner_activation",
    purposeName: "Optional partner activation",
    description: "Activate partner campaigns only when the user grants explicit, revocable consent.",
    dataCategories: [DataClassification.PERSONAL],
    legalBasis: PrivacyLegalBasis.CONSENT,
    retentionPeriodDays: 365,
    isExternalSharingAllowed: true,
    requiresExplicitConsent: true,
    allowsDataMonetization: false,
    riskLevel: PrivacyRiskLevel.CRITICAL
  },
  {
    purposeId: "aggregated_market_intelligence",
    purposeName: "Aggregated market intelligence",
    description: "Produce monetizable aggregated market insights without personal data.",
    dataCategories: [DataClassification.AGGREGATED],
    legalBasis: PrivacyLegalBasis.LEGITIMATE_INTEREST,
    retentionPeriodDays: 1095,
    isExternalSharingAllowed: true,
    requiresExplicitConsent: false,
    allowsDataMonetization: true,
    riskLevel: PrivacyRiskLevel.MEDIUM
  },
  {
    purposeId: "anonymized_statistics_products",
    purposeName: "Anonymized statistics products",
    description: "Produce anonymized statistical outputs for analytics products.",
    dataCategories: [DataClassification.ANONYMIZED],
    legalBasis: PrivacyLegalBasis.LEGITIMATE_INTEREST,
    retentionPeriodDays: 1095,
    isExternalSharingAllowed: true,
    requiresExplicitConsent: false,
    allowsDataMonetization: true,
    riskLevel: PrivacyRiskLevel.MEDIUM
  },
  {
    purposeId: "synthetic_dataset_generation",
    purposeName: "Synthetic dataset generation",
    description: "Generate synthetic datasets derived from approved aggregated patterns.",
    dataCategories: [DataClassification.SYNTHETIC, DataClassification.AGGREGATED],
    legalBasis: PrivacyLegalBasis.RESEARCH,
    retentionPeriodDays: 1095,
    isExternalSharingAllowed: true,
    requiresExplicitConsent: false,
    allowsDataMonetization: true,
    riskLevel: PrivacyRiskLevel.MEDIUM
  }
];

export function listProcessingPurposes() {
  return processingPurposes;
}

export function getProcessingPurpose(purposeId: string) {
  return processingPurposes.find((purpose) => purpose.purposeId === purposeId) ?? null;
}

export function validateProcessingPurpose(purpose: ProcessingPurposeDefinition) {
  if (!purpose.allowsDataMonetization) {
    return { valid: true, reason: null };
  }

  if (purpose.dataCategories.includes(DataClassification.SENSITIVE_PERSONAL)) {
    return { valid: false, reason: "Sensitive personal data can never be monetized." };
  }

  if (purpose.dataCategories.includes(DataClassification.CHILD_OR_TEEN_DATA)) {
    return { valid: false, reason: "Children and teen data can never be monetized." };
  }

  if (
    purpose.isExternalSharingAllowed &&
    purpose.dataCategories.some((category) =>
      category === DataClassification.PERSONAL ||
      category === DataClassification.PSEUDONYMOUS_IDENTIFIER
    )
  ) {
    return { valid: false, reason: "External monetization of personal or pseudonymous data is blocked." };
  }

  return { valid: true, reason: null };
}

export function assertPurposeAllowsOperation(params: {
  purposeId: string;
  isExternalSharing: boolean;
  isMonetization: boolean;
}) {
  const purpose = getProcessingPurpose(params.purposeId);

  if (!purpose) {
    throw new Error(`Unknown processing purpose: ${params.purposeId}`);
  }

  const validation = validateProcessingPurpose(purpose);

  if (!validation.valid) {
    throw new Error(validation.reason ?? "Invalid processing purpose.");
  }

  if (params.isExternalSharing && !purpose.isExternalSharingAllowed) {
    throw new Error(`Purpose ${purpose.purposeId} does not allow external sharing.`);
  }

  if (params.isMonetization && !purpose.allowsDataMonetization) {
    throw new Error(`Purpose ${purpose.purposeId} does not allow monetization.`);
  }

  return purpose;
}
