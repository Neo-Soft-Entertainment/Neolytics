import { CompanyDocumentStatus, CompanyDocumentType, ComplianceStatus, ComplianceType, TaxRegime } from "@prisma/client";

import { createAuditEvent } from "@/lib/audit-service";
import { db } from "@/lib/db";
import { decryptNullableString, encryptNullableString } from "@/lib/security/encryption";
import { slugify } from "@/lib/slugify";
import { enforceSubscriptionCapability } from "@/lib/subscription-service";
import { buildUniqueSlug } from "@/lib/unique-slug";

function encryptCompanyField(value: string | null | undefined, organizationId: string, field: string) {
  return encryptNullableString(value?.trim() || null, `company:${organizationId}:${field}`);
}

function decryptCompanyField(value: string | null | undefined, organizationId: string, field: string) {
  return decryptNullableString(value, `company:${organizationId}:${field}`);
}

function decryptLegalEntity<T extends {
  organizationId: string;
  tradeName?: string | null;
  cnpj?: string | null;
  legalNature?: string | null;
  cnaePrimary?: string | null;
  email?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  notes?: string | null;
  branches?: Array<{
    cnpj?: string | null;
    stateRegistration?: string | null;
    municipalRegistration?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    district?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
  }>;
  shareholders?: Array<{ name: string; documentNumber: string; role?: string | null; notes?: string | null }>;
  officers?: Array<{ name: string; email?: string | null; phone?: string | null; documentNumber?: string | null; powers?: string | null }>;
}>(entity: T) {
  return {
    ...entity,
    tradeName: decryptCompanyField(entity.tradeName, entity.organizationId, "legalEntity.tradeName"),
    cnpj: decryptCompanyField(entity.cnpj, entity.organizationId, "legalEntity.cnpj"),
    legalNature: decryptCompanyField(entity.legalNature, entity.organizationId, "legalEntity.legalNature"),
    cnaePrimary: decryptCompanyField(entity.cnaePrimary, entity.organizationId, "legalEntity.cnaePrimary"),
    email: decryptCompanyField(entity.email, entity.organizationId, "legalEntity.email"),
    phone: decryptCompanyField(entity.phone, entity.organizationId, "legalEntity.phone"),
    addressLine1: decryptCompanyField(entity.addressLine1, entity.organizationId, "legalEntity.addressLine1"),
    addressLine2: decryptCompanyField(entity.addressLine2, entity.organizationId, "legalEntity.addressLine2"),
    district: decryptCompanyField(entity.district, entity.organizationId, "legalEntity.district"),
    city: decryptCompanyField(entity.city, entity.organizationId, "legalEntity.city"),
    state: decryptCompanyField(entity.state, entity.organizationId, "legalEntity.state"),
    postalCode: decryptCompanyField(entity.postalCode, entity.organizationId, "legalEntity.postalCode"),
    notes: decryptCompanyField(entity.notes, entity.organizationId, "legalEntity.notes"),
    branches: entity.branches?.map((branch) => ({
      ...branch,
      cnpj: decryptCompanyField(branch.cnpj, entity.organizationId, "legalEntityBranch.cnpj"),
      stateRegistration: decryptCompanyField(branch.stateRegistration, entity.organizationId, "legalEntityBranch.stateRegistration"),
      municipalRegistration: decryptCompanyField(branch.municipalRegistration, entity.organizationId, "legalEntityBranch.municipalRegistration"),
      addressLine1: decryptCompanyField(branch.addressLine1, entity.organizationId, "legalEntityBranch.addressLine1"),
      addressLine2: decryptCompanyField(branch.addressLine2, entity.organizationId, "legalEntityBranch.addressLine2"),
      district: decryptCompanyField(branch.district, entity.organizationId, "legalEntityBranch.district"),
      city: decryptCompanyField(branch.city, entity.organizationId, "legalEntityBranch.city"),
      state: decryptCompanyField(branch.state, entity.organizationId, "legalEntityBranch.state"),
      postalCode: decryptCompanyField(branch.postalCode, entity.organizationId, "legalEntityBranch.postalCode")
    })),
    shareholders: entity.shareholders?.map((shareholder) => ({
      ...shareholder,
      name: decryptCompanyField(shareholder.name, entity.organizationId, "legalEntityShareholder.name") ?? shareholder.name,
      documentNumber: decryptCompanyField(shareholder.documentNumber, entity.organizationId, "legalEntityShareholder.documentNumber") ?? shareholder.documentNumber,
      role: decryptCompanyField(shareholder.role, entity.organizationId, "legalEntityShareholder.role"),
      notes: decryptCompanyField(shareholder.notes, entity.organizationId, "legalEntityShareholder.notes")
    })),
    officers: entity.officers?.map((officer) => ({
      ...officer,
      name: decryptCompanyField(officer.name, entity.organizationId, "legalEntityOfficer.name") ?? officer.name,
      email: decryptCompanyField(officer.email, entity.organizationId, "legalEntityOfficer.email"),
      phone: decryptCompanyField(officer.phone, entity.organizationId, "legalEntityOfficer.phone"),
      documentNumber: decryptCompanyField(officer.documentNumber, entity.organizationId, "legalEntityOfficer.documentNumber"),
      powers: decryptCompanyField(officer.powers, entity.organizationId, "legalEntityOfficer.powers")
    }))
  } as T;
}

