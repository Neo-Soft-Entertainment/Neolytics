import { auth } from "@/auth";
import { FinancePage } from "@/components/finance/finance-page";
import { getCurrentOrganization } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { getFinanceOverview } from "@/lib/finance-service";

export default async function FinanceRoute() {
  const [session, organization] = await Promise.all([auth(), getCurrentOrganization()]);
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
    getFinanceOverview(organization.id)
  ]);

  const data = JSON.parse(
    JSON.stringify(overview, (_, value) => (typeof value === "bigint" ? Number(value) : value))
  );

  return (
    <FinancePage
      canManage={membership?.role === "OWNER" || membership?.role === "ADMIN"}
      data={data}
      organizationName={organization.name}
    />
  );
}
