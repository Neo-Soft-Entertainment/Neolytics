import { z } from "zod";

import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { assertPublicApiRateLimit, getPublicApiRateLimitKey } from "@/lib/auth-rate-limit";
import { grantConsent, listUserConsentState } from "@/lib/privacy/consent-service";
import { parseJsonBody } from "@/lib/request";

const schema = z.object({
  purposeId: z.string().min(2),
  consentTextVersion: z.string().min(1),
  source: z.string().min(2).max(80)
});

export async function GET() {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  return ok({
    consents: await listUserConsentState(context.userId)
  });
}

export async function POST(request: Request) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  try {
    await assertPublicApiRateLimit(getPublicApiRateLimitKey(request, "privacy-consents"));

    if (!["OWNER", "ADMIN", "MEMBER"].includes(context.organizationRole)) {
      return forbidden("Este cargo não pode gerenciar consentimentos opcionais.");
    }

    const body = await parseJsonBody(request, schema);
    const consent = await grantConsent({
      userId: context.userId,
      purposeId: body.purposeId,
      consentTextVersion: body.consentTextVersion,
      source: body.source,
      organizationId: context.organizationId,
      actorRole: context.organizationRole,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip"),
      userAgent: request.headers.get("user-agent")
    });

    return ok(consent, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid consent payload.");
    }

    return serverError(error instanceof Error ? error.message : "Não foi possível conceder o consentimento.");
  }
}
