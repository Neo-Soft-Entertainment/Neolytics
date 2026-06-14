import { OrganizationPermission, OrganizationRole } from "@prisma/client";
import { createHash, randomBytes } from "crypto";

import { db } from "@/lib/db";
import { notifyOrganizationDiscordWebhook } from "@/lib/discord";
import { organizationPermissionOptions } from "@/lib/organization-permissions";
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

function createInvitationToken() {
  return randomBytes(32).toString("base64url");
}

function hashInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function isHashedInvitationToken(token: string) {
  return /^[a-f0-9]{64}$/i.test(token);
}

function normalizePermissions(permissions: OrganizationPermission[] = []) {
  const allowedPermissions = new Set(organizationPermissionOptions.map((option) => option.value));
  return [...new Set(permissions)].filter((permission) => allowedPermissions.has(permission));
}

export async function createOrganizationInvitation(params: {
  organizationId: string;
  invitedById: string;
  email: string;
  role: OrganizationRole;
  permissions?: OrganizationPermission[];
}) {
  const normalizedEmail = params.email.trim().toLowerCase();
  const permissions = normalizePermissions(params.permissions);
  const existingMember = await db.organizationMember.findFirst({
    where: {
      organizationId: params.organizationId,
      user: {
        email: normalizedEmail
      }
    }
  });

  if (existingMember) {
    throw new OrganizationInvitationError("Este usuário já é membro da organização.");
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
    if (isHashedInvitationToken(existingInvitation.token)) {
      throw new OrganizationInvitationError("Este e-mail já tem um convite pendente. Revogue o convite e crie um novo link.");
    }

    return existingInvitation;
  }

  await enforceSubscriptionCapacity(params.organizationId, "seats");

  const token = createInvitationToken();
  const invitation = await db.organizationInvitation.create({
    data: {
      organizationId: params.organizationId,
      invitedById: params.invitedById,
      email: normalizedEmail,
      role: params.role,
      permissions,
      token: hashInvitationToken(token),
      expiresAt: getInvitationExpiryDate()
    }
  });

  await notifyOrganizationDiscordWebhook(params.organizationId, {
    content: `Novo convite de organização da Neolytics criado para **${normalizedEmail}**.`,
    embeds: [
      {
        title: "Convite de organização criado",
        description: `${normalizedEmail} foi convidado como ${params.role} com ${permissions.length} permissões personalizadas.`,
        color: 5814783,
        timestamp: new Date().toISOString()
      }
    ]
  });

  return {
    ...invitation,
    token
  };
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
    throw new OrganizationInvitationError("Convite não encontrado.");
  }

  if (invitation.acceptedAt) {
    throw new OrganizationInvitationError("Convites aceitos não podem ser revogados.");
  }

  if (invitation.revokedAt) {
    return invitation;
  }

  const revokedInvitation = await db.organizationInvitation.update({
    where: {
      id: invitation.id
    },
    data: {
      revokedAt: new Date()
    }
  });

  await notifyOrganizationDiscordWebhook(params.organizationId, {
    content: `Um convite de organização para **${invitation.email}** foi revogado.`,
    embeds: [
      {
        title: "Convite de organização revogado",
        description: `${invitation.email} não pode mais entrar com o link de convite anterior.`,
        color: 15158332,
        timestamp: new Date().toISOString()
      }
    ]
  });

  return revokedInvitation;
}

export async function getOrganizationInvitationByToken(token: string) {
  const invitation = await db.organizationInvitation.findFirst({
    where: {
      OR: [
        {
          token
        },
        {
          token: hashInvitationToken(token)
        }
      ]
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

  if (invitation && invitation.token === token) {
    await db.organizationInvitation.update({
      where: {
        id: invitation.id
      },
      data: {
        token: hashInvitationToken(token)
      }
    });
  }

  return invitation;
}

export async function acceptOrganizationInvitation(params: {
  token: string;
  userId: string;
  userEmail: string;
}) {
  const invitation = await db.organizationInvitation.findFirst({
    where: {
      OR: [
        {
          token: params.token
        },
        {
          token: hashInvitationToken(params.token)
        }
      ]
    }
  });

  if (!invitation) {
    throw new OrganizationInvitationError("Convite não encontrado.");
  }

  if (invitation.revokedAt) {
    throw new OrganizationInvitationError("Este convite foi revogado.");
  }

  if (invitation.acceptedAt) {
    return invitation;
  }

  if (invitation.expiresAt <= new Date()) {
    throw new OrganizationInvitationError("Este convite expirou.");
  }

  if (invitation.email !== params.userEmail.trim().toLowerCase()) {
    throw new OrganizationInvitationError("Entre com o e-mail convidado para aceitar este convite.");
  }

  const acceptedInvitation = await db.$transaction(async (tx) => {
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
          role: invitation.role,
          permissions: invitation.permissions
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

  await notifyOrganizationDiscordWebhook(invitation.organizationId, {
    content: `**${params.userEmail.trim().toLowerCase()}** entrou na organização por convite.`,
    embeds: [
      {
        title: "Convite aceito",
        description: `${params.userEmail.trim().toLowerCase()} aceitou um convite ${invitation.role}.`,
        color: 5763719,
        timestamp: new Date().toISOString()
      }
    ]
  });

  return acceptedInvitation;
}

export { SubscriptionLimitError };
