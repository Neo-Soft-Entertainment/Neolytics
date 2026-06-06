import type {
  CompanyComplianceRecord,
  CompanyDocumentRecord,
  CompanyLegalEntityRecord,
  CompanyMemberOption,
  CompanyProjectOption
} from "@/components/company/company-types";
import { CompanyCompliancePanel } from "@/components/company/company-compliance-panel";
import { CompanyDocumentsPanel } from "@/components/company/company-documents-panel";
import { CompanyProfilePanel } from "@/components/company/company-profile-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function CompanyPage({
  canManage,
  complianceItems,
  documents,
  legalEntities,
  members,
  organizationName,
  projects
}: {
  canManage: boolean;
  complianceItems: CompanyComplianceRecord[];
  documents: CompanyDocumentRecord[];
  legalEntities: CompanyLegalEntityRecord[];
  members: CompanyMemberOption[];
  organizationName: string;
  projects: CompanyProjectOption[];
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Company</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage legal entities, CNPJ dossier, document versions, and the compliance backlog for {organizationName}.
        </p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>
        <TabsContent className="space-y-4" value="profile">
          <CompanyProfilePanel canManage={canManage} legalEntities={legalEntities} />
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
      </Tabs>
    </div>
  );
}
