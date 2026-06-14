import { db } from "../src/lib/db";
import { encryptNullableString, isEncryptedString } from "../src/lib/security/encryption";

const apply = process.argv.includes("--apply");
let checked = 0;
let updated = 0;

function encrypt(value: string | null | undefined, context: string) {
  checked += 1;

  if (!value || isEncryptedString(value)) {
    return value ?? null;
  }

  updated += 1;
  return encryptNullableString(value, context);
}

async function migrateProjects() {
  const fields = [
    "elevatorPitch",
    "description",
    "genreInput",
    "tagInput",
    "targetAudience",
    "coreLoop",
    "differentiator",
    "monetizationModel",
    "artDirection",
    "playerFantasy"
  ] as const;
  const projects = await db.project.findMany();

  for (const project of projects) {
    const data: Record<string, string | null> = {};

    for (const field of fields) {
      data[field] = encrypt(project[field], `project:${project.organizationId}:${project.workspaceId}:${field}`);
    }

    if (apply) {
      await db.project.update({
        where: {
          id: project.id
        },
        data
      });
    }
  }
}

async function migrateProjectGdds() {
  const gdds = await db.projectGdd.findMany();

  for (const gdd of gdds) {
    const content = encrypt(gdd.content, `projectGdd:${gdd.projectId}:content`);

    if (apply) {
      await db.projectGdd.update({
        where: {
          id: gdd.id
        },
        data: {
          content: content ?? gdd.content
        }
      });
    }
  }
}

async function migrateCommunityPosts() {
  const posts = await db.communityPost.findMany();

  for (const post of posts) {
    const title = encrypt(post.title, `communityPost:${post.organizationId}:title`);
    const content = encrypt(post.content, `communityPost:${post.organizationId}:content`);

    if (apply) {
      await db.communityPost.update({
        where: {
          id: post.id
        },
        data: {
          title: title ?? post.title,
          content: content ?? post.content
        }
      });
    }
  }
}

async function migrateCompanyData() {
  const legalEntityFields = [
    "tradeName",
    "cnpj",
    "legalNature",
    "cnaePrimary",
    "email",
    "phone",
    "addressLine1",
    "addressLine2",
    "district",
    "city",
    "state",
    "postalCode",
    "notes"
  ] as const;
  const legalEntities = await db.legalEntity.findMany();

  for (const entity of legalEntities) {
    const data: Record<string, string | null> = {};

    for (const field of legalEntityFields) {
      data[field] = encrypt(entity[field], `company:${entity.organizationId}:legalEntity.${field}`);
    }

    if (apply) {
      await db.legalEntity.update({
        where: {
          id: entity.id
        },
        data
      });
    }
  }

  const branches = await db.legalEntityBranch.findMany({
    include: {
      legalEntity: {
        select: {
          organizationId: true
        }
      }
    }
  });

  for (const branch of branches) {
    const organizationId = branch.legalEntity.organizationId;
    const data = {
      cnpj: encrypt(branch.cnpj, `company:${organizationId}:legalEntityBranch.cnpj`),
      stateRegistration: encrypt(branch.stateRegistration, `company:${organizationId}:legalEntityBranch.stateRegistration`),
      municipalRegistration: encrypt(branch.municipalRegistration, `company:${organizationId}:legalEntityBranch.municipalRegistration`),
      addressLine1: encrypt(branch.addressLine1, `company:${organizationId}:legalEntityBranch.addressLine1`),
      addressLine2: encrypt(branch.addressLine2, `company:${organizationId}:legalEntityBranch.addressLine2`),
      district: encrypt(branch.district, `company:${organizationId}:legalEntityBranch.district`),
      city: encrypt(branch.city, `company:${organizationId}:legalEntityBranch.city`),
      state: encrypt(branch.state, `company:${organizationId}:legalEntityBranch.state`),
      postalCode: encrypt(branch.postalCode, `company:${organizationId}:legalEntityBranch.postalCode`)
    };

    if (apply) {
      await db.legalEntityBranch.update({
        where: {
          id: branch.id
        },
        data
      });
    }
  }

  const shareholders = await db.legalEntityShareholder.findMany({
    include: {
      legalEntity: {
        select: {
          organizationId: true
        }
      }
    }
  });

  for (const shareholder of shareholders) {
    const organizationId = shareholder.legalEntity.organizationId;
    const data = {
      name: encrypt(shareholder.name, `company:${organizationId}:legalEntityShareholder.name`) ?? shareholder.name,
      documentNumber: encrypt(shareholder.documentNumber, `company:${organizationId}:legalEntityShareholder.documentNumber`) ?? shareholder.documentNumber,
      role: encrypt(shareholder.role, `company:${organizationId}:legalEntityShareholder.role`),
      notes: encrypt(shareholder.notes, `company:${organizationId}:legalEntityShareholder.notes`)
    };

    if (apply) {
      await db.legalEntityShareholder.update({
        where: {
          id: shareholder.id
        },
        data
      });
    }
  }

  const officers = await db.legalEntityOfficer.findMany({
    include: {
      legalEntity: {
        select: {
          organizationId: true
        }
      }
    }
  });

  for (const officer of officers) {
    const organizationId = officer.legalEntity.organizationId;
    const data = {
      name: encrypt(officer.name, `company:${organizationId}:legalEntityOfficer.name`) ?? officer.name,
      email: encrypt(officer.email, `company:${organizationId}:legalEntityOfficer.email`),
      phone: encrypt(officer.phone, `company:${organizationId}:legalEntityOfficer.phone`),
      documentNumber: encrypt(officer.documentNumber, `company:${organizationId}:legalEntityOfficer.documentNumber`),
      powers: encrypt(officer.powers, `company:${organizationId}:legalEntityOfficer.powers`)
    };

    if (apply) {
      await db.legalEntityOfficer.update({
        where: {
          id: officer.id
        },
        data
      });
    }
  }
}

