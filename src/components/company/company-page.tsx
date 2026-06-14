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
          title="Empresa"
          description="Gerencie entidades legais, conformidade e registros principais da empresa."
          actions={(
            <>
              <Badge variant="secondary">Estrutura da empresa</Badge>
              <Badge variant="secondary">Plano: {planLabel}</Badge>
            </>
          )}
          summary={(
            <div className="rounded-[1rem] border border-amber-400/25 bg-amber-500/10 p-4 text-sm">
              <p className="text-[11px] uppercase tracking-[0.28em] text-amber-300">Upgrade necessário</p>
              <p className="mt-2 font-medium text-foreground">Hub da empresa começa no Plus.</p>
              <p className="mt-2 text-muted-foreground">Faça upgrade para liberar entidades, documentos e acompanhamento de conformidade.</p>
            </div>
          )}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHero
        title="Empresa"
        description={`Gerencie entidades legais, registros, documentos e conformidade para ${organizationName}.`}
        actions={(
          <>
            <Badge variant="secondary">Compliance</Badge>
            {canAccessDocumentVault ? <Badge variant="secondary">Documentos</Badge> : null}
            {canAccessApprovalsAudit ? <Badge variant="secondary">Auditoria</Badge> : null}
          </>
        )}
        summary={(
          <div className="grid gap-2.5 rounded-[1rem] border border-white/10 bg-background/70 p-3 text-sm backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Idioma</span>
              <span className="font-medium">{getLanguageLabel(organizationDefaultLanguage)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">País</span>
              <span className="font-medium">{getCountryLabel(organizationCountryCode)}</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/35 p-3 dark:bg-white/[0.04]">
              <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Superfície de controle</p>
              <p className="mt-2 font-medium">Base legal e documental do ERP.</p>
            </div>
          </div>
        )}
      />

      <Tabs defaultValue="profile">
        <TabsList className="h-auto flex-wrap justify-start gap-2 rounded-[1rem] border border-white/10 bg-white/55 p-1.5 backdrop-blur dark:bg-white/[0.04]">
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          {canAccessDocumentVault ? <TabsTrigger value="documents">Documentos</TabsTrigger> : null}
          {canAccessApprovalsAudit ? <TabsTrigger value="audit">Auditoria</TabsTrigger> : null}
        </TabsList>
        <p className="mt-2 text-sm text-muted-foreground">
          Gerencie o perfil legal, conformidade, documentos e trilha de auditoria da organização do estúdio.
        </p>
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
