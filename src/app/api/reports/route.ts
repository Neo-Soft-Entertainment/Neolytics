import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { canWriteOrganization } from "@/lib/authorization";
import { db } from "@/lib/db";
import { parseJsonBody } from "@/lib/request";
import { SubscriptionLimitError } from "@/lib/subscription-service";
import { generateBasicMarketReport } from "@/lib/workspace-service";

const schema = z.object({
  workspaceId: z.string().optional(),
  title: z.string().min(3),
  genre: z.string().optional(),
  tag: z.string().optional()
});

export async function GET() {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  const reports = await db.aiReport.findMany({
    where: {
      organizationId: context.organizationId
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return ok(reports);
}

export async function POST(request: Request) {
  try {
    const context = await getApiContext();

    if (!context) {
      return unauthorized();
    }

    if (!canWriteOrganization(context.organizationRole, context.organizationPermissions)) {
      return forbidden("Viewers cannot generate reports.");
    }

    const body = await parseJsonBody(request, schema);
    const report = await generateBasicMarketReport({
      organizationId: context.organizationId,
      workspaceId: body.workspaceId ?? context.workspace.id,
      createdById: context.userId,
      title: body.title,
      genre: body.genre,
      tag: body.tag
    });

    return ok(report, { status: 201 });
  } catch (error) {
    if (error instanceof SubscriptionLimitError) {
      return badRequest(error.message);
    }

    return serverError();
  }
}
