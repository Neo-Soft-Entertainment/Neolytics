import {
  ApprovalStatus,
  BudgetStatus,
  ContractCounterpartyType,
  ContractStatus,
  ExpenseCategory,
  FinanceEntryStatus,
  InvoiceStatus,
  ProjectMilestoneStatus,
  RevenueSourceType,
  RoyaltyStatus
} from "@prisma/client";

import { createAuditEvent } from "@/lib/audit-service";
import { db } from "@/lib/db";

const approvalThresholdCents = 100_000;

function toNumber(value: bigint | number | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value);
}

function getMonthKey(value: Date) {
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(value: Date) {
  return value.toLocaleString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  });
}

function getRecentMonths(total: number) {
  const months: Array<{ key: string; label: string }> = [];
  const cursor = new Date();
  cursor.setUTCDate(1);
  cursor.setUTCHours(0, 0, 0, 0);

  for (let index = total - 1; index >= 0; index -= 1) {
    const monthDate = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() - index, 1));
    months.push({
      key: getMonthKey(monthDate),
      label: getMonthLabel(monthDate)
    });
  }

  return months;
}

async function ensureApprovalRequest(params: {
  organizationId: string;
  projectId?: string | null;
  contractId?: string | null;
  requestedById: string;
  entityType: string;
  entityId: string;
  actionLabel: string;
  amountCents?: bigint | null;
  reason?: string | null;
}) {
  if (!params.amountCents || Number(params.amountCents) < approvalThresholdCents) {
    return null;
  }

  const existing = await db.approvalRequest.findFirst({
    where: {
      organizationId: params.organizationId,
      entityType: params.entityType,
      entityId: params.entityId,
      status: ApprovalStatus.PENDING
    }
  });

  if (existing) {
    return db.approvalRequest.update({
      where: {
        id: existing.id
      },
      data: {
        projectId: params.projectId ?? null,
        contractId: params.contractId ?? null,
        actionLabel: params.actionLabel,
        amountCents: params.amountCents,
        reason: params.reason?.trim() || null
      }
    });
  }

  return db.approvalRequest.create({
    data: {
      organizationId: params.organizationId,
      projectId: params.projectId ?? null,
      contractId: params.contractId ?? null,
      requestedById: params.requestedById,
      entityType: params.entityType,
      entityId: params.entityId,
      actionLabel: params.actionLabel,
      amountCents: params.amountCents,
      reason: params.reason?.trim() || null
    }
  });
}

