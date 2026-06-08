import { SubscriptionPlan } from "@prisma/client";

import {
  EntitlementError,
  assertCanUseFeature,
  assertWithinLimit,
  canUseFeature,
  getEntitlementPolicy,
  getLimit,
  getLimitLabel,
  hasReachedLimit
} from "../src/lib/entitlements";

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function expectEntitlementError(
  fn: () => Promise<void>,
  code: EntitlementError["payload"]["code"]
) {
  try {
    await fn();
  } catch (error) {
    assert(error instanceof EntitlementError, `Expected EntitlementError for ${code}.`);
    const entitlementError = error as EntitlementError;
    assert(entitlementError.payload.code === code, `Expected ${code}, received ${entitlementError.payload.code}.`);
    return;
  }

  throw new Error(`Expected ${code} to be thrown.`);
}

async function main() {
  const freeContext = {
    userId: "test-user",
    workspaceId: "test-workspace",
    currentPlanId: SubscriptionPlan.FREE,
    subscriptionStatus: "ACTIVE"
  };
  const plusContext = {
    ...freeContext,
    currentPlanId: SubscriptionPlan.PLUS
  };
  const proContext = {
    ...freeContext,
    currentPlanId: SubscriptionPlan.PRO
  };

  assert(getLimitLabel(3) === "3", "Numeric limit label should be stringified.");
  assert(getLimitLabel("unlimited") === "Ilimitado", "Unlimited limit label should be localized.");
  assert(hasReachedLimit(3, 3), "Equal numeric usage should reach limit.");
  assert(!hasReachedLimit(2, 3), "Lower numeric usage should not reach limit.");
  assert(!hasReachedLimit(999, "unlimited"), "Unlimited should never be reached.");

  assert(await canUseFeature(freeContext, "communityFeed"), "Free context should access community feed.");
  assert(!(await canUseFeature(freeContext, "pdfExport")), "Free context should not access PDF export.");
  await assertCanUseFeature(plusContext, "pdfExport");
  assert(!(await canUseFeature(plusContext, "earlyAccess")), "Plus context should not access early access.");
  await assertCanUseFeature(proContext, "earlyAccess");

  const proPolicy = await getEntitlementPolicy(proContext);
  assert(proPolicy.features.earlyAccess, "Pro policy should include early access.");
  assert(proPolicy.limits.viabilityAnalysesPerMonth === "unlimited", "Pro viability limit should be unlimited.");

  assert(await getLimit(freeContext, "steamXrayPerMonth") === 10, "Free Steam X-Ray limit should be 10.");
  assert(await getLimit(plusContext, "artAnalysesPerMonth") === 25, "Plus art analysis limit should be 25.");
  assert(await getLimit(proContext, "gdds") === "unlimited", "Pro GDD limit should be unlimited.");

  await assertWithinLimit(freeContext, "steamXrayPerMonth", 9);
  await expectEntitlementError(
    () => assertWithinLimit(freeContext, "steamXrayPerMonth", 10),
    "LIMIT_REACHED"
  );
  await expectEntitlementError(
    () => assertCanUseFeature(freeContext, "pdfExport"),
    "FEATURE_NOT_AVAILABLE"
  );
  await expectEntitlementError(
    () => getEntitlementPolicy({ ...freeContext, subscriptionStatus: "CANCELED" }).then(() => undefined),
    "SUBSCRIPTION_INACTIVE"
  );

  console.log("Entitlements self-test passed.");
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
