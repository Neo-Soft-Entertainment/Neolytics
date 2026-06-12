import { forbidden, ok, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { hasPrivacyPermission } from "@/lib/privacy/permissions";
import { listAdminDataSubjectRequests } from "@/lib/privacy/data-subject-request-service";

export async function GET() {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  if (!hasPrivacyPermission(context.organizationRole, "review_privacy_requests")) {
    return forbidden("This role cannot review privacy requests.");
  }

  return ok({
    requests: await listAdminDataSubjectRequests(context.organizationId)
  });
}
