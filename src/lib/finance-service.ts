import {
  ApprovalStatus,
  BudgetStatus,
  ContractCounterpartyType,
  ContractStatus,
  PayablePaymentType,
  PayableTitleStatus,
  ExpenseCategory,
  FinanceEntryStatus,
  InvoiceStatus,
  ProjectMilestoneStatus,
  RevenueSourceType,
  RoyaltyStatus
} from "@prisma/client";

import { createAuditEvent } from "@/lib/audit-service";
import { db } from "@/lib/db";
import { decryptNullableString, encryptNullableString } from "@/lib/security/encryption";
import { enforceSubscriptionCapability } from "@/lib/subscription-service";

const approvalThresholdCents = 100_000;

function encryptFinanceField(value: string | null | undefined, organizationId: string, field: string) {
  return encryptNullableString(value?.trim() || null, `finance:${organizationId}:${field}`);
}

function decryptFinanceField(value: string | null | undefined, organizationId: string, field: string) {
  return decryptNullableString(value, `finance:${organizationId}:${field}`);
}

function decryptPayableTitle<T extends {
  organizationId: string;
  natureDescription: string;
  supplierIdentifier: string;
  supplierName: string;
  notes?: string | null;
  allocations?: Array<{ natureDescription: string }>;
  payments?: Array<{ bank?: string | null; branch?: string | null; account?: string | null; history?: string | null }>;
}>(title: T) {
  return {
    ...title,
    natureDescription: decryptFinanceField(title.natureDescription, title.organizationId, "payableTitle.natureDescription") ?? title.natureDescription,
    supplierIdentifier: decryptFinanceField(title.supplierIdentifier, title.organizationId, "payableTitle.supplierIdentifier") ?? title.supplierIdentifier,
    supplierName: decryptFinanceField(title.supplierName, title.organizationId, "payableTitle.supplierName") ?? title.supplierName,
    notes: decryptFinanceField(title.notes, title.organizationId, "payableTitle.notes"),
    allocations: title.allocations?.map((allocation) => ({
      ...allocation,
      natureDescription: decryptFinanceField(allocation.natureDescription, title.organizationId, "payableAllocation.natureDescription") ?? allocation.natureDescription
    })),
    payments: title.payments?.map((payment) => ({
      ...payment,
      bank: decryptFinanceField(payment.bank, title.organizationId, "payablePayment.bank"),
      branch: decryptFinanceField(payment.branch, title.organizationId, "payablePayment.branch"),
      account: decryptFinanceField(payment.account, title.organizationId, "payablePayment.account"),
      history: decryptFinanceField(payment.history, title.organizationId, "payablePayment.history")
    }))
  } as T;
}

function decryptReceivableTitle<T extends {
  organizationId: string;
  sourceDescription: string;
  customerIdentifier: string;
  customerName: string;
  notes?: string | null;
  receipts?: Array<{ bank?: string | null; branch?: string | null; account?: string | null; history?: string | null }>;
}>(title: T) {
  return {
    ...title,
    sourceDescription: decryptFinanceField(title.sourceDescription, title.organizationId, "receivableTitle.sourceDescription") ?? title.sourceDescription,
    customerIdentifier: decryptFinanceField(title.customerIdentifier, title.organizationId, "receivableTitle.customerIdentifier") ?? title.customerIdentifier,
    customerName: decryptFinanceField(title.customerName, title.organizationId, "receivableTitle.customerName") ?? title.customerName,
    notes: decryptFinanceField(title.notes, title.organizationId, "receivableTitle.notes"),
    receipts: title.receipts?.map((receipt) => ({
      ...receipt,
      bank: decryptFinanceField(receipt.bank, title.organizationId, "receivablePayment.bank"),
      branch: decryptFinanceField(receipt.branch, title.organizationId, "receivablePayment.branch"),
      account: decryptFinanceField(receipt.account, title.organizationId, "receivablePayment.account"),
      history: decryptFinanceField(receipt.history, title.organizationId, "receivablePayment.history")
    }))
  } as T;
}

function decryptContract<T extends { organizationId: string; counterpartyName: string; notes?: string | null }>(contract: T) {
  return {
    ...contract,
    counterpartyName: decryptFinanceField(contract.counterpartyName, contract.organizationId, "contract.counterpartyName") ?? contract.counterpartyName,
    notes: decryptFinanceField(contract.notes, contract.organizationId, "contract.notes")
  };
}

function decryptRoyaltyAgreement<T extends { organizationId: string; partnerName: string; notes?: string | null }>(agreement: T) {
  return {
    ...agreement,
    partnerName: decryptFinanceField(agreement.partnerName, agreement.organizationId, "royaltyAgreement.partnerName") ?? agreement.partnerName,
    notes: decryptFinanceField(agreement.notes, agreement.organizationId, "royaltyAgreement.notes")
  };
}

function decryptRoyaltyStatement<T extends { organizationId: string; notes?: string | null }>(statement: T) {
  return {
    ...statement,
    notes: decryptFinanceField(statement.notes, statement.organizationId, "royaltyStatement.notes")
  };
}

