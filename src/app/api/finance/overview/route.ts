import { ok, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { getFinanceOverview } from "@/lib/finance-service";
import { readServerCache } from "@/lib/server-memory-cache";

export async function GET() {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  const overview = await readServerCache(
    `finance:overview:${context.organizationId}`,
    1000 * 45,
    () => getFinanceOverview(context.organizationId)
  );

  return ok(overview);
}