export async function getFinanceOverview(organizationId: string) {
  const [projects, budgets, revenueEntries, expenseEntries, contracts, royaltyAgreements, royaltyStatements, issuedInvoices, receivedInvoices, approvalRequests] = await Promise.all([
    db.project.findMany({
      where: {
        organizationId
      },
      select: {
        id: true,
        name: true,
        stage: true
      },
      orderBy: {
        createdAt: "asc"
      }
    }),
    db.budget.findMany({
      where: {
        organizationId
      },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        },
        lines: {
          orderBy: [
            { dueAt: "asc" },
            { createdAt: "desc" }
          ]
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    }),
    db.revenueEntry.findMany({
      where: {
        organizationId
      },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        receivedAt: "desc"
      }
    }),
    db.expenseEntry.findMany({
      where: {
        organizationId
      },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        occurredAt: "desc"
      }
    }),
    db.contract.findMany({
      where: {
        organizationId
      },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    }),
    db.royaltyAgreement.findMany({
      where: {
        organizationId
      },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        },
        contract: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    }),
    db.royaltyStatement.findMany({
      where: {
        organizationId
      },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        },
        royaltyAgreement: {
          select: {
            id: true,
            name: true,
            partnerName: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    }),
    db.issuedInvoice.findMany({
      where: {
        organizationId
      },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        },
        contract: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    }),
    db.receivedInvoice.findMany({
      where: {
        organizationId
      },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        },
        contract: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    }),
    db.approvalRequest.findMany({
      where: {
        organizationId
      },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        },
        contract: {
          select: {
            id: true,
            title: true
          }
        },
        requestedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        decidedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    })
  ]);

  const totalBudgetPlannedCents = budgets.reduce((sum, budget) => sum + toNumber(budget.totalPlannedCents), 0);
  const totalBudgetActualCents = budgets.reduce(
    (sum, budget) => sum + budget.lines.reduce((lineSum, line) => lineSum + toNumber(line.actualCents), 0),
    0
  );
  const totalRevenueNetCents = revenueEntries
    .filter((entry) => entry.status === FinanceEntryStatus.RECEIVED)
    .reduce((sum, entry) => sum + toNumber(entry.netCents), 0);
  const totalExpensesPaidCents = expenseEntries
    .filter((entry) => entry.status === FinanceEntryStatus.PAID)
    .reduce((sum, entry) => sum + toNumber(entry.amountCents), 0);
  const pendingRevenueCents = revenueEntries
    .filter((entry) => entry.status !== FinanceEntryStatus.RECEIVED && entry.status !== FinanceEntryStatus.CANCELED)
    .reduce((sum, entry) => sum + toNumber(entry.netCents), 0);
  const pendingExpenseCents = expenseEntries
    .filter((entry) => entry.status !== FinanceEntryStatus.PAID && entry.status !== FinanceEntryStatus.CANCELED)
    .reduce((sum, entry) => sum + toNumber(entry.amountCents), 0);
  const royaltiesDueCents = royaltyStatements
    .filter((statement) => !statement.paidAt)
    .reduce((sum, statement) => sum + toNumber(statement.royaltyDueCents), 0);
  const pendingApprovalsCount = approvalRequests.filter((request) => request.status === ApprovalStatus.PENDING).length;

  const months = getRecentMonths(6);
  const monthlyByKey = new Map(
    months.map((month) => [month.key, { month: month.label, inflowCents: 0, outflowCents: 0, netCents: 0 }])
  );

  for (const entry of revenueEntries) {
    if (entry.status !== FinanceEntryStatus.RECEIVED) {
      continue;
    }

    const month = monthlyByKey.get(getMonthKey(entry.receivedAt));

    if (!month) {
      continue;
    }

    month.inflowCents += toNumber(entry.netCents);
    month.netCents += toNumber(entry.netCents);
  }

  for (const entry of expenseEntries) {
    if (entry.status !== FinanceEntryStatus.PAID) {
      continue;
    }

    const referenceDate = entry.paidAt ?? entry.occurredAt;
    const month = monthlyByKey.get(getMonthKey(referenceDate));

    if (!month) {
      continue;
    }

    month.outflowCents += toNumber(entry.amountCents);
    month.netCents -= toNumber(entry.amountCents);
  }

  const projectMap = new Map<string, {
    projectId: string;
    projectName: string;
    stage: string;
    budgetPlannedCents: number;
    budgetActualCents: number;
    revenueNetCents: number;
    expensesPaidCents: number;
    netCents: number;
  }>();

  for (const project of projects) {
    projectMap.set(project.id, {
      projectId: project.id,
      projectName: project.name,
      stage: project.stage,
      budgetPlannedCents: 0,
      budgetActualCents: 0,
      revenueNetCents: 0,
      expensesPaidCents: 0,
      netCents: 0
    });
  }

  for (const budget of budgets) {
    if (!budget.projectId) {
      continue;
    }

    const snapshot = projectMap.get(budget.projectId);

    if (!snapshot) {
      continue;
    }

    snapshot.budgetPlannedCents += toNumber(budget.totalPlannedCents);
    snapshot.budgetActualCents += budget.lines.reduce((sum, line) => sum + toNumber(line.actualCents), 0);
  }

  for (const entry of revenueEntries) {
    if (!entry.projectId || entry.status !== FinanceEntryStatus.RECEIVED) {
      continue;
    }

    const snapshot = projectMap.get(entry.projectId);

    if (!snapshot) {
      continue;
    }

    snapshot.revenueNetCents += toNumber(entry.netCents);
    snapshot.netCents += toNumber(entry.netCents);
  }

  for (const entry of expenseEntries) {
    if (!entry.projectId || entry.status !== FinanceEntryStatus.PAID) {
      continue;
    }

    const snapshot = projectMap.get(entry.projectId);

    if (!snapshot) {
      continue;
    }

    snapshot.expensesPaidCents += toNumber(entry.amountCents);
    snapshot.netCents -= toNumber(entry.amountCents);
  }

  return {
    projects,
    budgets,
    revenueEntries,
    expenseEntries,
    contracts,
    royaltyAgreements,
    royaltyStatements,
    issuedInvoices,
    receivedInvoices,
    approvalRequests,
    summary: {
      activeBudgetsCount: budgets.filter((budget) => budget.status === BudgetStatus.ACTIVE).length,
      totalBudgetPlannedCents,
      totalBudgetActualCents,
      totalRevenueNetCents,
      totalExpensesPaidCents,
      pendingRevenueCents,
      pendingExpenseCents,
      royaltiesDueCents,
      pendingApprovalsCount,
      netCashCents: totalRevenueNetCents - totalExpensesPaidCents
    },
    cashflow: Array.from(monthlyByKey.values()),
    projectSnapshots: Array.from(projectMap.values())
      .filter((item) => item.budgetPlannedCents > 0 || item.revenueNetCents > 0 || item.expensesPaidCents > 0)
      .sort((left, right) => right.netCents - left.netCents)
  };
}

