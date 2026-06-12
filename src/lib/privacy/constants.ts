export const DataClassification = {
  PUBLIC: "PUBLIC",
  INTERNAL: "INTERNAL",
  PERSONAL: "PERSONAL",
  SENSITIVE_PERSONAL: "SENSITIVE_PERSONAL",
  CHILD_OR_TEEN_DATA: "CHILD_OR_TEEN_DATA",
  PSEUDONYMOUS_IDENTIFIER: "PSEUDONYMOUS_IDENTIFIER",
  AGGREGATED: "AGGREGATED",
  ANONYMIZED: "ANONYMIZED",
  SYNTHETIC: "SYNTHETIC",
  BLOCKED_FOR_EXPORT: "BLOCKED_FOR_EXPORT"
} as const;

export type DataClassification = (typeof DataClassification)[keyof typeof DataClassification];

export const PrivacyLegalBasis = {
  CONSENT: "CONSENT",
  CONTRACT_EXECUTION: "CONTRACT_EXECUTION",
  LEGAL_OBLIGATION: "LEGAL_OBLIGATION",
  LEGITIMATE_INTEREST: "LEGITIMATE_INTEREST",
  EXERCISE_OF_RIGHTS: "EXERCISE_OF_RIGHTS",
  CREDIT_PROTECTION: "CREDIT_PROTECTION",
  HEALTH_PROTECTION: "HEALTH_PROTECTION",
  PUBLIC_POLICY: "PUBLIC_POLICY",
  RESEARCH: "RESEARCH",
  VITAL_INTEREST: "VITAL_INTEREST"
} as const;

export type PrivacyLegalBasis = (typeof PrivacyLegalBasis)[keyof typeof PrivacyLegalBasis];

export const PrivacyRiskLevel = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL"
} as const;

export type PrivacyRiskLevel = (typeof PrivacyRiskLevel)[keyof typeof PrivacyRiskLevel];
