import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { AuditAction, EntityType } from "@/domain/enums";

export interface CreateAuditLogInput {
  action: AuditAction;
  entityType: EntityType;
  entityId: string;
  userId: string;
  organizationId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogQueryOptions {
  organizationId: string;
  entityType?: EntityType;
  entityId?: string;
  userId?: string;
  action?: AuditAction;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export class AuditService {
  /**
   * Create a new audit log entry
   */
  async createLog(input: CreateAuditLogInput): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          action: input.action as any,
          entityType: input.entityType as any,
          entityId: input.entityId,
          userId: input.userId,
          organizationId: input.organizationId,
          metadata: input.metadata as any,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          createdAt: new Date(),
        },
      });
    } catch (error) {
      // Log to console but don't throw - audit should not break business logic
      logger.error({ error, input }, "Failed to create audit log");
    }
  }

  /**
   * Query audit logs with filtering
   */
  async queryLogs(options: AuditLogQueryOptions) {
    const {
      organizationId,
      entityType,
      entityId,
      userId,
      action,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = options;

    const skip = (page - 1) * limit;

    const where = {
      organizationId,
      ...(entityType && { entityType: entityType as any }),
      ...(entityId && { entityId }),
      ...(userId && { userId }),
      ...(action && { action: action as any }),
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate && { gte: startDate }),
              ...(endDate && { lte: endDate }),
            },
          }
        : {}),
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get recent activity for an entity
   */
  async getEntityActivity(
    entityType: EntityType,
    entityId: string,
    organizationId: string,
    limit: number = 10,
  ) {
    return prisma.auditLog.findMany({
      where: {
        entityType: entityType as any,
        entityId,
        organizationId,
      },
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  /**
   * Get activity summary for a user
   */
  async getUserActivitySummary(userId: string, organizationId: string) {
    const [totalActions, actionsByType] = await Promise.all([
      prisma.auditLog.count({
        where: { userId, organizationId },
      }),
      prisma.auditLog.groupBy({
        by: ["action"],
        where: { userId, organizationId },
        _count: { action: true },
      }),
    ]);

    return {
      totalActions,
      actionsByType: actionsByType.reduce(
        (acc, item) => {
          acc[item.action] = item._count.action;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }
}

// Export singleton instance
export const auditService = new AuditService();
