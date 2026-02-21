// src/modules/invoices/comments.service.ts
import {
  Prisma,
  type InvoiceComment,
  type Invoice,
  type User,
  type Organization,
  PrismaClient,
} from "@prisma/client";
import { type Decimal } from "@prisma/client/runtime/library";
import { z } from "zod";

// Validation schemas
const createCommentSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
  content: z
    .string()
    .min(1, "Comment content is required")
    .max(5000, "Comment too long"),
  isInternal: z.boolean().default(false),
  userId: z.string().min(1, "User ID is required"),
  parentId: z.string().optional(),
});

const updateCommentSchema = z.object({
  content: z.string().min(1).max(5000).optional(),
  isInternal: z.boolean().optional(),
  updatedById: z.string().min(1, "User ID is required"),
});

// Custom error classes
class InvoiceNotFoundError extends Error {
  constructor(invoiceId: string) {
    super(`Invoice not found: ${invoiceId}`);
    this.name = "InvoiceNotFoundError";
  }
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

class PermissionError extends Error {
  constructor(message: string = "Permission denied") {
    super(message);
    this.name = "PermissionError";
  }
}

// --- INPUT INTERFACES ---
export interface CreateInvoiceCommentInput {
  invoiceId: string;
  content: string;
  isInternal: boolean; // If true, only visible to internal users
  userId: string;
  parentId?: string; // For threaded replies
}

export interface UpdateInvoiceCommentInput {
  content?: string;
  isInternal?: boolean;
  updatedById: string;
}

export interface GetInvoiceCommentIncludeOptions {
  invoice?: boolean;
  user?: boolean;
  parent?: boolean;
  replies?: boolean; // Include direct child comments
}

export interface InvoiceCommentSummary {
  totalCount: number;
  internalCount: number;
  externalCount: number;
  byUser: Record<string, number>; // Count by user ID
}

/**
 * Service responsible for managing InvoiceComment entities.
 * Handles CRUD operations, thread management, and audit trails for comments.
 */
export class InvoiceCommentService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
  }

  /**
   * Create a new comment on an invoice
   */
  async createComment(
    input: CreateInvoiceCommentInput,
  ): Promise<InvoiceComment> {
    // Validate input
    const validated = createCommentSchema.parse(input);

    // Check if invoice exists
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: validated.invoiceId },
    });

    if (!invoice) {
      throw new InvoiceNotFoundError(validated.invoiceId);
    }

    // If this is a reply, check parent comment exists and belongs to same invoice
    if (validated.parentId) {
      const parentComment = await this.prisma.invoiceComment.findUnique({
        where: { id: validated.parentId },
      });

      if (!parentComment) {
        throw new Error("Parent comment not found");
      }

      if (parentComment.invoiceId !== validated.invoiceId) {
        throw new Error("Parent comment belongs to a different invoice");
      }
    }

    // Create the comment
    const comment = await this.prisma.invoiceComment.create({
      data: {
        invoiceId: validated.invoiceId,
        content: validated.content,
        isInternal: validated.isInternal,
        userId: validated.userId,
        parentId: validated.parentId || null,
      },
      include: {
        user: true,
        parent: true,
      },
    });

    return comment;
  }

  /**
   * Update an existing comment
   */
  async updateComment(
    commentId: string,
    input: UpdateInvoiceCommentInput,
  ): Promise<InvoiceComment> {
    const validated = updateCommentSchema.parse(input);

    // Check if comment exists
    const existingComment = await this.prisma.invoiceComment.findUnique({
      where: { id: commentId },
    });

    if (!existingComment) {
      throw new Error("Comment not found");
    }

    // Verify user has permission to update
    if (existingComment.userId !== validated.updatedById) {
      throw new PermissionError("You can only update your own comments");
    }

    // Update the comment
    const comment = await this.prisma.invoiceComment.update({
      where: { id: commentId },
      data: {
        ...(validated.content && { content: validated.content }),
        ...(validated.isInternal !== undefined && {
          isInternal: validated.isInternal,
        }),
        updatedAt: new Date(),
      },
      include: {
        user: true,
      },
    });

    return comment;
  }

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string, userId: string): Promise<void> {
    const comment = await this.prisma.invoiceComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new Error("Comment not found");
    }

    if (comment.userId !== userId) {
      throw new PermissionError("You can only delete your own comments");
    }

    // Soft delete by updating content
    await this.prisma.invoiceComment.update({
      where: { id: commentId },
      data: {
        content: "[deleted]",
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get a single comment by ID
   */
  async getComment(
    commentId: string,
    include?: GetInvoiceCommentIncludeOptions,
  ): Promise<InvoiceComment | null> {
    const comment = await this.prisma.invoiceComment.findUnique({
      where: { id: commentId },
      include: {
        user: include?.user ?? false,
        parent: include?.parent ?? false,
        replies: include?.replies
          ? {
              where: { deletedAt: null },
              orderBy: { createdAt: "asc" },
            }
          : false,
      },
    });

    return comment;
  }

  /**
   * Get all comments for an invoice
   */
  async getCommentsByInvoice(
    invoiceId: string,
    options?: {
      includeInternal?: boolean;
      includeReplies?: boolean;
      limit?: number;
      offset?: number;
    },
  ): Promise<InvoiceComment[]> {
    const comments = await this.prisma.invoiceComment.findMany({
      where: {
        invoiceId,
        deletedAt: null,
        ...(options?.includeInternal === false && { isInternal: false }),
        ...(options?.includeReplies === false && { parentId: null }),
      },
      include: {
        user: true,
        replies: options?.includeReplies
          ? {
              where: { deletedAt: null },
              orderBy: { createdAt: "asc" },
              include: { user: true },
            }
          : false,
      },
      orderBy: { createdAt: "desc" },
      take: options?.limit,
      skip: options?.offset,
    });

    return comments;
  }

  /**
   * Get comment summary statistics for an invoice
   */
  async getCommentSummary(invoiceId: string): Promise<InvoiceCommentSummary> {
    const comments = await this.prisma.invoiceComment.findMany({
      where: {
        invoiceId,
        deletedAt: null,
      },
      select: {
        isInternal: true,
        userId: true,
      },
    });

    const byUser: Record<string, number> = {};
    comments.forEach((comment) => {
      if (comment.userId) {
        byUser[comment.userId] = (byUser[comment.userId] || 0) + 1;
      }
    });

    return {
      totalCount: comments.length,
      internalCount: comments.filter((c) => c.isInternal).length,
      externalCount: comments.filter((c) => !c.isInternal).length,
      byUser,
    };
  }
}

export default InvoiceCommentService;
