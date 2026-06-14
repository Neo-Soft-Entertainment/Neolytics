import { OrganizationRole } from "@prisma/client";

import { requireApiUser } from "@/lib/auth-helpers";
import { badRequest, ok, serverError, unauthorized } from "@/lib/api-response";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function DELETE() {
  try {
    const session = await requireApiUser();

    if (!session?.user?.id) {
      return unauthorized();
    }

    const ownerMemberships = await db.organizationMember.findMany({
      where: {
        userId: session.user.id,
        role: OrganizationRole.OWNER
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    const soleOwnerOrganizations: string[] = [];

    for (const membership of ownerMemberships) {
      const otherOwners = await db.organizationMember.count({
        where: {
          organizationId: membership.organizationId,
          role: OrganizationRole.OWNER,
          userId: {
            not: session.user.id
          }
        }
      });

      if (otherOwners === 0) {
        soleOwnerOrganizations.push(membership.organization.name);
      }
    }

    if (soleOwnerOrganizations.length > 0) {
      return badRequest(`Transfer ownership or delete these organizations first: ${soleOwnerOrganizations.join(", ")}.`);
    }

    await db.$transaction([
      db.account.deleteMany({
        where: {
          userId: session.user.id
        }
      }),
      db.session.deleteMany({
        where: {
          userId: session.user.id
        }
      }),
      db.communityPostLike.deleteMany({
        where: {
          userId: session.user.id
        }
      }),
      db.organizationMember.deleteMany({
        where: {
          userId: session.user.id
        }
      }),
      db.user.update({
        where: {
          id: session.user.id
        },
        data: {
          name: "Deleted account",
          email: `deleted-${session.user.id}@deleted.neolytics.local`,
          emailVerified: null,
          image: null,
          passwordHash: null,
          passwordChangedAt: new Date(),
          preferredLanguage: "en"
        }
      })
    ]);

    return ok({ success: true });
  } catch (error) {
    logger.error({ error }, "Account deletion failed");
    return serverError("Não foi possível excluir a conta.");
  }
}