export async function createBudget(params: {
  organizationId: string;
  userId: string;
  projectId?: string;
  name: string;
  status?: BudgetStatus;
  currencyCode?: string;
  startsAt?: Date;
  endsAt?: Date;
  notes?: string;
}) {
  const budget = await db.budget.create({
    data: {
      organizationId: params.organizationId,
      projectId: params.projectId || null,
      name: params.name.trim(),
      status: params.status ?? BudgetStatus.DRAFT,
      currencyCode: params.currencyCode?.trim().toUpperCase() || "USD",
      startsAt: params.startsAt,
      endsAt: params.endsAt,
      notes: params.notes?.trim() || null
    }
  });

  await createAuditEvent(db, {
    organizationId: params.organizationId,
    userId: params.userId,
    entityType: "budget",
    entityId: budget.id,
    action: "budget.created",
    metadata: {
      name: budget.name,
      projectId: budget.projectId
    }
  });

  return budget;
}

export async function updateBudget(params: {
  organizationId: string;
  userId: string;
  budgetId: string;
  projectId?: string;
  name: string;
  status: BudgetStatus;
  currencyCode?: string;
  startsAt?: Date;
  endsAt?: Date;
  notes?: string;
}) {
  const budget = await db.budget.findFirst({
    where: {
      id: params.budgetId,
      organizationId: params.organizationId
    }
  });

  if (!budget) {
    throw new Error("Budget not found.");
  }

  const updated = await db.budget.update({
    where: {
      id: budget.id
    },
    data: {
      projectId: params.projectId || null,
      name: params.name.trim(),
      status: params.status,
      currencyCode: params.currencyCode?.trim().toUpperCase() || budget.currencyCode,
      startsAt: params.startsAt ?? null,
      endsAt: params.endsAt ?? null,
      notes: params.notes?.trim() || null
    }
  });

  await createAuditEvent(db, {
    organizationId: params.organizationId,
    userId: params.userId,
    entityType: "budget",
    entityId: updated.id,
    action: "budget.updated",
    metadata: {
      status: updated.status,
      projectId: updated.projectId
    }
  });

  return updated;
}

export async function createBudgetLine(params: {
  organizationId: string;
  userId: string;
  budgetId: string;
  category: string;
  description: string;
  vendorName?: string;
  plannedCents: number;
  actualCents?: number;
  dueAt?: Date;
  paidAt?: Date;
}) {
  const budget = await db.budget.findFirst({
    where: {
      id: params.budgetId,
      organizationId: params.organizationId
    }
  });

  if (!budget) {
    throw new Error("Budget not found.");
  }

  const line = await db.$transaction(async (tx) => {
    const created = await tx.budgetLine.create({
      data: {
        budgetId: budget.id,
        category: params.category.trim(),
        description: params.description.trim(),
        vendorName: params.vendorName?.trim() || null,
        plannedCents: BigInt(params.plannedCents),
        actualCents: BigInt(params.actualCents ?? 0),
        dueAt: params.dueAt,
        paidAt: params.paidAt
      }
    });
    const aggregate = await tx.budgetLine.aggregate({
      where: {
        budgetId: budget.id
      },
      _sum: {
        plannedCents: true
      }
    });

    await tx.budget.update({
      where: {
        id: budget.id
      },
      data: {
        totalPlannedCents: aggregate._sum.plannedCents ?? BigInt(0)
      }
    });

    return created;
  });

  await createAuditEvent(db, {
    organizationId: params.organizationId,
    userId: params.userId,
    entityType: "budget_line",
    entityId: line.id,
    action: "budget_line.created",
    metadata: {
      budgetId: budget.id,
      category: line.category
    }
  });

  await ensureApprovalRequest({
    organizationId: params.organizationId,
    requestedById: params.userId,
    entityType: "budget_line",
    entityId: line.id,
    actionLabel: "Budget line review",
    amountCents: BigInt(params.plannedCents),
    reason: "Budget allocation above review threshold."
  });

  return line;
}

