import { BudgetStatus, ExpenseCategory, FinanceEntryStatus, RevenueSourceType } from "@prisma/client";

import { createAuditEvent } from "@/lib/audit-service";
import { db } from "@/lib/db";

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

export async function getFinanceOverview(organizationId: string) {
  const [projects, budgets, revenueEntries, expenseEntries] = await Promise.all([
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
    summary: {
      activeBudgetsCount: budgets.filter((budget) => budget.status === BudgetStatus.ACTIVE).length,
      totalBudgetPlannedCents,
      totalBudgetActualCents,
      totalRevenueNetCents,
      totalExpensesPaidCents,
      pendingRevenueCents,
      pendingExpenseCents,
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

  return updated;
}
