import { Prisma, PrismaClient } from "@prisma/client";

type AuditClient = PrismaClient | Prisma.TransactionClient;

export async function createAuditEvent(
  db: AuditClient,
  params: {
    organizationId: string;
    userId?: string | null;
    entityType: string;
    entityId: string;
    action: string;
    metadata?: Prisma.InputJsonValue;
  }
) {
  return db.auditEvent.create({
    data: {
      organizationId: params.organizationId,
      userId: params.userId ?? null,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      metadata: params.metadata
    }
  });
}
