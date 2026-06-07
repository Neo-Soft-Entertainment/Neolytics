import { CommunityPageClient } from "@/components/community/community-page-client";
import { getCurrentOrganization } from "@/lib/auth-helpers";
import { hasSubscriptionCapability } from "@/lib/subscription-plans";

export default async function CommunityPage() {
  const organization = await getCurrentOrganization();

  return (
    <CommunityPageClient
      canAccessFeed={hasSubscriptionCapability(organization.subscriptionPlan, "communityFeed")}
      canAccessRanking={hasSubscriptionCapability(organization.subscriptionPlan, "communityRanking")}
      subscriptionPlan={organization.subscriptionPlan}
    />
  );
}
