import {
  DataSubjectRequestStatus,
  DataSubjectRequestType,
  Prisma,
  PrismaClient,
  PrivacyDecision
} from "@prisma/client";

import { env } from "@/env";
import { db } from "@/lib/db";
import { createPrivacyAuditLog } from "@/lib/privacy/audit";

type RequestClient = PrismaClient | Prisma.TransactionClient;

function getRequestClient(client?: RequestClient) {
  return client ?? db;
}

function getDueDate() {
  return new Date(Date.now() + env.PRIVACY_REQUEST_DUE_DAYS * 24 * 60 * 60 * 1000);
}

export async function listUserDataSubjectRequests(userId: string, client?: RequestClient) {
  return getRequestClient(client).dataSubjectRequest.findMany({
    where: {
      userId
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}

export async function listAdminDataSubjectRequests(organizationId: string, client?: RequestClient) {
  return getRequestClient(client).dataSubjectRequest.findMany({
    where: {
      organizationId
    },
    include: {
      user: {
        select: {
          email: true,
          name: true
        }
      },
      handledBy: {
        select: {
          email: true,
          name: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}

export async function createDataSubjectRequest(params: {
  userId: string;
  organizationId?: string | null;
  actorRole?: string | null;
  requestType: DataSubjectRequestType;
  reason?: string | null;
  metadata?: Prisma.InputJsonValue;
  client?: RequestClient;
}) {
  const requestClient = getRequestClient(params.client);
  const request = await requestClient.dataSubjectRequest.create({
    data: {
      userId: params.userId,
      organizationId: params.organizationId ?? null,
      requestType: params.requestType,
      reason: params.reason ?? null,
      dueAt: getDueDate(),
      metadata: params.metadata
    }
  });

  await createPrivacyAuditLog(requestClient, {
    organizationId: params.organizationId ?? null,
    actorId: params.userId,
    actorRole: params.actorRole ?? null,
    action: "data_subject_request.created",
    resourceType: "data_subject_request",
    resourceId: request.id,
    decision: PrivacyDecision.ALLOW,
    reason: params.requestType,
    metadata: params.metadata
  });

  return request;
}

export async function reviewDataSubjectRequest(params: {
  requestId: string;
  organizationId?: string | null;
  handledById: string;
  actorRole?: string | null;
  status: DataSubjectRequestStatus;
  resolution?: string | null;
  client?: RequestClient;
}) {
  const requestClient = getRequestClient(params.client);
  const request = await requestClient.dataSubjectRequest.update({
    where: {
      id: params.requestId
    },
    data: {
      status: params.status,
      handledById: params.handledById,
      resolution: params.resolution ?? null,
      completedAt:
        params.status === DataSubjectRequestStatus.COMPLETED || params.status === DataSubjectRequestStatus.REJECTED
          ? new Date()
          : null
    }
  });

  await createPrivacyAuditLog(requestClient, {
    organizationId: params.organizationId ?? null,
    actorId: params.handledById,
    actorRole: params.actorRole ?? null,
    action: "data_subject_request.reviewed",
    resourceType: "data_subject_request",
    resourceId: request.id,
    decision: params.status === DataSubjectRequestStatus.REJECTED ? PrivacyDecision.BLOCK : PrivacyDecision.ALLOW,
    reason: params.resolution ?? params.status
  });

  return request;
}

export async function buildPersonalDataAccessPackage(userId: string, client?: RequestClient) {
  const requestClient = getRequestClient(client);
  const [user, consents, requests, memberships] = await Promise.all([
    requestClient.user.findUniqueOrThrow({
      where: {
        id: userId
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        preferredLanguage: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true
      }
    }),
    requestClient.userConsent.findMany({
      where: {
        userId
      },
      orderBy: {
        createdAt: "asc"
      }
    }),
    requestClient.dataSubjectRequest.findMany({
      where: {
        userId
      },
      orderBy: {
        createdAt: "asc"
      }
    }),
    requestClient.organizationMember.findMany({
      where: {
        userId
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      },
      orderBy: {
        joinedAt: "asc"
      }
    })
  ]);

  return {
    exportedAt: new Date().toISOString(),
    user,
    consents,
    dataSubjectRequests: requests,
    organizations: memberships.map((membership) => ({
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      role: membership.role,
      joinedAt: membership.joinedAt
    }))
  };
}

export async function getDeletionBlockReason(params: {
  userId: string;
  organizationId?: string | null;
  client?: RequestClient;
}) {
  const requestClient = getRequestClient(params.client);
  const legalHold = await requestClient.privacyLegalHold.findFirst({
    where: {
      active: true,
      OR: [
        {
          resourceType: "user",
          resourceId: params.userId
        },
        ...(params.organizationId
          ? [{
              resourceType: "organization",
              resourceId: params.organizationId
            }]
          : [])
      ]
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  if (!legalHold) {
    return null;
  }

  return `Deletion is blocked by legal hold: ${legalHold.reason}`;
}
