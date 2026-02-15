// ============================================================================
// Reconciliation Items Service
// ============================================================================

import { prisma } from '../../db/prisma';
import { ReconciliationItemStatus } from '../../domain/enums/ReconciliationItemStatus';
import { TransactionType } from '../../domain/enums/TransactionType';
import { Currency } from '../../domain/enums/Currency';

export interface CreateReconciliationItemInput {
  reconciliationId: string;
  transactionDate: Date;
  description: string;
  reference?: string;
  amount: number;
  currency?: Currency;
  transactionType: TransactionType;
}

export interface MatchItemInput {
  paymentId: string;
  matchedAmount?: number;
  matchingMethod?: string;
}

/**
 * List all items for a reconciliation
 */
export async function listReconciliationItems(
  reconciliationId: string,
  options?: {
    status?: ReconciliationItemStatus;
    page?: number;
    limit?: number;
  }
) {
  const where: any = { reconciliationId };

  if (options?.status) where.status = options.status;

  const page = options?.page || 1;
  const limit = options?.limit || 50;
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.reconciliationItem.findMany({
      where,
      include: {
        payment: {
          select: {
            id: true,
            paymentNumber: true,
            amount: true,
            paymentDate: true,
            invoice: {
              select: {
                id: true,
                invoiceNumber: true,
              },
            },
          },
        },
      },
      orderBy: { transactionDate: 'desc' },
      skip,
      take: limit,
    }),
    prisma.reconciliationItem.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get a specific reconciliation item by ID
 */
export async function getReconciliationItem(id: string) {
  return prisma.reconciliationItem.findUnique({
    where: { id },
    include: {
      reconciliation: {
        select: {
          id: true,
          statementNumber: true,
          statementDate: true,
        },
      },
      payment: {
        select: {
          id: true,
          paymentNumber: true,
          amount: true,
          paymentDate: true,
          status: true,
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              supplierName: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Create a new reconciliation item
 */
export async function createReconciliationItem(data: CreateReconciliationItemInput) {
  return prisma.reconciliationItem.create({
    data: {
      reconciliationId: data.reconciliationId,
      transactionDate: data.transactionDate,
      description: data.description,
      reference: data.reference,
      amount: data.amount,
      currency: data.currency || Currency.ZAR,
      transactionType: data.transactionType,
      status: ReconciliationItemStatus.UNMATCHED,
    },
  });
}

/**
 * Create multiple reconciliation items in bulk
 */
export async function createReconciliationItemsBulk(
  items: CreateReconciliationItemInput[]
) {
  return prisma.$transaction(
    items.map((item) =>
      prisma.reconciliationItem.create({
        data: {
          reconciliationId: item.reconciliationId,
          transactionDate: item.transactionDate,
          description: item.description,
          reference: item.reference,
          amount: item.amount,
          currency: item.currency || Currency.ZAR,
          transactionType: item.transactionType,
          status: ReconciliationItemStatus.UNMATCHED,
        },
      })
    )
  );
}

/**
 * Match a reconciliation item to a payment
 */
export async function matchReconciliationItem(
  id: string,
  matchData: MatchItemInput
) {
  const item = await prisma.reconciliationItem.findUnique({
    where: { id },
  });

  if (!item) {
    throw new Error('Reconciliation item not found');
  }

  const matchedAmount = matchData.matchedAmount || Number(item.amount);
  const matchConfidence = calculateMatchConfidence(item, matchData.paymentId);

  return prisma.reconciliationItem.update({
    where: { id },
    data: {
      status: ReconciliationItemStatus.MATCHED,
      matchedPaymentId: matchData.paymentId,
      matchedAmount,
      matchConfidence,
      matchingMethod: matchData.matchingMethod || 'MANUAL',
    },
    include: {
      payment: {
        select: {
          id: true,
          paymentNumber: true,
          amount: true,
        },
      },
    },
  });
}

/**
 * Unmatch a previously matched reconciliation item
 */
export async function unmatchReconciliationItem(id: string) {
  return prisma.reconciliationItem.update({
    where: { id },
    data: {
      status: ReconciliationItemStatus.UNMATCHED,
      matchedPaymentId: null,
      matchedAmount: null,
      matchConfidence: null,
      matchingMethod: null,
    },
  });
}

/**
 * Mark an item as disputed
 */
export async function disputeReconciliationItem(
  id: string,
  notes?: string
) {
  return prisma.reconciliationItem.update({
    where: { id },
    data: {
      status: ReconciliationItemStatus.DISPUTED,
      notes,
    },
  });
}

/**
 * Create an adjustment for a reconciliation item
 */
export async function createAdjustment(
  id: string,
  adjustmentReason: string,
  notes?: string
) {
  return prisma.reconciliationItem.update({
    where: { id },
    data: {
      status: ReconciliationItemStatus.ADJUSTED,
      isAdjustment: true,
      adjustmentReason,
      notes,
    },
  });
}

/**
 * Exclude an item from reconciliation
 */
export async function excludeReconciliationItem(
  id: string,
  notes?: string
) {
  return prisma.reconciliationItem.update({
    where: { id },
    data: {
      status: ReconciliationItemStatus.EXCLUDED,
      notes,
    },
  });
}

/**
 * Delete a reconciliation item
 */
export async function deleteReconciliationItem(id: string) {
  const item = await prisma.reconciliationItem.findUnique({
    where: { id },
  });

  if (!item) {
    throw new Error('Reconciliation item not found');
  }

  if (item.status === ReconciliationItemStatus.MATCHED) {
    throw new Error('Cannot delete a matched item. Unmatch it first.');
  }

  return prisma.reconciliationItem.delete({
    where: { id },
  });
}

/**
 * Auto-match reconciliation items to payments
 */
export async function autoMatchItems(reconciliationId: string) {
  const items = await prisma.reconciliationItem.findMany({
    where: {
      reconciliationId,
      status: ReconciliationItemStatus.UNMATCHED,
    },
  });

  const matchedItems = [];

  for (const item of items) {
    // Try to find matching payment by reference or amount + date
    const matchingPayment = await findMatchingPayment(item);

    if (matchingPayment) {
      const matchConfidence = calculateMatchConfidence(item, matchingPayment.id);

      if (matchConfidence >= 0.8) {
        // High confidence match
        const matched = await prisma.reconciliationItem.update({
          where: { id: item.id },
          data: {
            status: ReconciliationItemStatus.MATCHED,
            matchedPaymentId: matchingPayment.id,
            matchedAmount: item.amount,
            matchConfidence,
            matchingMethod: 'AUTO',
          },
        });
        matchedItems.push(matched);
      }
    }
  }

  return {
    totalItems: items.length,
    matchedCount: matchedItems.length,
    matchedItems,
  };
}

/**
 * Get reconciliation item statistics
 */
export async function getReconciliationItemStats(reconciliationId: string) {
  const stats = await prisma.reconciliationItem.groupBy({
    by: ['status'],
    where: { reconciliationId },
    _count: { status: true },
    _sum: { amount: true },
  });

  const statusCounts = stats.reduce((acc, stat) => {
    acc[stat.status] = {
      count: stat._count.status,
      totalAmount: stat._sum.amount || 0,
    };
    return acc;
  }, {} as Record<string, { count: number; totalAmount: number }>);

  const totalItems = stats.reduce((sum, s) => sum + s._count.status, 0);
  const matchedItems = statusCounts[ReconciliationItemStatus.MATCHED]?.count || 0;

  return {
    totalItems,
    matchedItems,
    unmatchedItems: totalItems - matchedItems,
    matchRate: totalItems > 0 ? (matchedItems / totalItems) * 100 : 0,
    statusCounts,
  };
}

/**
 * Get unmatched items for a reconciliation
 */
export async function getUnmatchedItems(
  reconciliationId: string,
  options?: { page?: number; limit?: number }
) {
  const page = options?.page || 1;
  const limit = options?.limit || 50;
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.reconciliationItem.findMany({
      where: {
        reconciliationId,
        status: ReconciliationItemStatus.UNMATCHED,
      },
      orderBy: { transactionDate: 'desc' },
      skip,
      take: limit,
    }),
    prisma.reconciliationItem.count({
      where: {
        reconciliationId,
        status: ReconciliationItemStatus.UNMATCHED,
      },
    }),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// Helper function to find matching payment
async function findMatchingPayment(item: {
  reference?: string | null;
  amount: number;
  transactionDate: Date;
}) {
  // Try to match by reference first
  if (item.reference) {
    const byReference = await prisma.payment.findFirst({
      where: {
        OR: [
          { bankReference: item.reference },
          { transactionId: item.reference },
          { paymentNumber: item.reference },
        ],
      },
    });

    if (byReference) return byReference;
  }

  // Try to match by amount and date proximity
  const dateRange = {
    gte: new Date(item.transactionDate.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days before
    lte: new Date(item.transactionDate.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days after
  };

  return prisma.payment.findFirst({
    where: {
      amount: item.amount,
      paymentDate: dateRange,
    },
  });
}

// Helper function to calculate match confidence
function calculateMatchConfidence(
  item: { reference?: string | null; amount: number; transactionDate: Date },
  paymentId: string
): number {
  // This is a simplified confidence calculation
  // In production, this would be more sophisticated
  let confidence = 0.5; // Base confidence

  if (item.reference) {
    confidence += 0.3;
  }

  // You could also fetch the payment and compare dates, amounts more precisely
  return Math.min(1, confidence);
}