async function migrateFinanceData() {
  const payableTitles = await db.payableTitle.findMany();

  for (const title of payableTitles) {
    const data = {
      natureDescription: encrypt(title.natureDescription, `finance:${title.organizationId}:payableTitle.natureDescription`) ?? title.natureDescription,
      supplierIdentifier: encrypt(title.supplierIdentifier, `finance:${title.organizationId}:payableTitle.supplierIdentifier`) ?? title.supplierIdentifier,
      supplierName: encrypt(title.supplierName, `finance:${title.organizationId}:payableTitle.supplierName`) ?? title.supplierName,
      notes: encrypt(title.notes, `finance:${title.organizationId}:payableTitle.notes`)
    };

    if (apply) {
      await db.payableTitle.update({
        where: {
          id: title.id
        },
        data
      });
    }
  }

  const allocations = await db.payableAllocation.findMany({
    include: {
      payableTitle: {
        select: {
          organizationId: true
        }
      }
    }
  });

  for (const allocation of allocations) {
    const natureDescription = encrypt(
      allocation.natureDescription,
      `finance:${allocation.payableTitle.organizationId}:payableAllocation.natureDescription`
    );

    if (apply) {
      await db.payableAllocation.update({
        where: {
          id: allocation.id
        },
        data: {
          natureDescription: natureDescription ?? allocation.natureDescription
        }
      });
    }
  }

  const payments = await db.payablePayment.findMany();

  for (const payment of payments) {
    const data = {
      bank: encrypt(payment.bank, `finance:${payment.organizationId}:payablePayment.bank`),
      branch: encrypt(payment.branch, `finance:${payment.organizationId}:payablePayment.branch`),
      account: encrypt(payment.account, `finance:${payment.organizationId}:payablePayment.account`),
      history: encrypt(payment.history, `finance:${payment.organizationId}:payablePayment.history`)
    };

    if (apply) {
      await db.payablePayment.update({
        where: {
          id: payment.id
        },
        data
      });
    }
  }

  const contracts = await db.contract.findMany();

  for (const contract of contracts) {
    const data = {
      counterpartyName: encrypt(contract.counterpartyName, `finance:${contract.organizationId}:contract.counterpartyName`) ?? contract.counterpartyName,
      notes: encrypt(contract.notes, `finance:${contract.organizationId}:contract.notes`)
    };

    if (apply) {
      await db.contract.update({
        where: {
          id: contract.id
        },
        data
      });
    }
  }

  const royaltyAgreements = await db.royaltyAgreement.findMany();

  for (const agreement of royaltyAgreements) {
    const data = {
      partnerName: encrypt(agreement.partnerName, `finance:${agreement.organizationId}:royaltyAgreement.partnerName`) ?? agreement.partnerName,
      notes: encrypt(agreement.notes, `finance:${agreement.organizationId}:royaltyAgreement.notes`)
    };

    if (apply) {
      await db.royaltyAgreement.update({
        where: {
          id: agreement.id
        },
        data
      });
    }
  }

  const royaltyStatements = await db.royaltyStatement.findMany();

  for (const statement of royaltyStatements) {
    const notes = encrypt(statement.notes, `finance:${statement.organizationId}:royaltyStatement.notes`);

    if (apply) {
      await db.royaltyStatement.update({
        where: {
          id: statement.id
        },
        data: {
          notes
        }
      });
    }
  }

  const issuedInvoices = await db.issuedInvoice.findMany();

  for (const invoice of issuedInvoices) {
    const data = {
      customerName: encrypt(invoice.customerName, `finance:${invoice.organizationId}:issuedInvoice.customerName`) ?? invoice.customerName,
      notes: encrypt(invoice.notes, `finance:${invoice.organizationId}:issuedInvoice.notes`)
    };

    if (apply) {
      await db.issuedInvoice.update({
        where: {
          id: invoice.id
        },
        data
      });
    }
  }

  const receivedInvoices = await db.receivedInvoice.findMany();

  for (const invoice of receivedInvoices) {
    const data = {
      vendorName: encrypt(invoice.vendorName, `finance:${invoice.organizationId}:receivedInvoice.vendorName`) ?? invoice.vendorName,
      notes: encrypt(invoice.notes, `finance:${invoice.organizationId}:receivedInvoice.notes`)
    };

    if (apply) {
      await db.receivedInvoice.update({
        where: {
          id: invoice.id
        },
        data
      });
    }
  }
}

await migrateProjects();
await migrateProjectGdds();
await migrateCommunityPosts();
await migrateCompanyData();
await migrateFinanceData();
await db.$disconnect();

let migrationMode = "Dry run";
if (apply) {
  migrationMode = "Applied";
}

console.log(`${migrationMode} sensitive business data migration.`);
console.log(`Fields checked: ${checked}`);
console.log(`Fields requiring encryption: ${updated}`);

if (!apply) {
  console.log("Run with --apply after confirming backups and ENCRYPTION_KEYS.");
}
