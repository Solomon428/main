// ============================================================================
// Invoice Comments Service
// ============================================================================

import { prisma } from '../../db/prisma';

export interface CreateCommentInput {
  invoiceId: string;
  userId?: string;
  userName?: string;
  content: string;
  isInternal?: boolean;
  isSystemGenerated?: boolean;
  parentId?: string;
  mentions?: string[];
  attachments?: string[];
}

export interface UpdateCommentInput {
  content?: string;
  isInternal?: boolean;
  isPinned?: boolean;
}

/**
 * List all comments for an invoice
 */
export async function listInvoiceComments(invoiceId: string, options?: {
  includeInternal?: boolean;
  includeDeleted?: boolean;
}) {
  const where: any = { invoiceId };

  if (!options?.includeInternal) {
    where.isInternal = false;
  }

  if (!options?.includeDeleted) {
    where.deletedAt = null;
  }

  return prisma.invoiceComment.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      parent: true,
      replies: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        where: {
          deletedAt: null,
        },
      },
    },
    orderBy: [
      { isPinned: 'desc' },
      { createdAt: 'desc' },
    ],
  });
}

/**
 * Get a specific comment by ID
 */
export async function getInvoiceComment(id: string) {
  return prisma.invoiceComment.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
        },
      },
      parent: true,
      replies: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Create a new comment on an invoice
 */
export async function createInvoiceComment(data: CreateCommentInput) {
  return prisma.invoiceComment.create({
    data: {
      invoiceId: data.invoiceId,
      userId: data.userId,
      userName: data.userName,
      content: data.content,
      isInternal: data.isInternal ?? true,
      isSystemGenerated: data.isSystemGenerated ?? false,
      parentId: data.parentId,
      mentions: data.mentions || [],
      attachments: data.attachments || [],
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
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
 * Update an existing comment
 */
export async function updateInvoiceComment(id: string, data: UpdateCommentInput) {
  return prisma.invoiceComment.update({
    where: { id },
    data: {
      ...data,
      updatedAt: new Date(),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });
}

/**
 * Delete a comment (soft delete)
 */
export async function deleteInvoiceComment(id: string, deletedBy?: string) {
  return prisma.invoiceComment.update({
    where: { id },
    data: {
      deletedAt: new Date(),
    },
  });
}

/**
 * Permanently delete a comment
 */
export async function permanentlyDeleteInvoiceComment(id: string) {
  return prisma.invoiceComment.delete({
    where: { id },
  });
}

/**
 * Pin or unpin a comment
 */
export async function togglePinComment(id: string, isPinned: boolean) {
  return prisma.invoiceComment.update({
    where: { id },
    data: {
      isPinned,
      updatedAt: new Date(),
    },
  });
}

/**
 * Add a reply to an existing comment
 */
export async function addCommentReply(parentId: string, data: Omit<CreateCommentInput, 'parentId'>) {
  return createInvoiceComment({
    ...data,
    parentId,
  });
}

/**
 * Get comment count for an invoice
 */
export async function getInvoiceCommentCount(invoiceId: string, includeInternal = false) {
  const where: any = {
    invoiceId,
    deletedAt: null,
  };

  if (!includeInternal) {
    where.isInternal = false;
  }

  return prisma.invoiceComment.count({ where });
}

/**
 * Get recent comments across all invoices
 */
export async function getRecentComments(options?: {
  organizationId?: string;
  limit?: number;
  days?: number;
}) {
  const where: any = {
    deletedAt: null,
    isSystemGenerated: false,
  };

  if (options?.days) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - options.days);
    where.createdAt = { gte: cutoffDate };
  }

  return prisma.invoiceComment.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
          supplierName: true,
          totalAmount: true,
          currency: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 20,
  });
}
