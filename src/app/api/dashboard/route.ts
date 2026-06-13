import { ok, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { getDashboardData } from "@/lib/game-service";

export async function GET() {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  return ok(await getDashboardData(context.workspace.id));
}
