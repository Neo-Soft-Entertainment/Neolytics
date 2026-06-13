import { forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { buildIncidentNotificationReport } from "@/lib/privacy/incident-service";
import { hasPrivacyPermission } from "@/lib/privacy/permissions";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ incidentId: string }> }
) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!hasPrivacyPermission(context.organizationRole, context.organizationPermissions, "manage_privacy_incidents")) {
    return forbidden("This role cannot export incident reports.");
  }

  try {
    const { incidentId } = await params;
    const incident = await db.privacyIncident.findUniqueOrThrow({
      where: {
        id: incidentId
      }
    });

    return ok(buildIncidentNotificationReport({
      incidentId: incident.id,
      severity: incident.severity,
      affectedDataCategories: Array.isArray(incident.affectedDataCategories)
        ? incident.affectedDataCategories.map((entry) => String(entry))
        : [],
      affectedUserCountEstimate: incident.affectedUserCountEstimate,
      discoveredAt: incident.discoveredAt,
      containedAt: incident.containedAt,
      rootCause: incident.rootCause,
      mitigationSteps: incident.mitigationSteps,
      requiresAuthorityNotification: incident.requiresAuthorityNotification,
      requiresUserNotification: incident.requiresUserNotification,
      status: incident.status
    }));
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "Unable to generate incident report.");
  }
}
