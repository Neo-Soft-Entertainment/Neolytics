import { ReportsPageClient } from "@/components/reports/reports-page-client";
import { getCurrentOrganization } from "@/lib/auth-helpers";

export default async function ReportsPage() {
  const organization = await getCurrentOrganization();

  return <ReportsPageClient subscriptionPlan={organization.subscriptionPlan} />;
}
