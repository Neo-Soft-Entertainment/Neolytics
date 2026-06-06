export interface CompanyProjectOption {
  id: string;
  name: string;
}

export interface CompanyMemberOption {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

export interface CompanyBranchRecord {
  id: string;
  name: string;
  code: string | null;
  cnpj: string | null;
  city: string | null;
  state: string | null;
}

export interface CompanyShareholderRecord {
  id: string;
  name: string;
  documentNumber: string;
  role: string | null;
  ownershipPercent: string | null;
}

export interface CompanyOfficerRecord {
  id: string;
  name: string;
  title: string;
  email: string | null;
}

export interface CompanyLegalEntityRecord {
  id: string;
  name: string;
  tradeName: string | null;
  cnpj: string | null;
  legalNature: string | null;
  taxRegime: "MEI" | "SIMPLES_NACIONAL" | "LUCRO_PRESUMIDO" | "LUCRO_REAL" | "OTHER";
  cnaePrimary: string | null;
  email: string | null;
  phone: string | null;
  websiteUrl: string | null;
  city: string | null;
  state: string | null;
  addressLine1: string | null;
  district: string | null;
  postalCode: string | null;
  notes: string | null;
  branches: CompanyBranchRecord[];
  shareholders: CompanyShareholderRecord[];
  officers: CompanyOfficerRecord[];
}

export interface CompanyDocumentVersionRecord {
  id: string;
  version: number;
  storagePath: string;
  originalName: string;
  mimeType: string;
  createdAt: string;
}

export interface CompanyDocumentRecord {
  id: string;
  title: string;
  type: string;
  status: string;
  issuer: string | null;
  documentNumber: string | null;
  expiresAt: string | null;
  legalEntity: { id: string; name: string } | null;
  project: { id: string; name: string } | null;
  versions: CompanyDocumentVersionRecord[];
}

export interface CompanyComplianceRecord {
  id: string;
  title: string;
  type: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "WAIVED" | "OVERDUE";
  dueAt: string | null;
  notes: string | null;
  legalEntity: { id: string; name: string } | null;
  project: { id: string; name: string } | null;
  sourceDocument: { id: string; title: string } | null;
  ownerUser: { id: string; name: string | null; email: string } | null;
}
