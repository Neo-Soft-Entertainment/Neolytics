import { hash } from "bcryptjs";
import { z } from "zod";

import { badRequest, ok, serverError } from "@/lib/api-response";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { createOrganizationForUser } from "@/lib/organization-service";
import { parseJsonBody } from "@/lib/request";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  organizationName: z.string().min(2),
  workspaceName: z.string().min(2)
});

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request, schema);
    const email = body.email.trim().toLowerCase();
    const existingUser = await db.user.findUnique({
      where: {
        email
      }
    });

    if (existingUser) {
      return badRequest("An account with this email already exists.");
    }

    const passwordHash = await hash(body.password, 12);
    const user = await db.user.create({
      data: {
        name: body.name.trim(),
        email,
        passwordHash
      }
    });
    const organizationContext = await createOrganizationForUser({
      userId: user.id,
      organizationName: body.organizationName,
      workspaceName: body.workspaceName
    });

    return ok({
      userId: user.id,
      organizationId: organizationContext.organization.id,
      workspaceId: organizationContext.workspace.id
    }, { status: 201 });
  } catch (error) {
    logger.error({ error }, "Signup failed");

    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid signup payload.");
    }

    return serverError("Unable to create account.");
  }
}