function decryptIssuedInvoice<T extends { organizationId: string; customerName: string; notes?: string | null }>(invoice: T) {
  return {
    ...invoice,
    customerName: decryptFinanceField(invoice.customerName, invoice.organizationId, "issuedInvoice.customerName") ?? invoice.customerName,
    notes: decryptFinanceField(invoice.notes, invoice.organizationId, "issuedInvoice.notes")
  };
}

function decryptReceivedInvoice<T extends { organizationId: string; vendorName: string; notes?: string | null }>(invoice: T) {
  return {
    ...invoice,
    vendorName: decryptFinanceField(invoice.vendorName, invoice.organizationId, "receivedInvoice.vendorName") ?? invoice.vendorName,
    notes: decryptFinanceField(invoice.notes, invoice.organizationId, "receivedInvoice.notes")
  };
}

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

function getUtcDateKey(value: Date) {
  return [
    value.getUTCFullYear(),
    String(value.getUTCMonth() + 1).padStart(2, "0"),
    String(value.getUTCDate()).padStart(2, "0")
  ].join("-");
}

function getEasterSunday(year: number) {
  const century = Math.floor(year / 100);
  const yearInCentury = year % 100;
  const correction = Math.floor(century / 4);
  const skippedLeapYears = century % 4;
  const moonCycle = Math.floor((century + 8) / 25);
  const leapYearAdjustment = Math.floor((century - moonCycle + 1) / 3);
  const epact = (19 * (year % 19) + century - correction - leapYearAdjustment + 15) % 30;
  const yearQuarter = Math.floor(yearInCentury / 4);
  const yearRemainder = yearInCentury % 4;
  const weekdayCorrection = (32 + 2 * skippedLeapYears + 2 * yearQuarter - epact - yearRemainder) % 7;
  const monthOffset = Math.floor((year % 19 + 11 * epact + 22 * weekdayCorrection) / 451);
  const month = Math.floor((epact + weekdayCorrection - 7 * monthOffset + 114) / 31);
  const day = ((epact + weekdayCorrection - 7 * monthOffset + 114) % 31) + 1;

  return new Date(Date.UTC(year, month - 1, day));
}

function addUtcDays(value: Date, days: number) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate() + days));
}

function isBrazilBusinessHoliday(value: Date) {
  const year = value.getUTCFullYear();
  const fixedHolidays = new Set([
    `${year}-01-01`,
    `${year}-04-21`,
    `${year}-05-01`,
    `${year}-09-07`,
    `${year}-10-12`,
    `${year}-11-02`,
    `${year}-11-15`,
    `${year}-11-20`,
    `${year}-12-25`
  ]);

  if (fixedHolidays.has(getUtcDateKey(value))) {
    return true;
  }

  const easterSunday = getEasterSunday(year);
  const movableHolidays = new Set([
    getUtcDateKey(addUtcDays(easterSunday, -48)),
    getUtcDateKey(addUtcDays(easterSunday, -47)),
    getUtcDateKey(addUtcDays(easterSunday, -2)),
    getUtcDateKey(addUtcDays(easterSunday, 60))
  ]);

  return movableHolidays.has(getUtcDateKey(value));
}

