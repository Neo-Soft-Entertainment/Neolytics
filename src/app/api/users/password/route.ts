import { compare, hash } from "bcryptjs";
import { z } from "zod";

import { requireApiUser } from "@/lib/auth-helpers";
import { badRequest, ok, serverError, unauthorized } from "@/lib/api-response";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { parseJsonBody } from "@/lib/request";

const schema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8)
});

export async function PATCH(request: Request) {
  try {
    const session = await requireApiUser();

    if (!session?.user?.id) {
      return unauthorized();
    }

    const body = await parseJsonBody(request, schema);
    const user = await db.user.findUnique({
      where: {
        id: session.user.id
      },
      select: {
        passwordHash: true
      }
    });

    if (!user) {
      return unauthorized();
    }

    if (user.passwordHash) {
      const isCurrentPasswordValid = body.currentPassword
        ? await compare(body.currentPassword, user.passwordHash)
        : false;

      if (!isCurrentPasswordValid) {
        return badRequest("Current password is invalid.");
      }
    }

    await db.user.update({
      where: {
        id: session.user.id
      },
      data: {
        passwordHash: await hash(body.newPassword, 12),
        passwordChangedAt: new Date()
      }
    });

    return ok({ success: true });
  } catch (error) {
    logger.error({ error }, "Password update failed");

    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid password payload.");
    }

    return serverError("Unable to update password.");
  }
}
