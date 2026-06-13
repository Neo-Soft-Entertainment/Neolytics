import { ok, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { getFinanceOverview } from "@/lib/finance-service";

export async function GET() {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  return ok(await getFinanceOverview(context.organizationId));
}
