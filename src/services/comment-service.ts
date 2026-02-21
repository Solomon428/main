import { prisma } from '@/lib/database/client';
import { EntityType, LogSeverity } from '@/types';
import { auditLogger } from '@/lib/utils/audit-logger';

// Type for audit log entry
interface AuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  userId: string | null;
  timestamp: Date;
  metadata: Record<string, unknown> | null;
}

export interface Comment {
  id: string;
  entityType: EntityType;
  entityId: string;
  userId: string;
  userName: string;
  content: string;
  isInternal: boolean;
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
  replies?: Comment[];
  attachments?: CommentAttachment[];
}

export interface CommentAttachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  uploadedAt: Date;
}

export interface CreateCommentInput {
  entityType: EntityType;
  entityId: string;
  userId: string;
  content: string;
  isInternal?: boolean;
  parentId?: string;
  attachments?: Array<{
    fileName: string;
    fileType: string;
    fileSize: number;
    fileUrl: string;
  }>;
}

export interface CommentFilters {
  entityType?: EntityType;
  entityId?: string;
  userId?: string;
  isInternal?: boolean;
  includeReplies?: boolean;
  page?: number;
  pageSize?: number;
}

/**
 * Comment Service for invoice collaboration
 * Stores comments in AuditLog for audit trail
 */