export async function updateBudgetLine(params: {
  organizationId: string;
  userId: string;
  lineId: string;
  category: string;
  description: string;
  vendorName?: string;
  plannedCents: number;
  actualCents: number;
  dueAt?: Date;
  paidAt?: Date;
}) {
  const line = await db.budgetLine.findFirst({
    where: {
      id: params.lineId,
      budget: {
        organizationId: params.organizationId
      }
    },
    include: {
      budget: true
    }
  });

  if (!line) {
    throw new Error("Budget line not found.");
  }

  const updated = await db.$transaction(async (tx) => {
    const saved = await tx.budgetLine.update({
      where: {
        id: line.id
      },
      data: {
        category: params.category.trim(),
        description: params.description.trim(),
        vendorName: params.vendorName?.trim() || null,
        plannedCents: BigInt(params.plannedCents),
        actualCents: BigInt(params.actualCents),
        dueAt: params.dueAt ?? null,
        paidAt: params.paidAt ?? null
      }
    });
    const aggregate = await tx.budgetLine.aggregate({
      where: {
        budgetId: line.budgetId
      },
      _sum: {
        plannedCents: true
      }
    });

    await tx.budget.update({
      where: {
        id: line.budgetId
      },
      data: {
        totalPlannedCents: aggregate._sum.plannedCents ?? BigInt(0)
      }
    });

    return saved;
  });

  await createAuditEvent(db, {
    organizationId: params.organizationId,
    userId: params.userId,
    entityType: "budget_line",
    entityId: updated.id,
    action: "budget_line.updated",
    metadata: {
      budgetId: line.budgetId,
      category: updated.category
    }
  });

  await ensureApprovalRequest({
    organizationId: params.organizationId,
    requestedById: params.userId,
    entityType: "budget_line",
    entityId: updated.id,
    actionLabel: "Budget line review",
    amountCents: BigInt(params.plannedCents),
    reason: "Budget allocation above review threshold."
  });

  return updated;
}

export async function createRevenueEntry(params: {
  organizationId: string;
  userId: string;
  projectId?: string;
  sourceType: RevenueSourceType;
  sourceName: string;
  status: FinanceEntryStatus;
  grossCents: number;
  netCents: number;
  currencyCode?: string;
  receivedAt: Date;
  notes?: string;
}) {
  const entry = await db.revenueEntry.create({
    data: {
      organizationId: params.organizationId,
      projectId: params.projectId || null,
      sourceType: params.sourceType,
      sourceName: params.sourceName.trim(),
      status: params.status,
      grossCents: BigInt(params.grossCents),
      netCents: BigInt(params.netCents),
      currencyCode: params.currencyCode?.trim().toUpperCase() || "USD",
      receivedAt: params.receivedAt,
      notes: params.notes?.trim() || null
    }
  });

  await createAuditEvent(db, {
    organizationId: params.organizationId,
    userId: params.userId,
    entityType: "revenue_entry",
    entityId: entry.id,
    action: "revenue_entry.created",
    metadata: {
      sourceType: entry.sourceType,
      projectId: entry.projectId
    }
  });

  await ensureApprovalRequest({
    organizationId: params.organizationId,
    projectId: entry.projectId,
    requestedById: params.userId,
    entityType: "revenue_entry",
    entityId: entry.id,
    actionLabel: "Revenue entry review",
    amountCents: entry.netCents,
    reason: "Revenue recognition above review threshold."
  });

  return entry;
}

export async function updateRevenueEntry(params: {
  organizationId: string;
  userId: string;
  entryId: string;
  projectId?: string;
  sourceType: RevenueSourceType;
  sourceName: string;
  status: FinanceEntryStatus;
  grossCents: number;
  netCents: number;
  currencyCode?: string;
  receivedAt: Date;
  notes?: string;
}) {
  const entry = await db.revenueEntry.findFirst({
    where: {
      id: params.entryId,
      organizationId: params.organizationId
    }
  });

  if (!entry) {
    throw new Error("Revenue entry not found.");
  }

  const updated = await db.revenueEntry.update({
    where: {
      id: entry.id
    },
    data: {
      projectId: params.projectId || null,
      sourceType: params.sourceType,
      sourceName: params.sourceName.trim(),
      status: params.status,
      grossCents: BigInt(params.grossCents),
      netCents: BigInt(params.netCents),
      currencyCode: params.currencyCode?.trim().toUpperCase() || entry.currencyCode,
      receivedAt: params.receivedAt,
      notes: params.notes?.trim() || null
    }
  });

  await createAuditEvent(db, {
    organizationId: params.organizationId,
    userId: params.userId,
    entityType: "revenue_entry",
    entityId: updated.id,
    action: "revenue_entry.updated",
    metadata: {
      status: updated.status,
      projectId: updated.projectId
    }
  });

  await ensureApprovalRequest({
    organizationId: params.organizationId,
    projectId: updated.projectId,
    requestedById: params.userId,
    entityType: "revenue_entry",
    entityId: updated.id,
    actionLabel: "Revenue entry review",
    amountCents: updated.netCents,
    reason: "Revenue recognition above review threshold."
  });

  return updated;
}

