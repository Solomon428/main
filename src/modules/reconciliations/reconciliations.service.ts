// ============================================================================
// Reconciliations Service
// ============================================================================

import { prisma } from '../../db/prisma';

export async function listReconciliations() {
  return prisma.reconciliation.findMany({
    include: {
      bankAccount: true,
      items: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getReconciliation(id: string) {
  return prisma.reconciliation.findUnique({
    where: { id },
    include: {
      bankAccount: true,
      items: true,
    },
  });
}

export async function createReconciliation(data: any) {
  return prisma.reconciliation.create({
    data,
    include: {
      bankAccount: true,
      items: true,
    },
  });
}

export async function matchItems(reconciliationId: string, data: any) {
  // Implementation for matching items
  return prisma.reconciliationItem.updateMany({
    where: { reconciliationId },
    data: {
      status: 'MATCHED',
      matchedPaymentId: data.paymentId,
      matchedAmount: data.amount,
    },
  });
}

export async function getReconciliationItems(reconciliationId: string) {
  return prisma.reconciliationItem.findMany({
    where: { reconciliationId },
    orderBy: { transactionDate: 'desc' },
  });
}
