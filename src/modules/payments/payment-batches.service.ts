// ============================================================================
// Payment Batches Service
// ============================================================================

import { prisma } from "../../db/prisma";
import { PaymentStatus } from "../../domain/enums/PaymentStatus";
import { Currency } from "../../domain/enums/Currency";

export interface CreatePaymentBatchInput {
  organizationId: string;
  description?: string;
  paymentDate: Date;
  scheduledFor?: Date;
  bankAccountId?: string;
  isRecurring?: boolean;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdatePaymentBatchInput {
  description?: string;
  paymentDate?: Date;
  scheduledFor?: Date;
  bankAccountId?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Generate a unique batch number
 */
function generateBatchNumber(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `BATCH-${timestamp}-${random}`;
}

/**
 * List all payment batches for an organization
 */
export async function listPaymentBatches(
  organizationId: string,
  options?: {
    status?: PaymentStatus;
    isRecurring?: boolean;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  },
) {
  const where: any = { organizationId };

  if (options?.status) where.status = options.status;
  if (options?.isRecurring !== undefined)
    where.isRecurring = options.isRecurring;

  if (options?.startDate || options?.endDate) {
    where.paymentDate = {};
    if (options.startDate) where.paymentDate.gte = options.startDate;
    if (options.endDate) where.paymentDate.lte = options.endDate;
  }

  const page = options?.page || 1;
  const limit = options?.limit || 20;
  const skip = (page - 1) * limit;

  const [batches, total] = await Promise.all([
    prisma.paymentBatch.findMany({
      where,
      include: {
        payments: {
          select: {
            id: true,
            paymentNumber: true,
            amount: true,
            currency: true,
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
        bankAccount: {
          select: {
            id: true,
            accountName: true,
            accountNumber: true,
            bankName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.paymentBatch.count({ where }),
  ]);

  return {
    batches,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get a specific payment batch by ID
 */
export async function getPaymentBatch(id: string) {
  return prisma.paymentBatch.findUnique({
    where: { id },
    include: {
      payments: {
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              supplierName: true,
              totalAmount: true,
            },
          },
          supplier: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      bankAccount: true,
    },
  });
}

/**
 * Create a new payment batch
 */
export async function createPaymentBatch(data: CreatePaymentBatchInput) {
  return prisma.paymentBatch.create({
    data: {
      organizationId: data.organizationId,
      batchNumber: generateBatchNumber(),
      description: data.description,
      paymentDate: data.paymentDate,
      scheduledFor: data.scheduledFor,
      bankAccountId: data.bankAccountId,
      status: PaymentStatus.PENDING,
      totalAmount: 0,
      paymentCount: 0,
      isRecurring: data.isRecurring || false,
      notes: data.notes,
      metadata: data.metadata || {},
    },
    include: {
      payments: true,
      bankAccount: true,
    },
  });
}

/**
 * Update an existing payment batch
 */
export async function updatePaymentBatch(
  id: string,
  data: UpdatePaymentBatchInput,
) {
  return prisma.paymentBatch.update({
    where: { id },
    data: {
      ...data,
      updatedAt: new Date(),
    },
    include: {
      payments: true,
      bankAccount: true,
    },
  });
}

/**
 * Add payments to a batch
 */
export async function addPaymentsToBatch(
  batchId: string,
  paymentIds: string[],
) {
  const batch = await prisma.paymentBatch.findUnique({
    where: { id: batchId },
    include: { payments: true },
  });

  if (!batch) {
    throw new Error("Payment batch not found");
  }

  if (batch.status !== PaymentStatus.PENDING) {
    throw new Error("Cannot add payments to a non-pending batch");
  }

  // Update payments to link them to the batch
  await prisma.payment.updateMany({
    where: {
      id: { in: paymentIds },
    },
    data: {
      paymentBatchId: batchId,
    },
  });

  // Recalculate batch totals
  const updatedBatch = await prisma.paymentBatch.findUnique({
    where: { id: batchId },
    include: { payments: true },
  });

  if (updatedBatch) {
    const totalAmount = updatedBatch.payments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0,
    );

    await prisma.paymentBatch.update({
      where: { id: batchId },
      data: {
        totalAmount,
        paymentCount: updatedBatch.payments.length,
      },
    });
  }

  return getPaymentBatch(batchId);
}

/**
 * Remove payments from a batch
 */
export async function removePaymentsFromBatch(
  batchId: string,
  paymentIds: string[],
) {
  const batch = await prisma.paymentBatch.findUnique({
    where: { id: batchId },
  });

  if (!batch) {
    throw new Error("Payment batch not found");
  }

  if (batch.status !== PaymentStatus.PENDING) {
    throw new Error("Cannot remove payments from a non-pending batch");
  }

  // Unlink payments from batch
  await prisma.payment.updateMany({
    where: {
      id: { in: paymentIds },
      paymentBatchId: batchId,
    },
    data: {
      paymentBatchId: null,
    },
  });

  // Recalculate batch totals
  const updatedBatch = await prisma.paymentBatch.findUnique({
    where: { id: batchId },
    include: { payments: true },
  });

  if (updatedBatch) {
    const totalAmount = updatedBatch.payments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0,
    );

    await prisma.paymentBatch.update({
      where: { id: batchId },
      data: {
        totalAmount,
        paymentCount: updatedBatch.payments.length,
      },
    });
  }

  return getPaymentBatch(batchId);
}

/**
 * Process a payment batch
 */
export async function processPaymentBatch(
  id: string,
  processedBy: string,
  options?: { processImmediately?: boolean },
) {
  const batch = await prisma.paymentBatch.findUnique({
    where: { id },
    include: { payments: true },
  });

  if (!batch) {
    throw new Error("Payment batch not found");
  }

  if (batch.status !== PaymentStatus.PENDING) {
    throw new Error("Batch is not in pending status");
  }

  const now = new Date();

  // Update batch status
  const updatedBatch = await prisma.paymentBatch.update({
    where: { id },
    data: {
      status: PaymentStatus.PROCESSING,
      processedAt: now,
      processedBy,
    },
    include: { payments: true },
  });

  // Process all payments in the batch if immediate processing is requested
  if (options?.processImmediately) {
    await prisma.payment.updateMany({
      where: { paymentBatchId: id },
      data: {
        status: PaymentStatus.PROCESSING,
        processedAt: now,
      },
    });
  }

  return updatedBatch;
}

/**
 * Release a payment batch for execution
 */
export async function releasePaymentBatch(id: string, releasedBy: string) {
  return prisma.paymentBatch.update({
    where: { id },
    data: {
      status: PaymentStatus.SCHEDULED,
      releasedAt: new Date(),
      releasedBy,
    },
    include: { payments: true },
  });
}

/**
 * Cancel a payment batch
 */
export async function cancelPaymentBatch(id: string, reason?: string) {
  const batch = await prisma.paymentBatch.findUnique({
    where: { id },
    include: { payments: true },
  });

  if (!batch) {
    throw new Error("Payment batch not found");
  }

  if (batch.status === PaymentStatus.PAID) {
    throw new Error("Cannot cancel a paid batch");
  }

  // Unlink all payments from batch
  await prisma.payment.updateMany({
    where: { paymentBatchId: id },
    data: {
      paymentBatchId: null,
    },
  });

  // Cancel the batch
  return prisma.paymentBatch.update({
    where: { id },
    data: {
      status: PaymentStatus.CANCELLED,
      notes: reason
        ? `${batch.notes || ""} | Cancelled: ${reason}`
        : batch.notes,
    },
  });
}

/**
 * Delete a payment batch
 */
export async function deletePaymentBatch(id: string) {
  const batch = await prisma.paymentBatch.findUnique({
    where: { id },
  });

  if (!batch) {
    throw new Error("Payment batch not found");
  }

  if (
    batch.status === PaymentStatus.PROCESSING ||
    batch.status === PaymentStatus.PAID
  ) {
    throw new Error("Cannot delete a processing or paid batch");
  }

  // Unlink all payments
  await prisma.payment.updateMany({
    where: { paymentBatchId: id },
    data: { paymentBatchId: null },
  });

  return prisma.paymentBatch.delete({
    where: { id },
  });
}

/**
 * Get batch statistics
 */
export async function getPaymentBatchStats(organizationId: string) {
  const [
    totalBatches,
    pendingBatches,
    processingBatches,
    completedBatches,
    totalAmount,
  ] = await Promise.all([
    prisma.paymentBatch.count({ where: { organizationId } }),
    prisma.paymentBatch.count({
      where: { organizationId, status: PaymentStatus.PENDING },
    }),
    prisma.paymentBatch.count({
      where: { organizationId, status: PaymentStatus.PROCESSING },
    }),
    prisma.paymentBatch.count({
      where: { organizationId, status: PaymentStatus.PAID },
    }),
    prisma.paymentBatch.aggregate({
      where: { organizationId },
      _sum: { totalAmount: true },
    }),
  ]);

  return {
    totalBatches,
    pendingBatches,
    processingBatches,
    completedBatches,
    totalAmount: totalAmount._sum.totalAmount || 0,
  };
}

/**
 * Get upcoming scheduled batches
 */
export async function getUpcomingBatches(
  organizationId: string,
  days: number = 7,
) {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(now.getDate() + days);

  return prisma.paymentBatch.findMany({
    where: {
      organizationId,
      status: { in: [PaymentStatus.PENDING, PaymentStatus.SCHEDULED] },
      paymentDate: {
        gte: now,
        lte: futureDate,
      },
    },
    include: {
      payments: {
        select: {
          id: true,
          amount: true,
          currency: true,
        },
      },
    },
    orderBy: { paymentDate: "asc" },
  });
}
