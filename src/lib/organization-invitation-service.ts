import { OrganizationRole } from "@prisma/client";
import { randomBytes } from "crypto";

import { db } from "@/lib/db";
import { SubscriptionLimitError, enforceSubscriptionCapacity } from "@/lib/subscription-service";

export class OrganizationInvitationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrganizationInvitationError";
  }
}

function getInvitationExpiryDate() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  return expiresAt;
}

export async function createOrganizationInvitation(params: {
  organizationId: string;
  invitedById: string;
  email: string;
  role: OrganizationRole;
}) {
  const normalizedEmail = params.email.trim().toLowerCase();
  const existingMember = await db.organizationMember.findFirst({
    where: {
      organizationId: params.organizationId,
      user: {
        email: normalizedEmail
      }
    }
  });

  if (existingMember) {
    throw new OrganizationInvitationError("This user is already a member of the organization.");
  }

  const existingInvitation = await db.organizationInvitation.findFirst({
    where: {
      organizationId: params.organizationId,
      email: normalizedEmail,
      acceptedAt: null,
      revokedAt: null,
      expiresAt: {
        gt: new Date()
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  if (existingInvitation) {
    return existingInvitation;
  }

  await enforceSubscriptionCapacity(params.organizationId, "seats");

  return db.organizationInvitation.create({
    data: {
      organizationId: params.organizationId,
      invitedById: params.invitedById,
      email: normalizedEmail,
      role: params.role,
      token: randomBytes(24).toString("hex"),
      expiresAt: getInvitationExpiryDate()
    }
  });
}

export async function revokeOrganizationInvitation(params: {
  invitationId: string;
  organizationId: string;
}) {
  const invitation = await db.organizationInvitation.findFirst({
    where: {
      id: params.invitationId,
      organizationId: params.organizationId
    }
  });

  if (!invitation) {
    throw new OrganizationInvitationError("Invitation not found.");
  }

  if (invitation.acceptedAt) {
    throw new OrganizationInvitationError("Accepted invitations cannot be revoked.");
  }

  if (invitation.revokedAt) {
    return invitation;
  }

  return db.organizationInvitation.update({
    where: {
      id: invitation.id
    },
    data: {
      revokedAt: new Date()
    }
  });
}

export async function getOrganizationInvitationByToken(token: string) {
  return db.organizationInvitation.findUnique({
    where: {
      token
    },
    include: {
      organization: true,
      invitedBy: {
        select: {
          name: true,
          email: true
        }
      }
    }
  });
}

export async function acceptOrganizationInvitation(params: {
  token: string;
  userId: string;
  userEmail: string;
}) {
  const invitation = await db.organizationInvitation.findUnique({
    where: {
      token: params.token
    }
  });

  if (!invitation) {
    throw new OrganizationInvitationError("Invitation not found.");
  }

  if (invitation.revokedAt) {
    throw new OrganizationInvitationError("This invitation was revoked.");
  }

  if (invitation.acceptedAt) {
    return invitation;
  }

  if (invitation.expiresAt <= new Date()) {
    throw new OrganizationInvitationError("This invitation has expired.");
  }

  if (invitation.email !== params.userEmail.trim().toLowerCase()) {
    throw new OrganizationInvitationError("Sign in with the invited email address to accept this invitation.");
  }

  return db.$transaction(async (tx) => {
    const membership = await tx.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: invitation.organizationId,
          userId: params.userId
        }
      }
    });

    if (!membership) {
      await tx.organizationMember.create({
        data: {
          organizationId: invitation.organizationId,
          userId: params.userId,
          role: invitation.role
        }
      });
    }

    return tx.organizationInvitation.update({
      where: {
        id: invitation.id
      },
      data: {
        acceptedAt: new Date()
      }
    });
  });
}

export { SubscriptionLimitError };
