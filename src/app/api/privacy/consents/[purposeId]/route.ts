import { badRequest, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { assertPublicApiRateLimit, getPublicApiRateLimitKey } from "@/lib/auth-rate-limit";
import { revokeConsent } from "@/lib/privacy/consent-service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ purposeId: string }> }
) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  try {
    await assertPublicApiRateLimit(getPublicApiRateLimitKey(request, "privacy-consent-revoke"));

    const { purposeId } = await params;
    const consent = await revokeConsent({
      userId: context.userId,
      purposeId,
      organizationId: context.organizationId,
      actorRole: context.organizationRole,
      source: "privacy_settings"
    });

    return ok(consent);
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Unable to revoke consent.");
  }
}
