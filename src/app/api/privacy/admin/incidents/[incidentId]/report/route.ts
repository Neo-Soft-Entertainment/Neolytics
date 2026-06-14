import { forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { buildIncidentNotificationReport } from "@/lib/privacy/incident-service";
import { hasPrivacyPermission } from "@/lib/privacy/permissions";
import { getErrorMessage } from "@/lib/error-message";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ incidentId: string }> }
) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!hasPrivacyPermission(context.organizationRole, context.organizationPermissions, "manage_privacy_incidents")) {
    return forbidden("Este cargo não pode exportar relatórios de incidente.");
  }

  try {
    const { incidentId } = await params;
    const incident = await db.privacyIncident.findUniqueOrThrow({
      where: {
        id: incidentId
      }
    });

        let resolvedValue0: any;
    if (Array.isArray(incident.affectedDataCategories)) {
      resolvedValue0 = incident.affectedDataCategories.map((entry) => String(entry));
    } else {
      resolvedValue0 = [];
    }
return ok(buildIncidentNotificationReport({
      incidentId: incident.id,
      severity: incident.severity,
      affectedDataCategories: resolvedValue0,
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
    return serverError(getErrorMessage(error, "Não foi possível gerar o relatório de incidente."));
  }
}
