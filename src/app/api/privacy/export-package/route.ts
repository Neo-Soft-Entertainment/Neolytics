import { ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { createPrivacyAuditLog } from "@/lib/privacy/audit";
import { buildPersonalDataAccessPackage } from "@/lib/privacy/data-subject-request-service";
import { PrivacyDecision } from "@prisma/client";
import { getErrorMessage } from "@/lib/error-message";

export async function GET() {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  try {
    const payload = await buildPersonalDataAccessPackage(context.userId);
    await createPrivacyAuditLog(db, {
      organizationId: context.organizationId,
      actorId: context.userId,
      actorRole: context.organizationRole,
      action: "personal_data.export_package_downloaded",
      resourceType: "privacy_export_package",
      resourceId: context.userId,
      decision: PrivacyDecision.ALLOW,
      reason: "User requested their personal data package."
    });
    return ok(payload);
  } catch (error) {
    return serverError(getErrorMessage(error, "Não foi possível montar o pacote de exportação de privacidade."));
  }
}
