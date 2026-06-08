import { ok, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { EntitlementError, assertCanUseFeature, entitlementErrorResponse } from "@/lib/entitlements";
import { getDashboardData } from "@/lib/game-service";

export async function GET() {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  try {
    await assertCanUseFeature({
      userId: context.userId,
      workspaceId: context.workspace.id,
      organizationId: context.organizationId
    }, "guidedJourney");

    return ok(await getDashboardData(context.workspace.id));
  } catch (error) {
    if (error instanceof EntitlementError) {
      return entitlementErrorResponse(error);
    }

    throw error;
  }
}
