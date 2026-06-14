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
    let resolvedValue0: any;
  if (session?.user?.id) {
    resolvedValue0 = db.organizationMember.findUnique({
          where: {
            organizationId_userId: {
              organizationId: organization.id,
              userId: session.user.id
            }
          }
        });
  } else {
    resolvedValue0 = null;
  }
  let resolvedValue1: any;
  if (canAccessFinanceWorkspace) {
    resolvedValue1 = getFinanceSummary(organization.id);
  } else {
    resolvedValue1 = null;
  }
const [membership, overview] = await Promise.all([
    resolvedValue0,
    resolvedValue1
  ]);

    let resolvedValue2: any;
  if (overview) {
    resolvedValue2 = JSON.parse(
        JSON.stringify(overview, (_, value) => {
          let resolvedValue3: any;
          if (typeof value === "bigint") {
            resolvedValue3 = Number(value);
          } else {
            resolvedValue3 = value;
          }
          return (resolvedValue3);
        })
      );
  } else {
    resolvedValue2 = null;
  }
const summary = resolvedValue2;

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