export async function createExpenseEntry(params: {
  organizationId: string;
  userId: string;
  projectId?: string;
  category: ExpenseCategory;
  vendorName: string;
  status: FinanceEntryStatus;
  amountCents: number;
  currencyCode?: string;
  occurredAt: Date;
  dueAt?: Date;
  paidAt?: Date;
  notes?: string;
}) {
  const entry = await db.expenseEntry.create({
    data: {
      organizationId: params.organizationId,
      projectId: params.projectId || null,
      category: params.category,
      vendorName: params.vendorName.trim(),
      status: params.status,
      amountCents: BigInt(params.amountCents),
      currencyCode: params.currencyCode?.trim().toUpperCase() || "USD",
      occurredAt: params.occurredAt,
      dueAt: params.dueAt,
      paidAt: params.paidAt,
      notes: params.notes?.trim() || null
    }
  });

  await createAuditEvent(db, {
    organizationId: params.organizationId,
    userId: params.userId,
    entityType: "expense_entry",
    entityId: entry.id,
    action: "expense_entry.created",
    metadata: {
      category: entry.category,
      projectId: entry.projectId
    }
  });

  await ensureApprovalRequest({
    organizationId: params.organizationId,
    projectId: entry.projectId,
    requestedById: params.userId,
    entityType: "expense_entry",
    entityId: entry.id,
    actionLabel: "Expense entry review",
    amountCents: entry.amountCents,
    reason: "Expense above review threshold."
  });

  return entry;
}

export async function updateExpenseEntry(params: {
  organizationId: string;
  userId: string;
  entryId: string;
  projectId?: string;
  category: ExpenseCategory;
  vendorName: string;
  status: FinanceEntryStatus;
  amountCents: number;
  currencyCode?: string;
  occurredAt: Date;
  dueAt?: Date;
  paidAt?: Date;
  notes?: string;
}) {
  const entry = await db.expenseEntry.findFirst({
    where: {
      id: params.entryId,
      organizationId: params.organizationId
    }
  });

  if (!entry) {
    throw new Error("Expense entry not found.");
  }

  const updated = await db.expenseEntry.update({
    where: {
      id: entry.id
    },
    data: {
      projectId: params.projectId || null,
      category: params.category,
      vendorName: params.vendorName.trim(),
      status: params.status,
      amountCents: BigInt(params.amountCents),
      currencyCode: params.currencyCode?.trim().toUpperCase() || entry.currencyCode,
      occurredAt: params.occurredAt,
      dueAt: params.dueAt ?? null,
      paidAt: params.paidAt ?? null,
      notes: params.notes?.trim() || null
    }
  });

  await createAuditEvent(db, {
    organizationId: params.organizationId,
    userId: params.userId,
    entityType: "expense_entry",
    entityId: updated.id,
    action: "expense_entry.updated",
    metadata: {
      status: updated.status,
      projectId: updated.projectId
    }
  });

  await ensureApprovalRequest({
    organizationId: params.organizationId,
    projectId: updated.projectId,
    requestedById: params.userId,
    entityType: "expense_entry",
    entityId: updated.id,
    actionLabel: "Expense entry review",
    amountCents: updated.amountCents,
    reason: "Expense above review threshold."
  });

  return updated;
}

