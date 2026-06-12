import { Prisma, PrismaClient, PrivacyDecision } from "@prisma/client";

type PrivacyAuditClient = PrismaClient | Prisma.TransactionClient;

export async function createPrivacyAuditLog(
  db: PrivacyAuditClient,
  params: {
    organizationId?: string | null;
    actorId?: string | null;
    actorRole?: string | null;
    action: string;
    resourceType: string;
    resourceId?: string | null;
    decision?: PrivacyDecision | null;
    reason?: string | null;
    metadata?: Prisma.InputJsonValue;
  }
) {
  return db.privacyAuditLog.create({
    data: {
      organizationId: params.organizationId ?? null,
      actorId: params.actorId ?? null,
      actorRole: params.actorRole ?? null,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId ?? null,
      decision: params.decision ?? null,
      reason: params.reason ?? null,
      metadata: params.metadata
    }
  });
}