function getNextBusinessDay(value: Date) {
  const date = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));

  while (date.getUTCDay() === 0 || date.getUTCDay() === 6 || isBrazilBusinessHoliday(date)) {
    date.setUTCDate(date.getUTCDate() + 1);
  }

  return date;
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
  const [projects, costCenters] = await Promise.all([
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
    db.costCenter.findMany({
      where: {
        organizationId
      },
      orderBy: [
        { active: "desc" },
        { code: "asc" }
      ]
    })
  ]);

  const [budgets, revenueEntries, expenseEntries, payableTitles, receivableTitles] = await Promise.all([
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
    db.payableTitle.findMany({
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
        costCenter: {
          select: {
            id: true,
            code: true,
            name: true
          }
        },
        allocations: {
          include: {
            costCenter: {
              select: {
                id: true,
                code: true,
                name: true
              }
            }
          },
          orderBy: {
            createdAt: "asc"
          }
        },
        payments: {
          orderBy: {
            paymentDate: "desc"
          }
        }
      },
      orderBy: [
        { actualDueDate: "asc" },
        { createdAt: "desc" }
      ]
    }),
    db.receivableTitle.findMany({
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
        receipts: {
          orderBy: {
            receivedAt: "desc"
          }
        }
      },
      orderBy: [
        { actualDueDate: "asc" },
        { createdAt: "desc" }
      ]
    })
  ]);

  const [contracts, royaltyAgreements, royaltyStatements, issuedInvoices] = await Promise.all([
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
    })
  ]);

  const [receivedInvoices, approvalRequests] = await Promise.all([
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
  const payableOpenCents = payableTitles
    .filter((title) => title.status !== PayableTitleStatus.PAID && title.status !== PayableTitleStatus.CANCELED)
    .reduce((sum, title) => sum + Math.max(toNumber(title.totalAmountCents) - toNumber(title.paidAmountCents), 0), 0);
  const receivableOpenCents = receivableTitles
    .filter((title) => title.status !== PayableTitleStatus.PAID && title.status !== PayableTitleStatus.CANCELED)
    .reduce((sum, title) => sum + Math.max(toNumber(title.titleAmountCents) - toNumber(title.receivedAmountCents), 0), 0);
  const overduePayablesCount = payableTitles.filter((title) => {
    if (title.status === PayableTitleStatus.PAID || title.status === PayableTitleStatus.CANCELED) {
      return false;
    }

    return title.actualDueDate < new Date();
  }).length;
  const overdueReceivablesCount = receivableTitles.filter((title) => {
    if (title.status === PayableTitleStatus.PAID || title.status === PayableTitleStatus.CANCELED) {
      return false;
    }

    return title.actualDueDate < new Date();
  }).length;
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

  const revenueChannelMap = new Map<string, {
    sourceType: RevenueSourceType;
    sourceName: string;
    entriesCount: number;
    grossCents: number;
    receivedCents: number;
    pendingCents: number;
    linkedProjectIds: Set<string>;
    lastReceivedAt: Date | null;
  }>();

  for (const entry of revenueEntries) {
    const sourceName = entry.sourceName.trim() || entry.sourceType;
    const key = `${entry.sourceType}:${sourceName.toLowerCase()}`;
    const channel = revenueChannelMap.get(key) ?? {
      sourceType: entry.sourceType,
      sourceName,
      entriesCount: 0,
      grossCents: 0,
      receivedCents: 0,
      pendingCents: 0,
      linkedProjectIds: new Set<string>(),
      lastReceivedAt: null
    };

    channel.entriesCount += 1;
    channel.grossCents += toNumber(entry.grossCents);

    if (entry.status === FinanceEntryStatus.RECEIVED) {
      channel.receivedCents += toNumber(entry.netCents);
    }

    if (entry.status !== FinanceEntryStatus.RECEIVED && entry.status !== FinanceEntryStatus.CANCELED) {
      channel.pendingCents += toNumber(entry.netCents);
    }

    if (entry.projectId) {
      channel.linkedProjectIds.add(entry.projectId);
    }

    if (!channel.lastReceivedAt || entry.receivedAt > channel.lastReceivedAt) {
      channel.lastReceivedAt = entry.receivedAt;
    }

    revenueChannelMap.set(key, channel);
  }

  const openIssuedInvoices = issuedInvoices.filter((invoice) =>
    invoice.status !== InvoiceStatus.PAID && invoice.status !== InvoiceStatus.CANCELED
  );
  const overdueIssuedInvoicesCount = openIssuedInvoices.filter((invoice) => {
    if (!invoice.dueAt) {
      return false;
    }

    return invoice.dueAt < new Date();
  }).length;

  return {
    projects,
    costCenters,
    budgets,
    revenueEntries,
    expenseEntries,
    payableTitles: payableTitles.map(decryptPayableTitle),
    receivableTitles: receivableTitles.map(decryptReceivableTitle),
    contracts: contracts.map(decryptContract),
    royaltyAgreements: royaltyAgreements.map(decryptRoyaltyAgreement),
    royaltyStatements: royaltyStatements.map(decryptRoyaltyStatement),
    issuedInvoices: issuedInvoices.map(decryptIssuedInvoice),
    receivedInvoices: receivedInvoices.map(decryptReceivedInvoice),
    approvalRequests,
    summary: {
      activeBudgetsCount: budgets.filter((budget) => budget.status === BudgetStatus.ACTIVE).length,
      totalBudgetPlannedCents,
      totalBudgetActualCents,
      totalRevenueNetCents,
      totalExpensesPaidCents,
      pendingRevenueCents,
      pendingExpenseCents,
      payableOpenCents,
      receivableOpenCents,
      overduePayablesCount,
      overdueReceivablesCount,
      royaltiesDueCents,
      pendingApprovalsCount,
      netCashCents: totalRevenueNetCents - totalExpensesPaidCents
    },
    cashflow: Array.from(monthlyByKey.values()),
    commercialOperations: {
      revenueChannels: Array.from(revenueChannelMap.values())
        .map((channel) => ({
          sourceType: channel.sourceType,
          sourceName: channel.sourceName,
          entriesCount: channel.entriesCount,
          grossCents: channel.grossCents,
          receivedCents: channel.receivedCents,
          pendingCents: channel.pendingCents,
          linkedProjectsCount: channel.linkedProjectIds.size,
          lastReceivedAt: channel.lastReceivedAt
        }))
        .sort((left, right) => (right.receivedCents + right.pendingCents) - (left.receivedCents + left.pendingCents)),
      reconciliation: {
        unlinkedRevenueEntriesCount: revenueEntries.filter((entry) => !entry.projectId && entry.status !== FinanceEntryStatus.CANCELED).length,
        openIssuedInvoicesCount: openIssuedInvoices.length,
        openIssuedInvoicesCents: openIssuedInvoices.reduce((sum, invoice) => sum + toNumber(invoice.amountCents), 0),
        overdueIssuedInvoicesCount,
        pendingRoyaltyStatementsCount: royaltyStatements.filter((statement) => !statement.paidAt).length,
        royaltiesDueCents
      }
    },
    projectSnapshots: Array.from(projectMap.values())
      .filter((item) => item.budgetPlannedCents > 0 || item.revenueNetCents > 0 || item.expensesPaidCents > 0)
      .sort((left, right) => right.netCents - left.netCents)
  };
}

export async function getFinanceSummary(organizationId: string) {
  const [
    budgets,
    revenueEntries,
    expenseEntries,
    payableTitles,
    receivableTitles,
    royaltyStatements,
    approvalRequests
  ] = await Promise.all([
    db.budget.findMany({
      where: { organizationId },
      select: {
        status: true,
        totalPlannedCents: true,
        lines: {
          select: {
            actualCents: true
          }
        }
      }
    }),
    db.revenueEntry.findMany({
      where: { organizationId },
      select: {
        status: true,
        netCents: true
      }
    }),
    db.expenseEntry.findMany({
      where: { organizationId },
      select: {
        status: true,
        amountCents: true
      }
    }),
    db.payableTitle.findMany({
      where: { organizationId },
      select: {
        status: true,
        actualDueDate: true,
        totalAmountCents: true,
        paidAmountCents: true
      }
    }),
    db.receivableTitle.findMany({
      where: { organizationId },
      select: {
        status: true,
        actualDueDate: true,
        titleAmountCents: true,
        receivedAmountCents: true
      }
    }),
    db.royaltyStatement.findMany({
      where: { organizationId },
      select: {
        paidAt: true,
        royaltyDueCents: true
      }
    }),
    db.approvalRequest.findMany({
      where: { organizationId },
      select: {
        status: true
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
  const payableOpenCents = payableTitles
    .filter((title) => title.status !== PayableTitleStatus.PAID && title.status !== PayableTitleStatus.CANCELED)
    .reduce((sum, title) => sum + Math.max(toNumber(title.totalAmountCents) - toNumber(title.paidAmountCents), 0), 0);
  const receivableOpenCents = receivableTitles
    .filter((title) => title.status !== PayableTitleStatus.PAID && title.status !== PayableTitleStatus.CANCELED)
    .reduce((sum, title) => sum + Math.max(toNumber(title.titleAmountCents) - toNumber(title.receivedAmountCents), 0), 0);
  const now = new Date();
  const overduePayablesCount = payableTitles.filter((title) => {
    if (title.status === PayableTitleStatus.PAID || title.status === PayableTitleStatus.CANCELED) {
      return false;
    }

    return title.actualDueDate < now;
  }).length;
  const overdueReceivablesCount = receivableTitles.filter((title) => {
    if (title.status === PayableTitleStatus.PAID || title.status === PayableTitleStatus.CANCELED) {
      return false;
    }

    return title.actualDueDate < now;
  }).length;
  const royaltiesDueCents = royaltyStatements
    .filter((statement) => !statement.paidAt)
    .reduce((sum, statement) => sum + toNumber(statement.royaltyDueCents), 0);
  const pendingApprovalsCount = approvalRequests.filter((request) => request.status === ApprovalStatus.PENDING).length;

  return {
    activeBudgetsCount: budgets.filter((budget) => budget.status === BudgetStatus.ACTIVE).length,
    totalBudgetPlannedCents,
    totalBudgetActualCents,
    totalRevenueNetCents,
    totalExpensesPaidCents,
    pendingRevenueCents,
    pendingExpenseCents,
    payableOpenCents,
    receivableOpenCents,
    overduePayablesCount,
    overdueReceivablesCount,
    royaltiesDueCents,
    pendingApprovalsCount,
    netCashCents: totalRevenueNetCents - totalExpensesPaidCents
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
  await enforceSubscriptionCapability(params.organizationId, "financeWorkspace");

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
  await enforceSubscriptionCapability(params.organizationId, "financeWorkspace");

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
  await enforceSubscriptionCapability(params.organizationId, "financeWorkspace");

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
  await enforceSubscriptionCapability(params.organizationId, "financeWorkspace");

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
  await enforceSubscriptionCapability(params.organizationId, "financeWorkspace");

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
  await enforceSubscriptionCapability(params.organizationId, "financeWorkspace");

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
  await enforceSubscriptionCapability(params.organizationId, "financeWorkspace");

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
  await enforceSubscriptionCapability(params.organizationId, "financeWorkspace");

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

export async function createCostCenter(params: {
  organizationId: string;
  userId: string;
  code: string;
  name: string;
}) {
  await enforceSubscriptionCapability(params.organizationId, "financeWorkspace");

  const costCenter = await db.costCenter.create({
    data: {
      organizationId: params.organizationId,
      code: params.code.trim().toUpperCase(),
      name: params.name.trim()
    }
  });

  await createAuditEvent(db, {
    organizationId: params.organizationId,
    userId: params.userId,
    entityType: "cost_center",
    entityId: costCenter.id,
    action: "cost_center.created",
    metadata: {
      code: costCenter.code,
      name: costCenter.name
    }
  });

  return costCenter;
}

export async function createPayableTitle(params: {
  organizationId: string;
  userId: string;
  projectId?: string;
  costCenterId: string;
  prefix: string;
  titleNumber: string;
  documentType: string;
  natureDescription: string;
  supplierIdentifier: string;
  supplierName: string;
  issueDate: Date;
  dueDate: Date;
  titleAmountCents: number;
  additionalAmountCents?: number;
  currencyCode?: string;
  notes?: string;
  allocations?: Array<{
    costCenterId: string;
    natureDescription: string;
    amountCents: number;
  }>;
}) {
  await enforceSubscriptionCapability(params.organizationId, "invoiceOps");

  const costCenter = await db.costCenter.findFirst({
    where: {
      id: params.costCenterId,
      organizationId: params.organizationId
    }
  });

  if (!costCenter) {
    throw new Error("Cost center not found.");
  }

  const additionalAmountCents = params.additionalAmountCents ?? 0;
  const totalAmountCents = params.titleAmountCents + additionalAmountCents;
  const actualDueDate = getNextBusinessDay(params.dueDate);
  const allocations = params.allocations?.length
    ? params.allocations
    : [{
        costCenterId: params.costCenterId,
        natureDescription: params.natureDescription,
        amountCents: totalAmountCents
      }];

  const allocatedTotal = allocations.reduce((sum, allocation) => sum + allocation.amountCents, 0);

  if (allocatedTotal !== totalAmountCents) {
    throw new Error("Allocation total must match the title total.");
  }

  const allocationCostCenterIds = [...new Set(allocations.map((allocation) => allocation.costCenterId))];
  const allocationCostCenters = await db.costCenter.count({
    where: {
      organizationId: params.organizationId,
      id: {
        in: allocationCostCenterIds
      }
    }
  });

  if (allocationCostCenters !== allocationCostCenterIds.length) {
    throw new Error("One or more allocation cost centers are invalid.");
  }

  const title = await db.$transaction(async (tx) => {
    const created = await tx.payableTitle.create({
      data: {
        organizationId: params.organizationId,
        projectId: params.projectId || null,
        costCenterId: params.costCenterId,
        prefix: params.prefix.trim().toUpperCase(),
        titleNumber: params.titleNumber.trim(),
        documentType: params.documentType.trim(),
        natureDescription: encryptFinanceField(params.natureDescription, params.organizationId, "payableTitle.natureDescription") ?? params.natureDescription.trim(),
        supplierIdentifier: encryptFinanceField(params.supplierIdentifier, params.organizationId, "payableTitle.supplierIdentifier") ?? params.supplierIdentifier.trim(),
        supplierName: encryptFinanceField(params.supplierName, params.organizationId, "payableTitle.supplierName") ?? params.supplierName.trim(),
        issueDate: params.issueDate,
        dueDate: params.dueDate,
        actualDueDate,
        titleAmountCents: BigInt(params.titleAmountCents),
        additionalAmountCents: BigInt(additionalAmountCents),
        totalAmountCents: BigInt(totalAmountCents),
        currencyCode: params.currencyCode?.trim().toUpperCase() || "USD",
        notes: encryptFinanceField(params.notes, params.organizationId, "payableTitle.notes")
      }
    });

    await tx.payableAllocation.createMany({
      data: allocations.map((allocation) => ({
        payableTitleId: created.id,
        costCenterId: allocation.costCenterId,
        natureDescription: encryptFinanceField(allocation.natureDescription, params.organizationId, "payableAllocation.natureDescription") ?? allocation.natureDescription.trim(),
        amountCents: BigInt(allocation.amountCents)
      }))
    });

    return created;
  });

  await createAuditEvent(db, {
    organizationId: params.organizationId,
    userId: params.userId,
    entityType: "payable_title",
    entityId: title.id,
    action: "payable_title.created",
    metadata: {
      prefix: title.prefix,
      titleNumber: title.titleNumber,
      protectedFields: ["supplierIdentifier", "supplierName"]
    }
  });

  await ensureApprovalRequest({
    organizationId: params.organizationId,
    projectId: title.projectId,
    requestedById: params.userId,
    entityType: "payable_title",
    entityId: title.id,
    actionLabel: "Accounts payable title review",
    amountCents: title.totalAmountCents,
    reason: "Accounts payable title above review threshold."
  });

  return title;
}

export async function updatePayableTitle(params: {
  organizationId: string;
  userId: string;
  titleId: string;
  projectId?: string;
  costCenterId: string;
  prefix: string;
  titleNumber: string;
  documentType: string;
  natureDescription: string;
  supplierIdentifier: string;
  supplierName: string;
  issueDate: Date;
  dueDate: Date;
  titleAmountCents: number;
  additionalAmountCents?: number;
  currencyCode?: string;
  notes?: string;
  status?: PayableTitleStatus;
  allocations?: Array<{
    costCenterId: string;
    natureDescription: string;
    amountCents: number;
  }>;
}) {
  await enforceSubscriptionCapability(params.organizationId, "invoiceOps");

  const title = await db.payableTitle.findFirst({
    where: {
      id: params.titleId,
      organizationId: params.organizationId
    }
  });

  if (!title) {
    throw new Error("Accounts payable title not found.");
  }

  const additionalAmountCents = params.additionalAmountCents ?? 0;
  const totalAmountCents = params.titleAmountCents + additionalAmountCents;
  const actualDueDate = getNextBusinessDay(params.dueDate);
  const allocations = params.allocations?.length
    ? params.allocations
    : [{
        costCenterId: params.costCenterId,
        natureDescription: params.natureDescription,
        amountCents: totalAmountCents
      }];

  const allocatedTotal = allocations.reduce((sum, allocation) => sum + allocation.amountCents, 0);

  if (allocatedTotal !== totalAmountCents) {
    throw new Error("Allocation total must match the title total.");
  }

  const allocationCostCenterIds = [...new Set(allocations.map((allocation) => allocation.costCenterId))];
  const allocationCostCenters = await db.costCenter.count({
    where: {
      organizationId: params.organizationId,
      id: {
        in: allocationCostCenterIds
      }
    }
  });

  if (allocationCostCenters !== allocationCostCenterIds.length) {
    throw new Error("One or more allocation cost centers are invalid.");
  }

  const nextStatus = toNumber(title.paidAmountCents) >= totalAmountCents
    ? PayableTitleStatus.PAID
    : toNumber(title.paidAmountCents) > 0
      ? PayableTitleStatus.PARTIALLY_PAID
      : params.status ?? PayableTitleStatus.OPEN;

  const updated = await db.$transaction(async (tx) => {
    const saved = await tx.payableTitle.update({
      where: {
        id: title.id
      },
      data: {
        projectId: params.projectId || null,
        costCenterId: params.costCenterId,
        prefix: params.prefix.trim().toUpperCase(),
        titleNumber: params.titleNumber.trim(),
        documentType: params.documentType.trim(),
        natureDescription: encryptFinanceField(params.natureDescription, params.organizationId, "payableTitle.natureDescription") ?? params.natureDescription.trim(),
        supplierIdentifier: encryptFinanceField(params.supplierIdentifier, params.organizationId, "payableTitle.supplierIdentifier") ?? params.supplierIdentifier.trim(),
        supplierName: encryptFinanceField(params.supplierName, params.organizationId, "payableTitle.supplierName") ?? params.supplierName.trim(),
        issueDate: params.issueDate,
        dueDate: params.dueDate,
        actualDueDate,
        titleAmountCents: BigInt(params.titleAmountCents),
        additionalAmountCents: BigInt(additionalAmountCents),
        totalAmountCents: BigInt(totalAmountCents),
        currencyCode: params.currencyCode?.trim().toUpperCase() || title.currencyCode,
        notes: encryptFinanceField(params.notes, params.organizationId, "payableTitle.notes"),
        status: nextStatus
      }
    });

    await tx.payableAllocation.deleteMany({
      where: {
        payableTitleId: title.id
      }
    });

    await tx.payableAllocation.createMany({
      data: allocations.map((allocation) => ({
        payableTitleId: title.id,
        costCenterId: allocation.costCenterId,
        natureDescription: encryptFinanceField(allocation.natureDescription, params.organizationId, "payableAllocation.natureDescription") ?? allocation.natureDescription.trim(),
        amountCents: BigInt(allocation.amountCents)
      }))
    });

    return saved;
  });

  await createAuditEvent(db, {
    organizationId: params.organizationId,
    userId: params.userId,
    entityType: "payable_title",
    entityId: updated.id,
    action: "payable_title.updated",
    metadata: {
      status: updated.status,
      protectedFields: ["supplierIdentifier"]
    }
  });

  await ensureApprovalRequest({
    organizationId: params.organizationId,
    projectId: updated.projectId,
    requestedById: params.userId,
    entityType: "payable_title",
    entityId: updated.id,
    actionLabel: "Accounts payable title review",
    amountCents: updated.totalAmountCents,
    reason: "Accounts payable title above review threshold."
  });

  return updated;
}

export async function createPayablePayment(params: {
  organizationId: string;
  userId: string;
  titleId: string;
  paymentType: PayablePaymentType;
  bank?: string;
  branch?: string;
  account?: string;
  paymentDate: Date;
  history?: string;
  fineCents?: number;
  interestCents?: number;
  amountPaidCents: number;
}) {
  await enforceSubscriptionCapability(params.organizationId, "invoiceOps");

  const title = await db.payableTitle.findFirst({
    where: {
      id: params.titleId,
      organizationId: params.organizationId
    }
  });

  if (!title) {
    throw new Error("Accounts payable title not found.");
  }

  const payment = await db.$transaction(async (tx) => {
    const created = await tx.payablePayment.create({
      data: {
        organizationId: params.organizationId,
        payableTitleId: title.id,
        paymentType: params.paymentType,
        bank: encryptFinanceField(params.bank, params.organizationId, "payablePayment.bank"),
        branch: encryptFinanceField(params.branch, params.organizationId, "payablePayment.branch"),
        account: encryptFinanceField(params.account, params.organizationId, "payablePayment.account"),
        paymentDate: params.paymentDate,
        history: encryptFinanceField(params.history, params.organizationId, "payablePayment.history"),
        fineCents: BigInt(params.fineCents ?? 0),
        interestCents: BigInt(params.interestCents ?? 0),
        amountPaidCents: BigInt(params.amountPaidCents)
      }
    });

    const aggregate = await tx.payablePayment.aggregate({
      where: {
        payableTitleId: title.id
      },
      _sum: {
        amountPaidCents: true
      }
    });

    const paidAmountCents = aggregate._sum.amountPaidCents ?? BigInt(0);
    const nextStatus = paidAmountCents >= title.totalAmountCents
      ? PayableTitleStatus.PAID
      : paidAmountCents > BigInt(0)
        ? PayableTitleStatus.PARTIALLY_PAID
        : PayableTitleStatus.OPEN;

    await tx.payableTitle.update({
      where: {
        id: title.id
      },
      data: {
        paidAmountCents,
        status: nextStatus
      }
    });

    return created;
  });

  await createAuditEvent(db, {
    organizationId: params.organizationId,
    userId: params.userId,
    entityType: "payable_payment",
    entityId: payment.id,
    action: "payable_payment.created",
    metadata: {
      titleId: title.id,
      paymentType: payment.paymentType,
      amountPaidCents: Number(payment.amountPaidCents)
    }
  });

  await ensureApprovalRequest({
    organizationId: params.organizationId,
    projectId: title.projectId,
    requestedById: params.userId,
    entityType: "payable_payment",
    entityId: payment.id,
    actionLabel: "Accounts payable payment review",
    amountCents: payment.amountPaidCents,
    reason: "Accounts payable payment above review threshold."
  });

  return payment;
}

export async function createReceivableTitle(params: {
  organizationId: string;
  userId: string;
  projectId?: string;
  prefix: string;
  titleNumber: string;
  documentType: string;
  sourceDescription: string;
  customerIdentifier: string;
  customerName: string;
  issueDate: Date;
  dueDate: Date;
  titleAmountCents: number;
  currencyCode?: string;
  notes?: string;
}) {
  await enforceSubscriptionCapability(params.organizationId, "invoiceOps");

  const title = await db.receivableTitle.create({
    data: {
      organizationId: params.organizationId,
      projectId: params.projectId || null,
      prefix: params.prefix.trim().toUpperCase(),
      titleNumber: params.titleNumber.trim(),
      documentType: params.documentType.trim(),
      sourceDescription: encryptFinanceField(params.sourceDescription, params.organizationId, "receivableTitle.sourceDescription") ?? params.sourceDescription.trim(),
      customerIdentifier: encryptFinanceField(params.customerIdentifier, params.organizationId, "receivableTitle.customerIdentifier") ?? params.customerIdentifier.trim(),
      customerName: encryptFinanceField(params.customerName, params.organizationId, "receivableTitle.customerName") ?? params.customerName.trim(),
      issueDate: params.issueDate,
      dueDate: params.dueDate,
      actualDueDate: getNextBusinessDay(params.dueDate),
      titleAmountCents: BigInt(params.titleAmountCents),
      currencyCode: params.currencyCode?.trim().toUpperCase() || "USD",
      notes: encryptFinanceField(params.notes, params.organizationId, "receivableTitle.notes")
    }
  });

  await createAuditEvent(db, {
    organizationId: params.organizationId,
    userId: params.userId,
    entityType: "receivable_title",
    entityId: title.id,
    action: "receivable_title.created",
    metadata: {
      prefix: title.prefix,
      titleNumber: title.titleNumber,
      protectedFields: ["customerIdentifier", "customerName"]
    }
  });

  await ensureApprovalRequest({
    organizationId: params.organizationId,
    projectId: title.projectId,
    requestedById: params.userId,
    entityType: "receivable_title",
    entityId: title.id,
    actionLabel: "Accounts receivable title review",
    amountCents: title.titleAmountCents,
    reason: "Accounts receivable title above review threshold."
  });

  return title;
}

export async function createReceivablePayment(params: {
  organizationId: string;
  userId: string;
  titleId: string;
  paymentType: PayablePaymentType;
  bank?: string;
  branch?: string;
  account?: string;
  receivedAt: Date;
  history?: string;
  discountCents?: number;
  interestCents?: number;
  amountReceivedCents: number;
}) {
  await enforceSubscriptionCapability(params.organizationId, "invoiceOps");

  const title = await db.receivableTitle.findFirst({
    where: {
      id: params.titleId,
      organizationId: params.organizationId
    }
  });

  if (!title) {
    throw new Error("Accounts receivable title not found.");
  }

  const payment = await db.$transaction(async (tx) => {
    const created = await tx.receivablePayment.create({
      data: {
        organizationId: params.organizationId,
        receivableTitleId: title.id,
        paymentType: params.paymentType,
        bank: encryptFinanceField(params.bank, params.organizationId, "receivablePayment.bank"),
        branch: encryptFinanceField(params.branch, params.organizationId, "receivablePayment.branch"),
        account: encryptFinanceField(params.account, params.organizationId, "receivablePayment.account"),
        receivedAt: params.receivedAt,
        history: encryptFinanceField(params.history, params.organizationId, "receivablePayment.history"),
        discountCents: BigInt(params.discountCents ?? 0),
        interestCents: BigInt(params.interestCents ?? 0),
        amountReceivedCents: BigInt(params.amountReceivedCents)
      }
    });

    const aggregate = await tx.receivablePayment.aggregate({
      where: {
        receivableTitleId: title.id
      },
      _sum: {
        amountReceivedCents: true
      }
    });

    const receivedAmountCents = aggregate._sum.amountReceivedCents ?? BigInt(0);
    const nextStatus = receivedAmountCents >= title.titleAmountCents
      ? PayableTitleStatus.PAID
      : receivedAmountCents > BigInt(0)
        ? PayableTitleStatus.PARTIALLY_PAID
        : PayableTitleStatus.OPEN;

    await tx.receivableTitle.update({
      where: {
        id: title.id
      },
      data: {
        receivedAmountCents,
        status: nextStatus
      }
    });

    return created;
  });

  await createAuditEvent(db, {
    organizationId: params.organizationId,
    userId: params.userId,
    entityType: "receivable_payment",
    entityId: payment.id,
    action: "receivable_payment.created",
    metadata: {
      titleId: title.id,
      paymentType: payment.paymentType,
      amountReceivedCents: Number(payment.amountReceivedCents)
    }
  });

  return payment;
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
  await enforceSubscriptionCapability(params.organizationId, "contractsRoyalties");

  const contract = await db.contract.create({
    data: {
      organizationId: params.organizationId,
      projectId: params.projectId || null,
      title: params.title.trim(),
      counterpartyName: encryptFinanceField(params.counterpartyName, params.organizationId, "contract.counterpartyName") ?? params.counterpartyName.trim(),
      counterpartyType: params.counterpartyType,
      status: params.status,
      currencyCode: params.currencyCode?.trim().toUpperCase() || "USD",
      totalValueCents: params.totalValueCents === null || params.totalValueCents === undefined ? null : BigInt(params.totalValueCents),
      startsAt: params.startsAt,
      endsAt: params.endsAt,
      signedAt: params.signedAt,
      autoRenews: Boolean(params.autoRenews),
      notes: encryptFinanceField(params.notes, params.organizationId, "contract.notes")
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
  await enforceSubscriptionCapability(params.organizationId, "contractsRoyalties");

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
      counterpartyName: encryptFinanceField(params.counterpartyName, params.organizationId, "contract.counterpartyName") ?? params.counterpartyName.trim(),
      counterpartyType: params.counterpartyType,
      status: params.status,
      currencyCode: params.currencyCode?.trim().toUpperCase() || contract.currencyCode,
      totalValueCents: params.totalValueCents === null || params.totalValueCents === undefined ? null : BigInt(params.totalValueCents),
      startsAt: params.startsAt ?? null,
      endsAt: params.endsAt ?? null,
      signedAt: params.signedAt ?? null,
      autoRenews: Boolean(params.autoRenews),
      notes: encryptFinanceField(params.notes, params.organizationId, "contract.notes")
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
  await enforceSubscriptionCapability(params.organizationId, "contractsRoyalties");

  const agreement = await db.royaltyAgreement.create({
    data: {
      organizationId: params.organizationId,
      projectId: params.projectId || null,
      contractId: params.contractId || null,
      name: params.name.trim(),
      partnerName: encryptFinanceField(params.partnerName, params.organizationId, "royaltyAgreement.partnerName") ?? params.partnerName.trim(),
      status: params.status,
      basisPoints: params.basisPoints,
      recoupable: Boolean(params.recoupable),
      recoupCapCents: params.recoupCapCents === null || params.recoupCapCents === undefined ? null : BigInt(params.recoupCapCents),
      notes: encryptFinanceField(params.notes, params.organizationId, "royaltyAgreement.notes")
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
  await enforceSubscriptionCapability(params.organizationId, "contractsRoyalties");

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
      notes: encryptFinanceField(params.notes, params.organizationId, "royaltyStatement.notes")
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
  await enforceSubscriptionCapability(params.organizationId, "invoiceOps");

  const invoice = await db.issuedInvoice.create({
    data: {
      organizationId: params.organizationId,
      projectId: params.projectId || null,
      contractId: params.contractId || null,
      invoiceNumber: params.invoiceNumber.trim(),
      customerName: encryptFinanceField(params.customerName, params.organizationId, "issuedInvoice.customerName") ?? params.customerName.trim(),
      status: params.status,
      amountCents: BigInt(params.amountCents),
      currencyCode: params.currencyCode?.trim().toUpperCase() || "USD",
      issuedAt: params.issuedAt,
      dueAt: params.dueAt,
      paidAt: params.paidAt,
      notes: encryptFinanceField(params.notes, params.organizationId, "issuedInvoice.notes")
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
  await enforceSubscriptionCapability(params.organizationId, "invoiceOps");

  const invoice = await db.receivedInvoice.create({
    data: {
      organizationId: params.organizationId,
      projectId: params.projectId || null,
      contractId: params.contractId || null,
      invoiceNumber: params.invoiceNumber.trim(),
      vendorName: encryptFinanceField(params.vendorName, params.organizationId, "receivedInvoice.vendorName") ?? params.vendorName.trim(),
      status: params.status,
      amountCents: BigInt(params.amountCents),
      currencyCode: params.currencyCode?.trim().toUpperCase() || "USD",
      issuedAt: params.issuedAt,
      dueAt: params.dueAt,
      paidAt: params.paidAt,
      notes: encryptFinanceField(params.notes, params.organizationId, "receivedInvoice.notes")
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
  await enforceSubscriptionCapability(params.organizationId, "approvalsAudit");

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