export async function createContract(params: {
  organizationId: string;
  userId: string;
  projectId?: string;
  title: string;
  counterpartyName: string;
  counterpartyType: ContractCounterpartyType;
  status: ContractStatus;
  currencyCode?: string;
  totalValueCents?: number | null;
  startsAt?: Date;
  endsAt?: Date;
  signedAt?: Date;
  autoRenews?: boolean;
  notes?: string;
}) {
  const contract = await db.contract.create({
    data: {
      organizationId: params.organizationId,
      projectId: params.projectId || null,
      title: params.title.trim(),
      counterpartyName: params.counterpartyName.trim(),
      counterpartyType: params.counterpartyType,
      status: params.status,
      currencyCode: params.currencyCode?.trim().toUpperCase() || "USD",
      totalValueCents: params.totalValueCents === null || params.totalValueCents === undefined ? null : BigInt(params.totalValueCents),
      startsAt: params.startsAt,
      endsAt: params.endsAt,
      signedAt: params.signedAt,
      autoRenews: Boolean(params.autoRenews),
      notes: params.notes?.trim() || null
    }
  });

  await ensureApprovalRequest({
    organizationId: params.organizationId,
    projectId: contract.projectId,
    contractId: contract.id,
    requestedById: params.userId,
    entityType: "contract",
    entityId: contract.id,
    actionLabel: "Contract review",
    amountCents: contract.totalValueCents,
    reason: "Commercial agreement above review threshold."
  });

  await createAuditEvent(db, {
    organizationId: params.organizationId,
    userId: params.userId,
    entityType: "contract",
    entityId: contract.id,
    action: "contract.created",
    metadata: {
      projectId: contract.projectId,
      counterpartyType: contract.counterpartyType,
      status: contract.status
    }
  });

  return contract;
}

export async function updateContract(params: {
  organizationId: string;
  userId: string;
  contractId: string;
  projectId?: string;
  title: string;
  counterpartyName: string;
  counterpartyType: ContractCounterpartyType;
  status: ContractStatus;
  currencyCode?: string;
  totalValueCents?: number | null;
  startsAt?: Date;
  endsAt?: Date;
  signedAt?: Date;
  autoRenews?: boolean;
  notes?: string;
}) {
  const contract = await db.contract.findFirst({
    where: {
      id: params.contractId,
      organizationId: params.organizationId
    }
  });

  if (!contract) {
    throw new Error("Contract not found.");
  }

  const updated = await db.contract.update({
    where: {
      id: contract.id
    },
    data: {
      projectId: params.projectId || null,
      title: params.title.trim(),
      counterpartyName: params.counterpartyName.trim(),
      counterpartyType: params.counterpartyType,
      status: params.status,
      currencyCode: params.currencyCode?.trim().toUpperCase() || contract.currencyCode,
      totalValueCents: params.totalValueCents === null || params.totalValueCents === undefined ? null : BigInt(params.totalValueCents),
      startsAt: params.startsAt ?? null,
      endsAt: params.endsAt ?? null,
      signedAt: params.signedAt ?? null,
      autoRenews: Boolean(params.autoRenews),
      notes: params.notes?.trim() || null
    }
  });

  await ensureApprovalRequest({
    organizationId: params.organizationId,
    projectId: updated.projectId,
    contractId: updated.id,
    requestedById: params.userId,
    entityType: "contract",
    entityId: updated.id,
    actionLabel: "Contract review",
    amountCents: updated.totalValueCents,
    reason: "Commercial agreement above review threshold."
  });

  await createAuditEvent(db, {
    organizationId: params.organizationId,
    userId: params.userId,
    entityType: "contract",
    entityId: updated.id,
    action: "contract.updated",
    metadata: {
      projectId: updated.projectId,
      status: updated.status
    }
  });

  return updated;
}

export async function createRoyaltyAgreement(params: {
  organizationId: string;
  userId: string;
  projectId?: string;
  contractId?: string;
  name: string;
  partnerName: string;
  status: RoyaltyStatus;
  basisPoints: number;
  recoupable?: boolean;
  recoupCapCents?: number | null;
  notes?: string;
}) {
  const agreement = await db.royaltyAgreement.create({
    data: {
      organizationId: params.organizationId,
      projectId: params.projectId || null,
      contractId: params.contractId || null,
      name: params.name.trim(),
      partnerName: params.partnerName.trim(),
      status: params.status,
      basisPoints: params.basisPoints,
      recoupable: Boolean(params.recoupable),
      recoupCapCents: params.recoupCapCents === null || params.recoupCapCents === undefined ? null : BigInt(params.recoupCapCents),
      notes: params.notes?.trim() || null
    }
  });

  await createAuditEvent(db, {
    organizationId: params.organizationId,
    userId: params.userId,
    entityType: "royalty_agreement",
    entityId: agreement.id,
    action: "royalty_agreement.created",
    metadata: {
      projectId: agreement.projectId,
      contractId: agreement.contractId,
      basisPoints: agreement.basisPoints
    }
  });

  return agreement;
}

