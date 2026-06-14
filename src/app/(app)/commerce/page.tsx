import { auth } from "@/auth";
import { CommercePage } from "@/components/commerce/commerce-page";
import { getCurrentOrganization } from "@/lib/auth-helpers";
import { canManageCommerce } from "@/lib/authorization";
import { getCommerceOverview } from "@/lib/commerce-service";
import { db } from "@/lib/db";
import { readServerCache } from "@/lib/server-memory-cache";
import { getSubscriptionPlanLabel, hasSubscriptionCapability } from "@/lib/subscription-plans";

export default async function CommerceRoute() {
  const [session, organization] = await Promise.all([auth(), getCurrentOrganization()]);
  const canAccessCommerceOps = hasSubscriptionCapability(organization.subscriptionPlan, "commerceOps");
  let overview = null;

  if (canAccessCommerceOps) {
    overview = await readServerCache(
      `commerce:overview:${organization.id}`,
      1000 * 45,
      () => getCommerceOverview(organization.id)
    );
  }

  let membership = null;

  if (session?.user?.id) {
    membership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: organization.id,
          userId: session.user.id
        }
      }
    });
  }

    let resolvedValue0: any;
  if (overview) {
    resolvedValue0 = JSON.parse(
        JSON.stringify(overview, (_, value) => {
          let resolvedValue2: any;
          if (typeof value === "bigint") {
            resolvedValue2 = Number(value);
          } else {
            resolvedValue2 = value;
          }
          return (resolvedValue2);
        })
      );
  } else {
    resolvedValue0 = null;
  }
const data = resolvedValue0;

    let resolvedValue1: any;
  if (membership) {
    resolvedValue1 = canManageCommerce(membership.role, membership.permissions);
  } else {
    resolvedValue1 = false;
  }
return (
    <CommercePage
      canAccessCommerceOps={canAccessCommerceOps}
      canManage={resolvedValue1}
      data={data}
      organizationName={organization.name}
      planLabel={getSubscriptionPlanLabel(organization.subscriptionPlan)}
    />
  );
}
