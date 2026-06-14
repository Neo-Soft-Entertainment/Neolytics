import { forbidden, ok, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { hasPrivacyPermission } from "@/lib/privacy/permissions";
import { listProcessingPurposes } from "@/lib/privacy/processing-purposes";

export async function GET() {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!hasPrivacyPermission(context.organizationRole, context.organizationPermissions, "view_privacy_audit_logs")) {
    return forbidden("Este cargo não pode acessar o painel administrativo de privacidade.");
  }

  const [consents, requests, products, incidents, auditLogs, legalHolds] = await Promise.all([
    db.userConsent.count(),
    db.dataSubjectRequest.count({
      where: {
        organizationId: context.organizationId
      }
    }),
    db.dataProduct.count({
      where: {
        OR: [
          { organizationId: context.organizationId },
          { organizationId: null }
        ]
      }
    }),
    db.privacyIncident.count({
      where: {
        OR: [
          { organizationId: context.organizationId },
          { organizationId: null }
        ]
      }
    }),
    db.privacyAuditLog.count({
      where: {
        OR: [
          { organizationId: context.organizationId },
          { organizationId: null }
        ]
      }
    }),
    db.privacyLegalHold.count({
      where: {
        OR: [
          { organizationId: context.organizationId },
          { organizationId: null }
        ],
        active: true
      }
    })
  ]);

  return ok({
    purposes: listProcessingPurposes(),
    stats: {
      consents,
      requests,
      products,
      incidents,
      auditLogs,
      legalHolds
    }
  });
}