export async function createRoyaltyStatement(params: {
  organizationId: string;
  userId: string;
  projectId?: string;
  royaltyAgreementId: string;
  periodLabel: string;
  periodStart?: Date;
  periodEnd?: Date;
  grossRevenueCents: number;
  deductibleCents?: number;
  notes?: string;
}) {
  const agreement = await db.royaltyAgreement.findFirst({
    where: {
      id: params.royaltyAgreementId,
      organizationId: params.organizationId
    }
  });

  if (!agreement) {
    throw new Error("Royalty agreement not found.");
  }

  const grossRevenueCents = BigInt(params.grossRevenueCents);
  const deductibleCents = BigInt(params.deductibleCents ?? 0);
  const netRevenueCents = grossRevenueCents - deductibleCents;
  const royaltyDueCents = (netRevenueCents * BigInt(agreement.basisPoints)) / BigInt(10_000);

  const statement = await db.royaltyStatement.create({
    data: {
      organizationId: params.organizationId,
      projectId: params.projectId || agreement.projectId || null,
      royaltyAgreementId: agreement.id,
      periodLabel: params.periodLabel.trim(),
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      grossRevenueCents,
      deductibleCents,
      netRevenueCents,
      royaltyDueCents,
      notes: params.notes?.trim() || null
    }
  });

  await ensureApprovalRequest({
    organizationId: params.organizationId,
    projectId: statement.projectId,
    requestedById: params.userId,
    entityType: "royalty_statement",
    entityId: statement.id,
    actionLabel: "Royalty payout review",
    amountCents: statement.royaltyDueCents,
    reason: "Royalty due above review threshold."
  });

  await createAuditEvent(db, {
    organizationId: params.organizationId,
    userId: params.userId,
    entityType: "royalty_statement",
    entityId: statement.id,
    action: "royalty_statement.created",
    metadata: {
      projectId: statement.projectId,
      royaltyAgreementId: statement.royaltyAgreementId
    }
  });

  return statement;
}

export async function createIssuedInvoice(params: {
  organizationId: string;
  userId: string;
  projectId?: string;
  contractId?: string;
  invoiceNumber: string;
  customerName: string;
  status: InvoiceStatus;
  amountCents: number;
  currencyCode?: string;
  issuedAt?: Date;
  dueAt?: Date;
  paidAt?: Date;
  notes?: string;
}) {
  const invoice = await db.issuedInvoice.create({
    data: {
      organizationId: params.organizationId,
      projectId: params.projectId || null,
      contractId: params.contractId || null,
      invoiceNumber: params.invoiceNumber.trim(),
      customerName: params.customerName.trim(),
      status: params.status,
      amountCents: BigInt(params.amountCents),
      currencyCode: params.currencyCode?.trim().toUpperCase() || "USD",
      issuedAt: params.issuedAt,
      dueAt: params.dueAt,
      paidAt: params.paidAt,
      notes: params.notes?.trim() || null
    }
  });

  await ensureApprovalRequest({
    organizationId: params.organizationId,
    projectId: invoice.projectId,
    contractId: invoice.contractId,
    requestedById: params.userId,
    entityType: "issued_invoice",
    entityId: invoice.id,
    actionLabel: "Issued invoice review",
    amountCents: invoice.amountCents,
    reason: "Issued invoice above review threshold."
  });

  await createAuditEvent(db, {
    organizationId: params.organizationId,
    userId: params.userId,
    entityType: "issued_invoice",
    entityId: invoice.id,
    action: "issued_invoice.created",
    metadata: {
      projectId: invoice.projectId,
      contractId: invoice.contractId,
      status: invoice.status
    }
  });

  return invoice;
}

