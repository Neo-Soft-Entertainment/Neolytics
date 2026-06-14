import { PrivacyDecision, PrivacyIncidentSeverity, PrivacyIncidentStatus } from "@prisma/client";
import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { createPrivacyAuditLog } from "@/lib/privacy/audit";
import { hasPrivacyPermission } from "@/lib/privacy/permissions";
import { parseJsonBody } from "@/lib/request";

const schema = z.object({
  severity: z.nativeEnum(PrivacyIncidentSeverity),
  affectedDataCategories: z.array(z.string().min(2)).min(1),
  affectedUserCountEstimate: z.coerce.number().int().nonnegative().optional(),
  rootCause: z.string().trim().min(2).max(500).optional(),
  mitigationSteps: z.string().trim().min(2).max(2000).optional(),
  requiresAuthorityNotification: z.boolean().optional(),
  requiresUserNotification: z.boolean().optional(),
  status: z.nativeEnum(PrivacyIncidentStatus).optional()
});

export async function GET() {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!hasPrivacyPermission(context.organizationRole, context.organizationPermissions, "manage_privacy_incidents")) {
    return forbidden("Este cargo não pode acessar incidentes.");
  }

  const incidents = await db.privacyIncident.findMany({
    where: {
      OR: [
        { organizationId: context.organizationId },
        { organizationId: null }
      ]
    },
    orderBy: {
      discoveredAt: "desc"
    }
  });

  return ok({ incidents });
}

export async function POST(request: Request) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!hasPrivacyPermission(context.organizationRole, context.organizationPermissions, "manage_privacy_incidents")) {
    return forbidden("Este cargo não pode criar incidentes.");
  }

  try {
    const body = await parseJsonBody(request, schema);
    const incident = await db.privacyIncident.create({
      data: {
        organizationId: context.organizationId,
        severity: body.severity,
        affectedDataCategories: body.affectedDataCategories,
        affectedUserCountEstimate: body.affectedUserCountEstimate ?? null,
        discoveredAt: new Date(),
        rootCause: body.rootCause ?? null,
        mitigationSteps: body.mitigationSteps ?? null,
        requiresAuthorityNotification: body.requiresAuthorityNotification ?? false,
        requiresUserNotification: body.requiresUserNotification ?? false,
        status: body.status ?? PrivacyIncidentStatus.OPEN,
        createdById: context.userId
      }
    });

    await createPrivacyAuditLog(db, {
      organizationId: context.organizationId,
      actorId: context.userId,
      actorRole: context.organizationRole,
      action: "privacy_incident.created",
      resourceType: "privacy_incident",
      resourceId: incident.id,
      decision: PrivacyDecision.ALLOW,
      reason: incident.severity,
      metadata: {
        affectedDataCategories: body.affectedDataCategories
      }
    });

    return ok(incident, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid incident payload.");
    }

    return serverError(error instanceof Error ? error.message : "Não foi possível criar o incidente.");
  }
}
