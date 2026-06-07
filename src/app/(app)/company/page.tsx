import { auth } from "@/auth";
import { CompanyPage } from "@/components/company/company-page";
import type { CompanyAuditRecord, CompanyComplianceRecord, CompanyDocumentRecord, CompanyLegalEntityRecord } from "@/components/company/company-types";
import { getCurrentOrganization } from "@/lib/auth-helpers";
import { getCompanyModuleData } from "@/lib/company-service";
import { db } from "@/lib/db";
import { getSubscriptionPlanLabel, hasSubscriptionCapability } from "@/lib/subscription-plans";

export default async function CompanyRoute() {
  const [session, organization] = await Promise.all([auth(), getCurrentOrganization()]);
  const canAccessCompanyHub = hasSubscriptionCapability(organization.subscriptionPlan, "companyHub");
  const canAccessDocumentVault = hasSubscriptionCapability(organization.subscriptionPlan, "documentVault");
  const canAccessApprovalsAudit = hasSubscriptionCapability(organization.subscriptionPlan, "approvalsAudit");
  const [membership, data] = await Promise.all([
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
    canAccessCompanyHub ? getCompanyModuleData(organization.id) : null
  ]);

  const legalEntities = JSON.parse(JSON.stringify(data?.legalEntities ?? [])) as CompanyLegalEntityRecord[];
  const documents = (data?.documents ?? []).map((document) => ({
    ...JSON.parse(JSON.stringify(document)),
    expiresAt: document.expiresAt?.toISOString() ?? null,
    versions: document.versions.map((version) => ({
      ...JSON.parse(JSON.stringify(version)),
      createdAt: version.createdAt.toISOString()
    }))
  })) as CompanyDocumentRecord[];
  const complianceItems = (data?.complianceItems ?? []).map((item) => ({
    ...JSON.parse(JSON.stringify(item)),
    dueAt: item.dueAt?.toISOString() ?? null
  })) as CompanyComplianceRecord[];
  const auditEvents = (data?.auditEvents ?? []).map((event) => ({
    ...JSON.parse(JSON.stringify(event)),
    createdAt: event.createdAt.toISOString()
  })) as CompanyAuditRecord[];

  return (
    <CompanyPage
      auditEvents={auditEvents}
      canAccessApprovalsAudit={canAccessApprovalsAudit}
      canAccessCompanyHub={canAccessCompanyHub}
      canAccessDocumentVault={canAccessDocumentVault}
      canManage={membership?.role === "OWNER" || membership?.role === "ADMIN"}
      complianceItems={complianceItems}
      documents={documents}
      legalEntities={legalEntities}
      members={JSON.parse(JSON.stringify(data?.members ?? []))}
      organizationCountryCode={organization.countryCode}
      organizationDefaultLanguage={organization.defaultLanguage}
      organizationName={organization.name}
      planLabel={getSubscriptionPlanLabel(organization.subscriptionPlan)}
      projects={JSON.parse(JSON.stringify(data?.projects ?? []))}
    />
  );
}
