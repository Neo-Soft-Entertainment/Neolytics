import { ConsentStatus, Prisma, PrismaClient, PrivacyDecision } from "@prisma/client";

import { db } from "@/lib/db";
import { createPrivacyAuditLog } from "@/lib/privacy/audit";
import { hashPrivacyValue } from "@/lib/privacy/hash";
import { getProcessingPurpose, listProcessingPurposes } from "@/lib/privacy/processing-purposes";

type ConsentClient = PrismaClient | Prisma.TransactionClient;

function getConsentClient(client?: ConsentClient) {
  return client ?? db;
}

export async function listUserConsentState(userId: string, client?: ConsentClient) {
  const consentClient = getConsentClient(client);
  const records = await consentClient.userConsent.findMany({
    where: {
      userId
    },
    orderBy: {
      updatedAt: "desc"
    }
  });

  const byPurposeId = new Map(records.map((record) => [record.purposeId, record]));

  return listProcessingPurposes()
    .filter((purpose) => purpose.requiresExplicitConsent)
    .map((purpose) => ({
      purpose,
      consent: byPurposeId.get(purpose.purposeId) ?? null
    }));
}

export async function getConsentStatus(userId: string, purposeId: string, client?: ConsentClient) {
  const consentClient = getConsentClient(client);
  const consent = await consentClient.userConsent.findUnique({
    where: {
      userId_purposeId: {
        userId,
        purposeId
      }
    }
  });

  return consent?.status ?? null;
}

export async function grantConsent(params: {
  userId: string;
  purposeId: string;
  consentTextVersion: string;
  source: string;
  organizationId?: string | null;
  actorRole?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  client?: ConsentClient;
}) {
  const purpose = getProcessingPurpose(params.purposeId);

  if (!purpose) {
    throw new Error(`Unknown processing purpose: ${params.purposeId}`);
  }

  if (!purpose.requiresExplicitConsent) {
    throw new Error("This purpose does not require optional consent.");
  }

  const consentClient = getConsentClient(params.client);
  const consent = await consentClient.userConsent.upsert({
    where: {
      userId_purposeId: {
        userId: params.userId,
        purposeId: params.purposeId
      }
    },
    create: {
      userId: params.userId,
      purposeId: params.purposeId,
      consentTextVersion: params.consentTextVersion,
      status: ConsentStatus.GRANTED,
      grantedAt: new Date(),
      source: params.source,
      ipHash: params.ipAddress ? hashPrivacyValue(params.ipAddress) : null,
      userAgentHash: params.userAgent ? hashPrivacyValue(params.userAgent) : null
    },
    update: {
      consentTextVersion: params.consentTextVersion,
      status: ConsentStatus.GRANTED,
      grantedAt: new Date(),
      revokedAt: null,
      source: params.source,
      ipHash: params.ipAddress ? hashPrivacyValue(params.ipAddress) : null,
      userAgentHash: params.userAgent ? hashPrivacyValue(params.userAgent) : null
    }
  });

  await createPrivacyAuditLog(consentClient, {
    organizationId: params.organizationId ?? null,
    actorId: params.userId,
    actorRole: params.actorRole ?? null,
    action: "consent.granted",
    resourceType: "user_consent",
    resourceId: consent.id,
    decision: PrivacyDecision.ALLOW,
    reason: purpose.purposeName,
    metadata: {
      purposeId: params.purposeId,
      consentTextVersion: params.consentTextVersion,
      source: params.source
    }
  });

  return consent;
}

export async function revokeConsent(params: {
  userId: string;
  purposeId: string;
  organizationId?: string | null;
  actorRole?: string | null;
  source: string;
  client?: ConsentClient;
}) {
  const consentClient = getConsentClient(params.client);
  const consent = await consentClient.userConsent.update({
    where: {
      userId_purposeId: {
        userId: params.userId,
        purposeId: params.purposeId
      }
    },
    data: {
      status: ConsentStatus.REVOKED,
      revokedAt: new Date(),
      source: params.source
    }
  });

  await createPrivacyAuditLog(consentClient, {
    organizationId: params.organizationId ?? null,
    actorId: params.userId,
    actorRole: params.actorRole ?? null,
    action: "consent.revoked",
    resourceType: "user_consent",
    resourceId: consent.id,
    decision: PrivacyDecision.BLOCK,
    reason: params.purposeId,
    metadata: {
      purposeId: params.purposeId,
      source: params.source
    }
  });

  return consent;
}

export async function downloadConsentHistory(userId: string, client?: ConsentClient) {
  const consentClient = getConsentClient(client);
  const [consents, auditLogs] = await Promise.all([
    consentClient.userConsent.findMany({
      where: {
        userId
      },
      orderBy: {
        createdAt: "asc"
      }
    }),
    consentClient.privacyAuditLog.findMany({
      where: {
        actorId: userId,
        resourceType: "user_consent"
      },
      orderBy: {
        createdAt: "asc"
      }
    })
  ]);

  return {
    consents,
    auditLogs
  };
}
