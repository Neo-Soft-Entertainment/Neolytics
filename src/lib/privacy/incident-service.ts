import { PrivacyIncidentStatus } from "@prisma/client";

export function buildIncidentNotificationReport(params: {
  incidentId: string;
  severity: string;
  affectedDataCategories: string[];
  affectedUserCountEstimate?: number | null;
  discoveredAt: Date;
  containedAt?: Date | null;
  rootCause?: string | null;
  mitigationSteps?: string | null;
  requiresAuthorityNotification: boolean;
  requiresUserNotification: boolean;
  status: PrivacyIncidentStatus;
}) {
  return {
    incidentId: params.incidentId,
    severity: params.severity,
    status: params.status,
    affectedDataCategories: params.affectedDataCategories,
    affectedUserCountEstimate: params.affectedUserCountEstimate ?? null,
    discoveredAt: params.discoveredAt.toISOString(),
    containedAt: params.containedAt?.toISOString() ?? null,
    rootCause: params.rootCause ?? null,
    mitigationSteps: params.mitigationSteps ?? null,
    requiresAuthorityNotification: params.requiresAuthorityNotification,
    requiresUserNotification: params.requiresUserNotification
  };
}
