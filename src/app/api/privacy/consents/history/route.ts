import { ok, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { downloadConsentHistory } from "@/lib/privacy/consent-service";

export async function GET() {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  return ok(await downloadConsentHistory(context.userId));
}
