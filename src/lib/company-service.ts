import { CompanyDocumentStatus, CompanyDocumentType, ComplianceStatus, ComplianceType, TaxRegime } from "@prisma/client";

import { createAuditEvent } from "@/lib/audit-service";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slugify";
import { buildUniqueSlug } from "@/lib/unique-slug";

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
    legalEntities,
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
  legalNature?: string;
  taxRegime?: TaxRegime;
  cnaePrimary?: string;
  email?: string;
  phone?: string;
  websiteUrl?: string;
  city?: string;
  state?: string;
}) {
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
      tradeName: params.tradeName?.trim() || null,
      cnpj: params.cnpj?.trim() || null,
      legalNature: params.legalNature?.trim() || null,
      taxRegime: params.taxRegime ?? TaxRegime.OTHER,
      cnaePrimary: params.cnaePrimary?.trim() || null,
      email: params.email?.trim() || null,
      phone: params.phone?.trim() || null,
      websiteUrl: params.websiteUrl?.trim() || null,
      city: params.city?.trim() || null,
      state: params.state?.trim() || null,
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
      name: entity.name,
      cnpj: entity.cnpj
    }
  });

  return entity;
}

export async function updateLegalEntity(params: {
  organizationId: string;
  entityId: string;
  userId: string;
  name: string;
  tradeName?: string;
  cnpj?: string;
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
      tradeName: params.tradeName?.trim() || null,
      cnpj: params.cnpj?.trim() || null,
      legalNature: params.legalNature?.trim() || null,
      taxRegime: params.taxRegime ?? entity.taxRegime,
      cnaePrimary: params.cnaePrimary?.trim() || null,
      email: params.email?.trim() || null,
      phone: params.phone?.trim() || null,
      websiteUrl: params.websiteUrl?.trim() || null,
      city: params.city?.trim() || null,
      state: params.state?.trim() || null,
      addressLine1: params.addressLine1?.trim() || null,
      district: params.district?.trim() || null,
      postalCode: params.postalCode?.trim() || null,
      notes: params.notes?.trim() || null
    }
  });

  await createAuditEvent(db, {
    organizationId: params.organizationId,
    userId: params.userId,
    entityType: "legal_entity",
    entityId: updated.id,
    action: "legal_entity.updated",
    metadata: {
      name: updated.name
    }
  });

  return updated;
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
      city: params.city?.trim() || null,
      state: params.state?.trim() || null,
      cnpj: params.cnpj?.trim() || null
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
      name: branch.name
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
      name: params.name.trim(),
      documentNumber: params.documentNumber.trim(),
      role: params.role?.trim() || null,
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
      name: shareholder.name
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
      name: params.name.trim(),
      title: params.title.trim(),
      email: params.email?.trim() || null
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
      name: officer.name
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
}) {
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
}) {
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