export async function createReceivedInvoice(params: {
  organizationId: string;
  userId: string;
  projectId?: string;
  contractId?: string;
  invoiceNumber: string;
  vendorName: string;
  status: InvoiceStatus;
  amountCents: number;
  currencyCode?: string;
  issuedAt?: Date;
  dueAt?: Date;
  paidAt?: Date;
  notes?: string;
}) {
  const invoice = await db.receivedInvoice.create({
    data: {
      organizationId: params.organizationId,
      projectId: params.projectId || null,
      contractId: params.contractId || null,
      invoiceNumber: params.invoiceNumber.trim(),
      vendorName: params.vendorName.trim(),
      status: params.status,
      amountCents: BigInt(params.amountCents),
      currencyCode: params.currencyCode?.trim().toUpperCase() || "USD",
      issuedAt: params.issuedAt,
      dueAt: params.dueAt,
      paidAt: params.paidAt,
      notes: params.notes?.trim() || null
    }
  });

  await ensureApprovalRequest({
    organizationId: params.organizationId,
    projectId: invoice.projectId,
    contractId: invoice.contractId,
    requestedById: params.userId,
    entityType: "received_invoice",
    entityId: invoice.id,
    actionLabel: "Received invoice review",
    amountCents: invoice.amountCents,
    reason: "Received invoice above review threshold."
  });

  await createAuditEvent(db, {
    organizationId: params.organizationId,
    userId: params.userId,
    entityType: "received_invoice",
    entityId: invoice.id,
    action: "received_invoice.created",
    metadata: {
      projectId: invoice.projectId,
      contractId: invoice.contractId,
      status: invoice.status
    }
  });

  return invoice;
}

export async function createProjectMilestone(params: {
  projectId: string;
  workspaceId: string;
  title: string;
  description?: string;
  ownerLabel?: string;
  status?: ProjectMilestoneStatus;
  dueAt?: Date;
  completedAt?: Date;
  budgetedCostCents?: number;
  expectedRevenueCents?: number;
}) {
  const project = await db.project.findFirst({
    where: {
      id: params.projectId,
      workspaceId: params.workspaceId
    },
    include: {
      milestones: {
        orderBy: {
          sortOrder: "desc"
        },
        take: 1
      }
    }
  });

  if (!project) {
    throw new Error("Project not found.");
  }

  await db.projectMilestone.create({
    data: {
      projectId: project.id,
      title: params.title.trim(),
      description: params.description?.trim() || null,
      ownerLabel: params.ownerLabel?.trim() || null,
      status: params.status ?? ProjectMilestoneStatus.PLANNED,
      dueAt: params.dueAt,
      completedAt: params.completedAt,
      budgetedCostCents: BigInt(params.budgetedCostCents ?? 0),
      expectedRevenueCents: BigInt(params.expectedRevenueCents ?? 0),
      sortOrder: (project.milestones[0]?.sortOrder ?? -1) + 1
    }
  });
}

export async function updateProjectMilestone(params: {
  projectId: string;
  workspaceId: string;
  milestoneId: string;
  title: string;
  description?: string;
  ownerLabel?: string;
  status: ProjectMilestoneStatus;
  dueAt?: Date;
  completedAt?: Date;
  budgetedCostCents?: number;
  expectedRevenueCents?: number;
}) {
  const milestone = await db.projectMilestone.findFirst({
    where: {
      id: params.milestoneId,
      projectId: params.projectId,
      project: {
        workspaceId: params.workspaceId
      }
    }
  });

  if (!milestone) {
    throw new Error("Milestone not found.");
  }

  await db.projectMilestone.update({
    where: {
      id: milestone.id
    },
    data: {
      title: params.title.trim(),
      description: params.description?.trim() || null,
      ownerLabel: params.ownerLabel?.trim() || null,
      status: params.status,
      dueAt: params.dueAt ?? null,
      completedAt: params.completedAt ?? null,
      budgetedCostCents: BigInt(params.budgetedCostCents ?? 0),
      expectedRevenueCents: BigInt(params.expectedRevenueCents ?? 0)
    }
  });
}

export async function updateApprovalRequest(params: {
  organizationId: string;
  userId: string;
  approvalRequestId: string;
  status: ApprovalStatus;
  decisionNotes?: string;
}) {
  const request = await db.approvalRequest.findFirst({
    where: {
      id: params.approvalRequestId,
      organizationId: params.organizationId
    }
  });

  if (!request) {
    throw new Error("Approval request not found.");
  }

  const updated = await db.approvalRequest.update({
    where: {
      id: request.id
    },
    data: {
      status: params.status,
      decisionNotes: params.decisionNotes?.trim() || null,
      decidedById: params.userId,
      decidedAt: new Date()
    }
  });

  await createAuditEvent(db, {
    organizationId: params.organizationId,
    userId: params.userId,
    entityType: "approval_request",
    entityId: updated.id,
    action: "approval_request.updated",
    metadata: {
      status: updated.status,
      entityType: updated.entityType,
      entityId: updated.entityId
    }
  });

  return updated;
}
