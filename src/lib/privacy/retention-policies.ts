import { RetentionDeletionStrategy } from "@prisma/client";

export type RetentionPolicy = {
  key: string;
  tableName: string;
  owner: string;
  purposeId: string;
  retentionPeriodDays: number;
  deletionStrategy: RetentionDeletionStrategy;
  legalHoldSupported: boolean;
};

export const retentionPolicies: RetentionPolicy[] = [
  {
    key: "user_consent",
    tableName: "UserConsent",
    owner: "privacy",
    purposeId: "privacy_request_handling",
    retentionPeriodDays: 1825,
    deletionStrategy: RetentionDeletionStrategy.ARCHIVE,
    legalHoldSupported: true
  },
  {
    key: "data_subject_request",
    tableName: "DataSubjectRequest",
    owner: "privacy",
    purposeId: "privacy_request_handling",
    retentionPeriodDays: 1825,
    deletionStrategy: RetentionDeletionStrategy.ARCHIVE,
    legalHoldSupported: true
  },
  {
    key: "privacy_incident",
    tableName: "PrivacyIncident",
    owner: "security",
    purposeId: "security_monitoring",
    retentionPeriodDays: 2555,
    deletionStrategy: RetentionDeletionStrategy.ARCHIVE,
    legalHoldSupported: true
  },
  {
    key: "data_export_manifest",
    tableName: "DataExportManifest",
    owner: "data",
    purposeId: "aggregated_market_intelligence",
    retentionPeriodDays: 1825,
    deletionStrategy: RetentionDeletionStrategy.BLOCK,
    legalHoldSupported: true
  }
];

export function getRetentionPolicy(key: string) {
  return retentionPolicies.find((policy) => policy.key === key) ?? null;
}

export function isRetentionExpired(createdAt: Date, retentionPeriodDays: number, now = new Date()) {
  return createdAt.getTime() + retentionPeriodDays * 24 * 60 * 60 * 1000 <= now.getTime();
}
