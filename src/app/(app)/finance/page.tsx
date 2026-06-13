import { auth } from "@/auth";
import { FinancePage } from "@/components/finance/finance-page";
import { getCurrentOrganization } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { getFinanceSummary } from "@/lib/finance-service";
import { getSubscriptionPlanLabel, hasSubscriptionCapability } from "@/lib/subscription-plans";

export default async function FinanceRoute() {
  const [session, organization] = await Promise.all([auth(), getCurrentOrganization()]);
  const canAccessFinanceWorkspace = hasSubscriptionCapability(organization.subscriptionPlan, "financeWorkspace");
  const canAccessContractsRoyalties = hasSubscriptionCapability(organization.subscriptionPlan, "contractsRoyalties");
  const canAccessInvoiceOps = hasSubscriptionCapability(organization.subscriptionPlan, "invoiceOps");
  const canAccessApprovalsAudit = hasSubscriptionCapability(organization.subscriptionPlan, "approvalsAudit");
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
    canAccessFinanceWorkspace ? getFinanceSummary(organization.id) : null
  ]);

  const summary = overview
    ? JSON.parse(
        JSON.stringify(overview, (_, value) => (typeof value === "bigint" ? Number(value) : value))
      )
    : null;

  return (
    <FinancePage
      canAccessApprovalsAudit={canAccessApprovalsAudit}
      canAccessContractsRoyalties={canAccessContractsRoyalties}
      canAccessFinanceWorkspace={canAccessFinanceWorkspace}
      canAccessInvoiceOps={canAccessInvoiceOps}
      canManage={membership?.role === "OWNER" || membership?.role === "ADMIN"}
      organizationName={organization.name}
      planLabel={getSubscriptionPlanLabel(organization.subscriptionPlan)}
      summary={summary}
    />
  );
}
