import { ok, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { EntitlementError, entitlementErrorResponse, getEntitlementPolicy, getUsageCount } from "@/lib/entitlements";
import type { LimitKey } from "@/lib/subscription-plans";

const limitKeys: LimitKey[] = [
  "steamXrayPerMonth",
  "viabilityAnalysesPerMonth",
  "artAnalysesPerMonth",
  "gameBoardProjects",
  "gdds"
];

export async function GET() {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  const entitlementContext = {
    userId: context.userId,
    workspaceId: context.workspace.id,
    organizationId: context.organizationId
  };

  try {
    const policy = await getEntitlementPolicy(entitlementContext);
    const usageEntries = await Promise.all(
      limitKeys.map(async (key) => [key, await getUsageCount(entitlementContext, key)] as const)
    );

    return ok({
      policy,
      usage: Object.fromEntries(usageEntries)
    });
  } catch (error) {
    if (error instanceof EntitlementError) {
      return entitlementErrorResponse(error);
    }

    throw error;
  }
}