export async function getCompanyModuleData(organizationId: string) {
  const [legalEntities, documents, complianceItems, projects, members, auditEvents] = await Promise.all([
    db.legalEntity.findMany({
      where: {
        organizationId
      },
      include: {
        branches: {
          orderBy: {
            createdAt: "asc"
          }
        },
        shareholders: {
          orderBy: {
            createdAt: "asc"
          }
        },
        officers: {
          orderBy: {
            createdAt: "asc"
          }
        }
      },
      orderBy: {
        createdAt: "asc"
      }
    }),
    db.companyDocument.findMany({
      where: {
        organizationId
      },
      include: {
        legalEntity: {
          select: {
            id: true,
            name: true
          }
        },
        project: {
          select: {
            id: true,
            name: true
          }
        },
        versions: {
          orderBy: {
            version: "desc"
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    }),
    db.complianceItem.findMany({
      where: {
        organizationId
      },
      include: {
        legalEntity: {
          select: {
            id: true,
            name: true
          }
        },
        project: {
          select: {
            id: true,
            name: true
          }
        },
        sourceDocument: {
          select: {
            id: true,
            title: true
          }
        },
        ownerUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        {
          dueAt: "asc"
        },
        {
          createdAt: "desc"
        }
      ]
    }),
    db.project.findMany({
      where: {
        organizationId
      },
      select: {
        id: true,
        name: true
      },
      orderBy: {
        name: "asc"
      }
    }),
    db.organizationMember.findMany({
      where: {
        organizationId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        joinedAt: "asc"
      }
    }),
    db.auditEvent.findMany({
      where: {
        organizationId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 100
    })
  ]);

  return {
    legalEntities: legalEntities.map(decryptLegalEntity),
    documents,
    complianceItems,
    projects,
    members,
    auditEvents
  };
}

export async function createLegalEntity(params: {
  organizationId: string;
  userId: string;
  name: string;
  tradeName?: string;
  cnpj?: string;
  countryCode?: string;
  legalNature?: string;
  taxRegime?: TaxRegime;
  cnaePrimary?: string;
  email?: string;
  phone?: string;
  websiteUrl?: string;
  city?: string;
  state?: string;
}) {
  await enforceSubscriptionCapability(params.organizationId, "companyHub");

  const slug = await buildUniqueSlug(slugify(params.name), async (candidate) => {
    const count = await db.legalEntity.count({
      where: {
        organizationId: params.organizationId,
        slug: candidate
      }
    });

    return count > 0;
  });

  const entity = await db.legalEntity.create({
    data: {
      organizationId: params.organizationId,
      name: params.name.trim(),
      slug,
      tradeName: encryptCompanyField(params.tradeName, params.organizationId, "legalEntity.tradeName"),
      cnpj: encryptCompanyField(params.cnpj, params.organizationId, "legalEntity.cnpj"),
      countryCode: params.countryCode?.trim().toUpperCase() || "US",
      legalNature: encryptCompanyField(params.legalNature, params.organizationId, "legalEntity.legalNature"),
      taxRegime: params.taxRegime ?? TaxRegime.OTHER,
      cnaePrimary: encryptCompanyField(params.cnaePrimary, params.organizationId, "legalEntity.cnaePrimary"),
      email: encryptCompanyField(params.email, params.organizationId, "legalEntity.email"),
      phone: encryptCompanyField(params.phone, params.organizationId, "legalEntity.phone"),
      websiteUrl: params.websiteUrl?.trim() || null,
      city: encryptCompanyField(params.city, params.organizationId, "legalEntity.city"),
      state: encryptCompanyField(params.state, params.organizationId, "legalEntity.state"),
      status: "ACTIVE"
    }
  });

  await createAuditEvent(db, {
    organizationId: params.organizationId,
    userId: params.userId,
    entityType: "legal_entity",
    entityId: entity.id,
    action: "legal_entity.created",
    metadata: {
      protectedFields: ["cnpj", "tradeName", "email", "phone"]
    }
  });

  return decryptLegalEntity(entity);
}

export async function updateLegalEntity(params: {
  organizationId: string;
  entityId: string;
  userId: string;
  name: string;
  tradeName?: string;
  cnpj?: string;
  countryCode?: string;
  legalNature?: string;
  taxRegime?: TaxRegime;
  cnaePrimary?: string;
  email?: string;
  phone?: string;
  websiteUrl?: string;
  city?: string;
  state?: string;
  addressLine1?: string;
  district?: string;
  postalCode?: string;
  notes?: string;
}) {
  await enforceSubscriptionCapability(params.organizationId, "companyHub");

  const entity = await db.legalEntity.findFirst({
    where: {
      id: params.entityId,
      organizationId: params.organizationId
    }
  });

  if (!entity) {
    throw new Error("Legal entity not found.");
  }

  const updated = await db.legalEntity.update({
    where: {
      id: entity.id
    },
    data: {
      name: params.name.trim(),
      tradeName: encryptCompanyField(params.tradeName, params.organizationId, "legalEntity.tradeName"),
      cnpj: encryptCompanyField(params.cnpj, params.organizationId, "legalEntity.cnpj"),
      countryCode: params.countryCode?.trim().toUpperCase() || entity.countryCode,
      legalNature: encryptCompanyField(params.legalNature, params.organizationId, "legalEntity.legalNature"),
      taxRegime: params.taxRegime ?? entity.taxRegime,
      cnaePrimary: encryptCompanyField(params.cnaePrimary, params.organizationId, "legalEntity.cnaePrimary"),
      email: encryptCompanyField(params.email, params.organizationId, "legalEntity.email"),
      phone: encryptCompanyField(params.phone, params.organizationId, "legalEntity.phone"),
      websiteUrl: params.websiteUrl?.trim() || null,
      city: encryptCompanyField(params.city, params.organizationId, "legalEntity.city"),
      state: encryptCompanyField(params.state, params.organizationId, "legalEntity.state"),
      addressLine1: encryptCompanyField(params.addressLine1, params.organizationId, "legalEntity.addressLine1"),
      district: encryptCompanyField(params.district, params.organizationId, "legalEntity.district"),
      postalCode: encryptCompanyField(params.postalCode, params.organizationId, "legalEntity.postalCode"),
      notes: encryptCompanyField(params.notes, params.organizationId, "legalEntity.notes")
    }
  });

  await createAuditEvent(db, {
    organizationId: params.organizationId,
    userId: params.userId,
    entityType: "legal_entity",
    entityId: updated.id,
    action: "legal_entity.updated",
    metadata: {
      protectedFields: ["cnpj", "tradeName", "email", "phone", "address"]
    }
  });

  return decryptLegalEntity(updated);
}

export async function createLegalEntityBranch(params: {
  organizationId: string;
  legalEntityId: string;
  userId: string;
  name: string;
  code?: string;
  city?: string;
  state?: string;
  cnpj?: string;
}) {
  await enforceSubscriptionCapability(params.organizationId, "companyHub");

  const entity = await db.legalEntity.findFirst({
    where: {
      id: params.legalEntityId,
      organizationId: params.organizationId
    }
  });

  if (!entity) {
    throw new Error("Legal entity not found.");
  }

  const branch = await db.legalEntityBranch.create({
    data: {
      legalEntityId: entity.id,
      name: params.name.trim(),
      code: params.code?.trim() || null,
      city: encryptCompanyField(params.city, params.organizationId, "legalEntityBranch.city"),
      state: encryptCompanyField(params.state, params.organizationId, "legalEntityBranch.state"),
      cnpj: encryptCompanyField(params.cnpj, params.organizationId, "legalEntityBranch.cnpj")
    }
  });

  await createAuditEvent(db, {
    organizationId: params.organizationId,
    userId: params.userId,
    entityType: "legal_entity_branch",
    entityId: branch.id,
    action: "legal_entity_branch.created",
    metadata: {
      legalEntityId: entity.id,
      protectedFields: ["cnpj", "city", "state"]
    }
  });

  return branch;
}

export async function createLegalEntityShareholder(params: {
  organizationId: string;
  legalEntityId: string;
  userId: string;
  name: string;
  documentNumber: string;
  role?: string;
  ownershipPercent?: number;
}) {
  await enforceSubscriptionCapability(params.organizationId, "companyHub");

  const entity = await db.legalEntity.findFirst({
    where: {
      id: params.legalEntityId,
      organizationId: params.organizationId
    }
  });

  if (!entity) {
    throw new Error("Legal entity not found.");
  }

  const shareholder = await db.legalEntityShareholder.create({
    data: {
      legalEntityId: entity.id,
      name: encryptCompanyField(params.name, params.organizationId, "legalEntityShareholder.name") ?? params.name.trim(),
      documentNumber: encryptCompanyField(params.documentNumber, params.organizationId, "legalEntityShareholder.documentNumber") ?? params.documentNumber.trim(),
      role: encryptCompanyField(params.role, params.organizationId, "legalEntityShareholder.role"),
      ownershipPercent: typeof params.ownershipPercent === "number" ? params.ownershipPercent : null
    }
  });

  await createAuditEvent(db, {
    organizationId: params.organizationId,
    userId: params.userId,
    entityType: "legal_entity_shareholder",
    entityId: shareholder.id,
    action: "legal_entity_shareholder.created",
    metadata: {
      legalEntityId: entity.id,
      protectedFields: ["name", "documentNumber"]
    }
  });

  return shareholder;
}

export async function createLegalEntityOfficer(params: {
  organizationId: string;
  legalEntityId: string;
  userId: string;
  name: string;
  title: string;
  email?: string;
}) {
  await enforceSubscriptionCapability(params.organizationId, "companyHub");

  const entity = await db.legalEntity.findFirst({
    where: {
      id: params.legalEntityId,
      organizationId: params.organizationId
    }
  });

  if (!entity) {
    throw new Error("Legal entity not found.");
  }

  const officer = await db.legalEntityOfficer.create({
    data: {
      legalEntityId: entity.id,
      name: encryptCompanyField(params.name, params.organizationId, "legalEntityOfficer.name") ?? params.name.trim(),
      title: params.title.trim(),
      email: encryptCompanyField(params.email, params.organizationId, "legalEntityOfficer.email")
    }
  });

  await createAuditEvent(db, {
    organizationId: params.organizationId,
    userId: params.userId,
    entityType: "legal_entity_officer",
    entityId: officer.id,
    action: "legal_entity_officer.created",
    metadata: {
      legalEntityId: entity.id,
      protectedFields: ["name", "email"]
    }
  });

  return officer;
}

export async function createCompanyDocument(params: {
  organizationId: string;
  userId: string;
  title: string;
  type: CompanyDocumentType;
  legalEntityId?: string;
  projectId?: string;
  issuer?: string;
  documentNumber?: string;
  expiresAt?: Date | null;
  storagePath: string;
  originalName: string;
  mimeType: string;
  sizeBytes?: number;
  checksum?: string;
}) {
  await enforceSubscriptionCapability(params.organizationId, "documentVault");

  const document = await db.companyDocument.create({
    data: {
      organizationId: params.organizationId,
      legalEntityId: params.legalEntityId || null,
      projectId: params.projectId || null,
      title: params.title.trim(),
      type: params.type,
      status: CompanyDocumentStatus.ACTIVE,
      issuer: params.issuer?.trim() || null,
      documentNumber: params.documentNumber?.trim() || null,
      expiresAt: params.expiresAt ?? null,
      versions: {
        create: {
          version: 1,
          storagePath: params.storagePath.trim(),
          originalName: params.originalName.trim(),
          mimeType: params.mimeType.trim(),
          sizeBytes: params.sizeBytes,
          checksum: params.checksum,
          uploadedById: params.userId
        }
      }
    },
    include: {
      versions: true
    }
  });

  await createAuditEvent(db, {
    organizationId: params.organizationId,
    userId: params.userId,
    entityType: "company_document",
    entityId: document.id,
    action: "company_document.created",
    metadata: {
      title: document.title,
      type: document.type
    }
  });

  return document;
}

export async function addCompanyDocumentVersion(params: {
  organizationId: string;
  documentId: string;
  userId: string;
  storagePath: string;
  originalName: string;
  mimeType: string;
  sizeBytes?: number;
  checksum?: string;
}) {
  await enforceSubscriptionCapability(params.organizationId, "documentVault");

  const document = await db.companyDocument.findFirst({
    where: {
      id: params.documentId,
      organizationId: params.organizationId
    },
    include: {
      versions: {
        orderBy: {
          version: "desc"
        },
        take: 1
      }
    }
  });

  if (!document) {
    throw new Error("Document not found.");
  }

  const nextVersion = (document.versions[0]?.version ?? 0) + 1;
  const version = await db.companyDocumentVersion.create({
    data: {
      documentId: document.id,
      version: nextVersion,
      storagePath: params.storagePath.trim(),
      originalName: params.originalName.trim(),
      mimeType: params.mimeType.trim(),
      sizeBytes: params.sizeBytes,
      checksum: params.checksum,
      uploadedById: params.userId
    }
  });

  await createAuditEvent(db, {
    organizationId: params.organizationId,
    userId: params.userId,
    entityType: "company_document_version",
    entityId: version.id,
    action: "company_document.version_created",
    metadata: {
      documentId: document.id,
      version: version.version
    }
  });

  return version;
}

export async function createComplianceItem(params: {
  organizationId: string;
  userId: string;
  title: string;
  type: ComplianceType;
  legalEntityId?: string;
  projectId?: string;
  ownerUserId?: string;
  sourceDocumentId?: string;
  dueAt?: Date | null;
  notes?: string;
}) {
  await enforceSubscriptionCapability(params.organizationId, "companyHub");

  const item = await db.complianceItem.create({
    data: {
      organizationId: params.organizationId,
      title: params.title.trim(),
      type: params.type,
      legalEntityId: params.legalEntityId || null,
      projectId: params.projectId || null,
      ownerUserId: params.ownerUserId || null,
      sourceDocumentId: params.sourceDocumentId || null,
      dueAt: params.dueAt ?? null,
      notes: params.notes?.trim() || null
    }
  });

  await createAuditEvent(db, {
    organizationId: params.organizationId,
    userId: params.userId,
    entityType: "compliance_item",
    entityId: item.id,
    action: "compliance_item.created",
    metadata: {
      title: item.title,
      type: item.type
    }
  });

  return item;
}

export async function updateComplianceItem(params: {
  organizationId: string;
  itemId: string;
  userId: string;
  status: ComplianceStatus;
  notes?: string;
}) {
  await enforceSubscriptionCapability(params.organizationId, "companyHub");

  const item = await db.complianceItem.findFirst({
    where: {
      id: params.itemId,
      organizationId: params.organizationId
    }
  });

  if (!item) {
    throw new Error("Compliance item not found.");
  }

  const updated = await db.complianceItem.update({
    where: {
      id: item.id
    },
    data: {
      status: params.status,
      notes: params.notes?.trim() || item.notes,
      completedAt: params.status === ComplianceStatus.COMPLETED ? new Date() : null
    }
  });

  await createAuditEvent(db, {
    organizationId: params.organizationId,
    userId: params.userId,
    entityType: "compliance_item",
    entityId: updated.id,
    action: "compliance_item.updated",
    metadata: {
      status: updated.status
    }
  });

  return updated;
}