export class CommentService {
  /**
   * Create a new comment
   */
  static async createComment(input: CreateCommentInput): Promise<Comment> {
    // Validate entity exists
    const entityExists = await this.validateEntity(input.entityType, input.entityId);
    if (!entityExists) {
      throw new Error(`Entity ${input.entityType}:${input.entityId} not found`);
    }

    // If replying to a comment, verify parent exists
    if (input.parentId) {
      const parentExists = await this.getCommentById(input.parentId);
      if (!parentExists) {
        throw new Error('Parent comment not found');
      }
    }

    // Store comment metadata in audit log
    const auditEntry = await prisma.auditLog.create({
      data: {
        action: 'COMMENT_ADDED',
        entityType: input.entityType,
        entityId: input.entityId,
        userId: input.userId,
        severity: LogSeverity.INFO,
        metadata: {
          content: input.content,
          isInternal: input.isInternal || false,
          parentId: input.parentId,
          attachments: input.attachments || [],
        },
      },
    });

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { name: true },
    });

    // Send notification to relevant users
    await this.notifyMentionedUsers(input);

    return {
      id: auditEntry.id,
      entityType: input.entityType,
      entityId: input.entityId,
      userId: input.userId,
      userName: user?.name || 'Unknown',
      content: input.content,
      isInternal: input.isInternal || false,
      parentId: input.parentId,
      createdAt: auditEntry.timestamp,
      updatedAt: auditEntry.timestamp,
      attachments: input.attachments?.map((att, index) => ({
        id: `${auditEntry.id}_att_${index}`,
        fileName: att.fileName,
        fileType: att.fileType,
        fileSize: att.fileSize,
        fileUrl: att.fileUrl,
        uploadedAt: auditEntry.timestamp,
      })),
    };
  }

  /**
   * Get comments for an entity
   */
  static async getComments(filters: CommentFilters): Promise<{
    comments: Comment[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = filters.page || 1;
    const pageSize = Math.min(filters.pageSize || 20, 100);
    const skip = (page - 1) * pageSize;

    const where: any = {
      action: 'COMMENT_ADDED',
    };

    if (filters.entityType) {
      where.entityType = filters.entityType;
    }

    if (filters.entityId) {
      where.entityId = filters.entityId;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    // Get comments from audit log
    const [auditEntries, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Fetch user details separately since there's no relation
    const userIds = [...new Set(auditEntries.map(e => e.userId).filter(Boolean))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    // Transform to comments
    const comments: Comment[] = auditEntries.map(entry => {
      const metadata = (entry.metadata as any) || {};
      const user = entry.userId ? userMap.get(entry.userId) : null;
      return {
        id: entry.id,
        entityType: entry.entityType,
        entityId: entry.entityId,
        userId: entry.userId || 'system',
        userName: user?.name || 'Unknown',
        content: metadata.content || '',
        isInternal: metadata.isInternal || false,
        parentId: metadata.parentId,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        attachments: (metadata.attachments || []).map((att: any, index: number) => ({
          id: `${entry.id}_att_${index}`,
          fileName: att.fileName,
          fileType: att.fileType,
          fileSize: att.fileSize,
          fileUrl: att.fileUrl,
          uploadedAt: entry.createdAt,
        })),
      };
    });

    // Load replies if requested
    if (filters.includeReplies) {
      for (const comment of comments) {
        if (!comment.parentId) {
          comment.replies = comments.filter(c => c.parentId === comment.id);
        }
      }
    }

    return {
      comments: comments.filter(c => !c.parentId), // Return only top-level comments
      total,
      page,
      pageSize,
    };
  }

  /**
   * Get a single comment by ID
   */
  static async getCommentById(commentId: string): Promise<Comment | null> {
    const auditEntry = await prisma.auditLog.findUnique({
      where: { id: commentId },
    });

    if (!auditEntry || auditEntry.action !== 'COMMENT_ADDED') {
      return null;
    }

    // Fetch user details separately since there's no relation
    let userName = 'Unknown';
    if (auditEntry.userId) {
      const user = await prisma.user.findUnique({
        where: { id: auditEntry.userId },
        select: { name: true },
      });
      userName = user?.name || 'Unknown';
    }

    const metadata = (auditEntry.metadata as any) || {};

    return {
      id: auditEntry.id,
      entityType: auditEntry.entityType,
      entityId: auditEntry.entityId,
      userId: auditEntry.userId || 'system',
      userName: userName,
      content: metadata.content || '',
      isInternal: metadata.isInternal || false,
      parentId: metadata.parentId,
      createdAt: auditEntry.createdAt,
      updatedAt: auditEntry.updatedAt,
      attachments: (metadata.attachments || []).map((att: any, index: number) => ({
        id: `${auditEntry.id}_att_${index}`,
        fileName: att.fileName,
        fileType: att.fileType,
        fileSize: att.fileSize,
        fileUrl: att.fileUrl,
        uploadedAt: auditEntry.createdAt,
      })),
    };
  }

  /**
   * Update a comment
   */
  static async updateComment(
    commentId: string,
    userId: string,
    updates: { content?: string; isInternal?: boolean }
  ): Promise<Comment> {
    const existingComment = await this.getCommentById(commentId);

    if (!existingComment) {
      throw new Error('Comment not found');
    }

    if (existingComment.userId !== userId) {
      throw new Error('Unauthorized to update this comment');
    }

    // Create update audit entry
    const auditEntry = await prisma.auditLog.create({
      data: {
        action: 'COMMENT_UPDATED',
        entityType: existingComment.entityType,
        entityId: existingComment.entityId,
        userId,
        severity: LogSeverity.INFO,
        metadata: {
          commentId,
          oldContent: existingComment.content,
          newContent: updates.content,
          isInternal: updates.isInternal ?? existingComment.isInternal,
        },
      },
    });

    return {
      ...existingComment,
      content: updates.content ?? existingComment.content,
      isInternal: updates.isInternal ?? existingComment.isInternal,
      updatedAt: auditEntry.timestamp,
    };
  }

  /**
   * Delete a comment
   */
  static async deleteComment(commentId: string, userId: string): Promise<void> {
    const existingComment = await this.getCommentById(commentId);

    if (!existingComment) {
      throw new Error('Comment not found');
    }

    // Allow deletion by comment author or admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (existingComment.userId !== userId && user?.role !== 'ADMIN') {
      throw new Error('Unauthorized to delete this comment');
    }

    // Log deletion
    await prisma.auditLog.create({
      data: {
        action: 'COMMENT_DELETED',
        entityType: existingComment.entityType,
        entityId: existingComment.entityId,
        userId,
        severity: LogSeverity.INFO,
        metadata: {
          commentId,
          deletedContent: existingComment.content,
        },
      },
    });
  }

  /**
   * Get comment count for an entity
   */
  static async getCommentCount(
    entityType: EntityType,
    entityId: string
  ): Promise<number> {
    return prisma.auditLog.count({
      where: {
        action: 'COMMENT_ADDED',
        entityType,
        entityId,
      },
    });
  }

  /**
   * Get recent activity feed
   */
  static async getActivityFeed(
    userId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{
    activities: Array<{
      id: string;
      type: string;
      userName: string;
      entityType: EntityType;
      entityId: string;
      message: string;
      timestamp: Date;
    }>;
    total: number;
  }> {
    const skip = (page - 1) * pageSize;

    // Get user's invoices and approvals
    const userEntities = await prisma.$queryRaw`
      SELECT id as entity_id, 'INVOICE' as entity_type FROM "Invoice" WHERE "createdById" = ${userId}
      UNION
      SELECT "invoiceId" as entity_id, 'INVOICE' as entity_type FROM "Approval" WHERE "approverId" = ${userId}
    `;

    const entityIds = (userEntities as any[]).map(e => e.entity_id);

    const auditEntries = await prisma.auditLog.findMany({
      where: {
        entityId: { in: entityIds },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    });

    // Fetch user details separately since there's no relation
    const userIds = [...new Set(auditEntries.map(e => e.userId).filter(Boolean))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    const activities = auditEntries.map(entry => {
      const user = entry.userId ? userMap.get(entry.userId) : null;
      return {
        id: entry.id,
        type: entry.action,
        userName: user?.name || 'System',
        entityType: entry.entityType,
        entityId: entry.entityId,
        message: this.formatActivityMessage(entry),
        timestamp: entry.createdAt,
      };
    });

    return {
      activities,
      total: activities.length,
    };
  }

  // Private helper methods

  private static async validateEntity(
    entityType: EntityType,
    entityId: string
  ): Promise<boolean> {
    switch (entityType) {
      case 'INVOICE':
        const invoice = await prisma.invoice.findUnique({
          where: { id: entityId },
          select: { id: true },
        });
        return !!invoice;
      case 'SUPPLIER':
        const supplier = await prisma.supplier.findUnique({
          where: { id: entityId },
          select: { id: true },
        });
        return !!supplier;
      case 'APPROVAL':
        const approval = await prisma.approval.findUnique({
          where: { id: entityId },
          select: { id: true },
        });
        return !!approval;
      default:
        return false;
    }
  }

  private static async notifyMentionedUsers(input: CreateCommentInput): Promise<void> {
    // Extract mentions (@username)
    const mentionPattern = /@(\w+)/g;
    const mentions = input.content.match(mentionPattern) || [];

    for (const mention of mentions) {
      const userName = mention.substring(1);

      // Find user by name
      const user = await prisma.user.findFirst({
        where: { name: { contains: userName, mode: 'insensitive' } },
        select: { id: true },
      });

      if (user) {
        // Create notification
        // This would call NotificationService
        console.log(`Notifying user ${user.id} about mention in ${input.entityType}:${input.entityId}`);
      }
    }
  }

  private static formatActivityMessage(entry: any): string {
    const messages: Record<string, string> = {
      COMMENT_ADDED: 'added a comment',
      COMMENT_UPDATED: 'updated a comment',
      COMMENT_DELETED: 'deleted a comment',
      APPROVE: 'approved the invoice',
      REJECT: 'rejected the invoice',
      CREATE: 'created',
      UPDATE: 'updated',
    };

    return messages[entry.action] || `${entry.action.toLowerCase()}d`;
  }
}
