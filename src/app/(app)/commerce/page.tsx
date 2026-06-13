import { auth } from "@/auth";
import { CommercePage } from "@/components/commerce/commerce-page";
import { getCurrentOrganization } from "@/lib/auth-helpers";
import { canManageCommerce } from "@/lib/authorization";
import { getCommerceOverview } from "@/lib/commerce-service";
import { db } from "@/lib/db";
import { getSubscriptionPlanLabel, hasSubscriptionCapability } from "@/lib/subscription-plans";

export default async function CommerceRoute() {
  const [session, organization] = await Promise.all([auth(), getCurrentOrganization()]);
  const canAccessCommerceOps = hasSubscriptionCapability(organization.subscriptionPlan, "commerceOps");
  const [membership, overview] = await Promise.all([
    session?.user?.id
      ? db.organizationMember.findUnique({
          where: {
            organizationId_userId: {
              organizationId: organization.id,
              userId: session.user.id
            }
          }
        })
      : null,
    canAccessCommerceOps ? getCommerceOverview(organization.id) : null
  ]);
  const data = overview
    ? JSON.parse(
        JSON.stringify(overview, (_, value) => (typeof value === "bigint" ? Number(value) : value))
      )
    : null;

  return (
    <CommercePage
      canAccessCommerceOps={canAccessCommerceOps}
      canManage={membership ? canManageCommerce(membership.role, membership.permissions) : false}
      data={data}
      organizationName={organization.name}
      planLabel={getSubscriptionPlanLabel(organization.subscriptionPlan)}
    />
  );
}
