import type {
  CompanyAuditRecord,
  CompanyComplianceRecord,
  CompanyDocumentRecord,
  CompanyLegalEntityRecord,
  CompanyMemberOption,
  CompanyProjectOption
} from "@/components/company/company-types";
import { PageHero } from "@/components/app-shell/page-hero";
import { CompanyAuditPanel } from "@/components/company/company-audit-panel";
import { CompanyCompliancePanel } from "@/components/company/company-compliance-panel";
import { CompanyDocumentsPanel } from "@/components/company/company-documents-panel";
import { CompanyProfilePanel } from "@/components/company/company-profile-panel";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCountryLabel, getLanguageLabel } from "@/lib/company-localization";

export function CompanyPage({
  canManage,
  canAccessApprovalsAudit,
  canAccessCompanyHub,
  canAccessDocumentVault,
  auditEvents,
  complianceItems,
  documents,
  legalEntities,
  members,
  organizationCountryCode,
  organizationDefaultLanguage,
  organizationName,
  planLabel,
  projects
}: {
  canManage: boolean;
  canAccessApprovalsAudit: boolean;
  canAccessCompanyHub: boolean;
  canAccessDocumentVault: boolean;
  auditEvents: CompanyAuditRecord[];
  complianceItems: CompanyComplianceRecord[];
  documents: CompanyDocumentRecord[];
  legalEntities: CompanyLegalEntityRecord[];
  members: CompanyMemberOption[];
  organizationCountryCode: string;
  organizationDefaultLanguage: string;
  organizationName: string;
  planLabel: string;
  projects: CompanyProjectOption[];
}) {
  if (!canAccessCompanyHub) {
    return (
      <div className="space-y-6">
        <PageHero
          title="Company"
          description="Manage legal entities, compliance, and core company records."
          actions={(
            <>
              <Badge variant="secondary">Company backbone</Badge>
              <Badge variant="secondary">Plan: {planLabel}</Badge>
            </>
          )}
          summary={(
            <div className="rounded-[1rem] border border-amber-400/25 bg-amber-500/10 p-4 text-sm">
              <p className="text-[11px] uppercase tracking-[0.28em] text-amber-300">Upgrade required</p>
              <p className="mt-2 font-medium text-foreground">Company Hub starts on Plus.</p>
              <p className="mt-2 text-muted-foreground">Upgrade to unlock entities, documents, and compliance tracking.</p>
            </div>
          )}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHero
        title="Company"
        description={`Manage legal entities, records, documents, and compliance for ${organizationName}.`}
        actions={(
          <>
            <Badge variant="secondary">Compliance</Badge>
            {canAccessDocumentVault ? <Badge variant="secondary">Documents</Badge> : null}
            {canAccessApprovalsAudit ? <Badge variant="secondary">Audit</Badge> : null}
          </>
        )}
        summary={(
          <div className="grid gap-2.5 rounded-[1rem] border border-white/10 bg-background/70 p-3 text-sm backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Language</span>
              <span className="font-medium">{getLanguageLabel(organizationDefaultLanguage)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Country</span>
              <span className="font-medium">{getCountryLabel(organizationCountryCode)}</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/35 p-3 dark:bg-white/[0.04]">
              <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Control surface</p>
              <p className="mt-2 font-medium">Legal and documentary backbone for the ERP.</p>
            </div>
          </div>
        )}
      />

      <Tabs defaultValue="profile">
        <TabsList className="h-auto flex-wrap justify-start gap-2 rounded-[1rem] border border-white/10 bg-white/55 p-1.5 backdrop-blur dark:bg-white/[0.04]">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          {canAccessDocumentVault ? <TabsTrigger value="documents">Documents</TabsTrigger> : null}
          {canAccessApprovalsAudit ? <TabsTrigger value="audit">Audit</TabsTrigger> : null}
        </TabsList>
        <TabsContent className="space-y-4" value="profile">
          <CompanyProfilePanel
            canManage={canManage}
            legalEntities={legalEntities}
            organizationCountryCode={organizationCountryCode}
            organizationDefaultLanguage={organizationDefaultLanguage}
          />
        </TabsContent>
        {canAccessDocumentVault ? (
          <TabsContent className="space-y-4" value="documents">
            <CompanyDocumentsPanel
              canManage={canManage}
              documents={documents}
              legalEntities={legalEntities}
              projects={projects}
            />
          </TabsContent>
        ) : null}
        <TabsContent className="space-y-4" value="compliance">
          <CompanyCompliancePanel
            canManage={canManage}
            complianceItems={complianceItems}
            documents={documents}
            legalEntities={legalEntities}
            members={members}
            projects={projects}
          />
        </TabsContent>
        {canAccessApprovalsAudit ? (
          <TabsContent className="space-y-4" value="audit">
            <CompanyAuditPanel auditEvents={auditEvents} />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
