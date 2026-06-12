import { ConsentStatus, DataSubjectRequestStatus, Prisma, PrivacyDecision, PrismaClient } from "@prisma/client";

import { db } from "@/lib/db";
import { createPrivacyAuditLog } from "@/lib/privacy/audit";
import { getRetentionPolicy, isRetentionExpired, retentionPolicies } from "@/lib/privacy/retention-policies";

type RetentionClient = PrismaClient | Prisma.TransactionClient;

function getRetentionClient(client?: RetentionClient) {
  return client ?? db;
}

export async function runPrivacyRetentionJob(params?: {
  organizationId?: string | null;
  actorId?: string | null;
  actorRole?: string | null;
  now?: Date;
  client?: RetentionClient;
}) {
  const retentionClient = getRetentionClient(params?.client);
  const now = params?.now ?? new Date();

  const expiredConsents = await retentionClient.userConsent.findMany({
    where: {
      status: ConsentStatus.GRANTED,
      expiresAt: {
        lte: now
      }
    }
  });

  for (const consent of expiredConsents) {
    await retentionClient.userConsent.update({
      where: {
        id: consent.id
      },
      data: {
        status: ConsentStatus.EXPIRED
      }
    });

    await createPrivacyAuditLog(retentionClient, {
      organizationId: params?.organizationId ?? null,
      actorId: params?.actorId ?? null,
      actorRole: params?.actorRole ?? "system",
      action: "retention.consent_expired",
      resourceType: "user_consent",
      resourceId: consent.id,
      decision: PrivacyDecision.BLOCK,
      reason: "Optional consent expired."
    });
  }

  const requestPolicy = getRetentionPolicy("data_subject_request");
  const completedRequests = await retentionClient.dataSubjectRequest.findMany({
    where: {
      status: {
        in: [DataSubjectRequestStatus.COMPLETED, DataSubjectRequestStatus.REJECTED]
      }
    }
  });

  for (const request of completedRequests) {
    if (!requestPolicy || !isRetentionExpired(request.createdAt, requestPolicy.retentionPeriodDays, now)) {
      continue;
    }

    const legalHold = await retentionClient.privacyLegalHold.findFirst({
      where: {
        active: true,
        resourceType: "data_subject_request",
        resourceId: request.id
      }
    });

    if (legalHold) {
      continue;
    }

    await createPrivacyAuditLog(retentionClient, {
      organizationId: request.organizationId ?? null,
      actorId: params?.actorId ?? null,
      actorRole: params?.actorRole ?? "system",
      action: "retention.request_archived",
      resourceType: "data_subject_request",
      resourceId: request.id,
      decision: PrivacyDecision.ALLOW,
      reason: "Completed request reached retention threshold."
    });
  }

  return {
    executedAt: now.toISOString(),
    expiredConsents: expiredConsents.length,
    retentionPoliciesChecked: retentionPolicies.length
  };
}
