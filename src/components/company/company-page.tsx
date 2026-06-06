import type {
  CompanyAuditRecord,
  CompanyComplianceRecord,
  CompanyDocumentRecord,
  CompanyLegalEntityRecord,
  CompanyMemberOption,
  CompanyProjectOption
} from "@/components/company/company-types";
import { CompanyAuditPanel } from "@/components/company/company-audit-panel";
import { CompanyCompliancePanel } from "@/components/company/company-compliance-panel";
import { CompanyDocumentsPanel } from "@/components/company/company-documents-panel";
import { CompanyProfilePanel } from "@/components/company/company-profile-panel";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCountryLabel, getLanguageLabel } from "@/lib/company-localization";

export function CompanyPage({
  canManage,
  auditEvents,
  complianceItems,
  documents,
  legalEntities,
  members,
  organizationCountryCode,
  organizationDefaultLanguage,
  organizationName,
  projects
}: {
  canManage: boolean;
  auditEvents: CompanyAuditRecord[];
  complianceItems: CompanyComplianceRecord[];
  documents: CompanyDocumentRecord[];
  legalEntities: CompanyLegalEntityRecord[];
  members: CompanyMemberOption[];
  organizationCountryCode: string;
  organizationDefaultLanguage: string;
  organizationName: string;
  projects: CompanyProjectOption[];
}) {
  return (
    <div className="space-y-6">
      <Card className="aurora-panel overflow-hidden border-white/10 shadow-[0_30px_80px_rgba(14,165,233,0.08)]">
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Company</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Manage legal entities, registration records, document versions, and the compliance backlog for {organizationName}.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="rounded-full border border-white/10 bg-white/55 px-3 py-1 text-xs uppercase tracking-[0.24em] text-muted-foreground backdrop-blur dark:bg-white/[0.04]">
                Compliance operations
              </span>
              <span className="rounded-full border border-white/10 bg-white/55 px-3 py-1 text-xs uppercase tracking-[0.24em] text-muted-foreground backdrop-blur dark:bg-white/[0.04]">
                Documents + audit
              </span>
            </div>
          </div>
          <div className="grid gap-3 rounded-[1.5rem] border border-white/10 bg-background/70 p-4 text-sm backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Default language</span>
              <span className="font-medium">{getLanguageLabel(organizationDefaultLanguage)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Home country</span>
              <span className="font-medium">{getCountryLabel(organizationCountryCode)}</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/35 p-3 dark:bg-white/[0.04]">
              <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Control surface</p>
              <p className="mt-2 font-medium">Use this area as the legal and documentary backbone for the studio ERP.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="profile">
        <TabsList className="h-auto flex-wrap justify-start gap-2 rounded-[1.5rem] border border-white/10 bg-white/55 p-2 backdrop-blur dark:bg-white/[0.04]">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>
        <TabsContent className="space-y-4" value="profile">
          <CompanyProfilePanel
            canManage={canManage}
            legalEntities={legalEntities}
            organizationCountryCode={organizationCountryCode}
            organizationDefaultLanguage={organizationDefaultLanguage}
          />
        </TabsContent>
        <TabsContent className="space-y-4" value="documents">
          <CompanyDocumentsPanel
            canManage={canManage}
            documents={documents}
            legalEntities={legalEntities}
            projects={projects}
          />
        </TabsContent>
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
        <TabsContent className="space-y-4" value="audit">
          <CompanyAuditPanel auditEvents={auditEvents} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
