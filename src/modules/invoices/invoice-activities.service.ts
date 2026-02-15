// ============================================================================
// Invoice Activities Service
// ============================================================================

import { prisma } from '../../db/prisma';

export interface CreateActivityInput {
  invoiceId: string;
  actorId?: string;
  actorType?: string;
  actorName?: string;
  action: string;
  description?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface ActivityQueryOptions {
  invoiceId?: string;
  actorId?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

/**
 * List activities for an invoice with pagination
 */
export async function listInvoiceActivities(invoiceId: string, options?: {
  page?: number;
  limit?: number;
}) {
  const page = options?.page || 1;
  const limit = options?.limit || 50;
  const skip = (page - 1) * limit;

  const [activities, total] = await Promise.all([
    prisma.invoiceActivity.findMany({
      where: { invoiceId },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.invoiceActivity.count({ where: { invoiceId } }),
  ]);

  return {
    activities,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get a specific activity by ID
 */
export async function getInvoiceActivity(id: string) {
  return prisma.invoiceActivity.findUnique({
    where: { id },
    include: {
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
          supplierName: true,
        },
      },
    },
  });
}

/**
 * Create a new activity log entry
 */
export async function createInvoiceActivity(data: CreateActivityInput) {
  return prisma.invoiceActivity.create({
    data: {
      invoiceId: data.invoiceId,
      actorId: data.actorId,
      actorType: data.actorType || 'USER',
      actorName: data.actorName,
      action: data.action,
      description: data.description,
      oldValue: data.oldValue || {},
      newValue: data.newValue || {},
      metadata: data.metadata || {},
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    },
    include: {
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
        },
      },
    },
  });
}

/**
 * Create a status change activity
 */
export async function logStatusChange(
  invoiceId: string,
  oldStatus: string,
  newStatus: string,
  actorId?: string,
  actorName?: string,
  metadata?: Record<string, unknown>
) {
  return createInvoiceActivity({
    invoiceId,
    actorId,
    actorName,
    action: 'STATUS_CHANGE',
    description: `Status changed from ${oldStatus} to ${newStatus}`,
    oldValue: { status: oldStatus },
    newValue: { status: newStatus },
    metadata,
  });
}

/**
 * Create an approval activity
 */
export async function logApprovalAction(
  invoiceId: string,
  action: 'APPROVED' | 'REJECTED' | 'DELEGATED' | 'ESCALATED',
  approverId: string,
  approverName: string,
  notes?: string,
  metadata?: Record<string, unknown>
) {
  const actionDescriptions: Record<string, string> = {
    APPROVED: 'Invoice approved',
    REJECTED: 'Invoice rejected',
    DELEGATED: 'Approval delegated',
    ESCALATED: 'Approval escalated',
  };

  return createInvoiceActivity({
    invoiceId,
    actorId: approverId,
    actorName: approverName,
    action: `APPROVAL_${action}`,
    description: notes || actionDescriptions[action],
    metadata,
  });
}

/**
 * Create a payment activity
 */
export async function logPaymentAction(
  invoiceId: string,
  paymentId: string,
  action: 'SCHEDULED' | 'PROCESSED' | 'FAILED' | 'RECONCILED',
  actorId?: string,
  actorName?: string,
  amount?: number,
  metadata?: Record<string, unknown>
) {
  const actionDescriptions: Record<string, string> = {
    SCHEDULED: 'Payment scheduled',
    PROCESSED: 'Payment processed',
    FAILED: 'Payment failed',
    RECONCILED: 'Payment reconciled',
  };

  return createInvoiceActivity({
    invoiceId,
    actorId,
    actorName,
    action: `PAYMENT_${action}`,
    description: amount 
      ? `${actionDescriptions[action]} for ${amount}` 
      : actionDescriptions[action],
    metadata: {
      ...metadata,
      paymentId,
      amount,
    },
  });
}

/**
 * Query activities with filters
 */
export async function queryActivities(options: ActivityQueryOptions) {
  const where: any = {};

  if (options.invoiceId) where.invoiceId = options.invoiceId;
  if (options.actorId) where.actorId = options.actorId;
  if (options.action) where.action = options.action;

  if (options.startDate || options.endDate) {
    where.createdAt = {};
    if (options.startDate) where.createdAt.gte = options.startDate;
    if (options.endDate) where.createdAt.lte = options.endDate;
  }

  const page = options.page || 1;
  const limit = options.limit || 50;
  const skip = (page - 1) * limit;

  const [activities, total] = await Promise.all([
    prisma.invoiceActivity.findMany({
      where,
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            supplierName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.invoiceActivity.count({ where }),
  ]);

  return {
    activities,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get activity timeline for an invoice
 */
export async function getInvoiceTimeline(invoiceId: string) {
  const activities = await prisma.invoiceActivity.findMany({
    where: { invoiceId },
    orderBy: { createdAt: 'asc' },
  });

  return activities.map((activity, index) => ({
    ...activity,
    sequence: index + 1,
    isFirst: index === 0,
    isLast: index === activities.length - 1,
  }));
}

/**
 * Get recent activities across all invoices
 */
export async function getRecentActivities(options?: {
  organizationId?: string;
  limit?: number;
  actionTypes?: string[];
}) {
  const where: any = {};

  if (options?.actionTypes?.length) {
    where.action = { in: options.actionTypes };
  }

  return prisma.invoiceActivity.findMany({
    where,
    include: {
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
          supplierName: true,
          totalAmount: true,
          currency: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 20,
  });
}

/**
 * Delete old activities (for cleanup)
 */
export async function deleteOldActivities(cutoffDate: Date) {
  return prisma.invoiceActivity.deleteMany({
    where: {
      createdAt: {
        lt: cutoffDate,
      },
    },
  });
}
