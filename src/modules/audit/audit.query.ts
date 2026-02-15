// ============================================================================
// Audit Query Service
// ============================================================================
// Provides advanced querying capabilities for audit logs

import { prisma } from '../../db/prisma';
import { AuditAction } from '../../domain/enums/AuditAction';
import { EntityType } from '../../domain/enums/EntityType';
import { LogSeverity } from '../../domain/enums/LogSeverity';

export interface AuditQueryFilters {
  organizationId?: string;
  userId?: string;
  userEmail?: string;
  action?: AuditAction;
  entityType?: EntityType;
  entityId?: string;
  severity?: LogSeverity;
  startDate?: Date;
  endDate?: Date;
  ipAddress?: string;
  complianceFlags?: string[];
  searchTerm?: string;
}

export interface AuditQueryOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeDetails?: boolean;
}

/**
 * Build where clause from filters
 */
function buildWhereClause(filters: AuditQueryFilters): any {
  const where: any = {};

  if (filters.organizationId) where.organizationId = filters.organizationId;
  if (filters.userId) where.userId = filters.userId;
  if (filters.userEmail) where.userEmail = { contains: filters.userEmail, mode: 'insensitive' };
  if (filters.action) where.action = filters.action;
  if (filters.entityType) where.entityType = filters.entityType;
  if (filters.entityId) where.entityId = filters.entityId;
  if (filters.severity) where.severity = filters.severity;
  if (filters.ipAddress) where.ipAddress = filters.ipAddress;
  if (filters.complianceFlags?.length) {
    where.complianceFlags = { hasSome: filters.complianceFlags };
  }

  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) where.createdAt.gte = filters.startDate;
    if (filters.endDate) where.createdAt.lte = filters.endDate;
  }

  if (filters.searchTerm) {
    where.OR = [
      { entityDescription: { contains: filters.searchTerm, mode: 'insensitive' } },
      { changesSummary: { contains: filters.searchTerm, mode: 'insensitive' } },
      { userEmail: { contains: filters.searchTerm, mode: 'insensitive' } },
    ];
  }

  return where;
}

/**
 * Query audit logs with filters and pagination
 */
export async function queryAuditLogs(
  filters: AuditQueryFilters,
  options: AuditQueryOptions = {}
) {
  const page = options.page || 1;
  const limit = options.limit || 50;
  const skip = (page - 1) * limit;
  const sortBy = options.sortBy || 'createdAt';
  const sortOrder = options.sortOrder || 'desc';

  const where = buildWhereClause(filters);

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: options.includeDetails
        ? {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
          }
        : undefined,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get audit trail for a specific entity
 */
export async function getEntityAuditTrail(
  entityType: EntityType,
  entityId: string,
  options?: {
    page?: number;
    limit?: number;
    startDate?: Date;
    endDate?: Date;
  }
) {
  const page = options?.page || 1;
  const limit = options?.limit || 50;
  const skip = (page - 1) * limit;

  const where: any = {
    entityType,
    entityId,
  };

  if (options?.startDate || options?.endDate) {
    where.createdAt = {};
    if (options.startDate) where.createdAt.gte = options.startDate;
    if (options.endDate) where.createdAt.lte = options.endDate;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get user activity history
 */
export async function getUserActivityHistory(
  userId: string,
  options?: {
    page?: number;
    limit?: number;
    actions?: AuditAction[];
    startDate?: Date;
    endDate?: Date;
  }
) {
  const page = options?.page || 1;
  const limit = options?.limit || 50;
  const skip = (page - 1) * limit;

  const where: any = { userId };

  if (options?.actions?.length) {
    where.action = { in: options.actions };
  }

  if (options?.startDate || options?.endDate) {
    where.createdAt = {};
    if (options.startDate) where.createdAt.gte = options.startDate;
    if (options.endDate) where.createdAt.lte = options.endDate;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get audit statistics
 */
export async function getAuditStatistics(
  organizationId?: string,
  dateRange?: { start: Date; end: Date }
) {
  const where: any = {};

  if (organizationId) where.organizationId = organizationId;
  if (dateRange) {
    where.createdAt = {
      gte: dateRange.start,
      lte: dateRange.end,
    };
  }

  const [totalLogs, actionStats, severityStats, topUsers, recentActivity] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.groupBy({
      by: ['action'],
      where,
      _count: { action: true },
    }),
    prisma.auditLog.groupBy({
      by: ['severity'],
      where,
      _count: { severity: true },
    }),
    prisma.auditLog.groupBy({
      by: ['userId', 'userEmail'],
      where: { ...where, userId: { not: null } },
      _count: { userId: true },
      orderBy: { _count: { userId: 'desc' } },
      take: 10,
    }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        action: true,
        entityType: true,
        createdAt: true,
        userEmail: true,
      },
    }),
  ]);

  return {
    totalLogs,
    actionBreakdown: actionStats.reduce((acc, stat) => {
      acc[stat.action] = stat._count.action;
      return acc;
    }, {} as Record<string, number>),
    severityBreakdown: severityStats.reduce((acc, stat) => {
      acc[stat.severity] = stat._count.severity;
      return acc;
    }, {} as Record<string, number>),
    topUsers: topUsers.map((user) => ({
      userId: user.userId,
      email: user.userEmail,
      activityCount: user._count.userId,
    })),
    recentActivity,
  };
}

/**
 * Export audit logs to various formats
 */
export async function exportAuditLogs(
  filters: AuditQueryFilters,
  format: 'json' | 'csv' = 'json'
) {
  const where = buildWhereClause(filters);

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  if (format === 'csv') {
    const headers = [
      'ID',
      'Timestamp',
      'Action',
      'Entity Type',
      'Entity ID',
      'User Email',
      'Severity',
      'IP Address',
      'Changes Summary',
    ];

    const rows = logs.map((log) => [
      log.id,
      log.createdAt.toISOString(),
      log.action,
      log.entityType,
      log.entityId,
      log.userEmail || '',
      log.severity,
      log.ipAddress || '',
      log.changesSummary || '',
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }

  return JSON.stringify(logs, null, 2);
}

/**
 * Search audit logs with full-text search
 */
export async function searchAuditLogs(
  searchTerm: string,
  options?: {
    organizationId?: string;
    page?: number;
    limit?: number;
  }
) {
  const page = options?.page || 1;
  const limit = options?.limit || 50;
  const skip = (page - 1) * limit;

  const where: any = {
    OR: [
      { entityDescription: { contains: searchTerm, mode: 'insensitive' } },
      { changesSummary: { contains: searchTerm, mode: 'insensitive' } },
      { userEmail: { contains: searchTerm, mode: 'insensitive' } },
      { userRole: { contains: searchTerm, mode: 'insensitive' } },
    ],
  };

  if (options?.organizationId) {
    where.organizationId = options.organizationId;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get compliance report
 */
export async function getComplianceReport(
  organizationId: string,
  options?: {
    complianceFlags?: string[];
    startDate?: Date;
    endDate?: Date;
  }
) {
  const where: any = {
    organizationId,
    complianceFlags: { isEmpty: false },
  };

  if (options?.complianceFlags?.length) {
    where.complianceFlags = { hasSome: options.complianceFlags };
  }

  if (options?.startDate || options?.endDate) {
    where.createdAt = {};
    if (options.startDate) where.createdAt.gte = options.startDate;
    if (options.endDate) where.createdAt.lte = options.endDate;
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  const groupedByFlag = logs.reduce((acc, log) => {
    log.complianceFlags.forEach((flag) => {
      if (!acc[flag]) acc[flag] = [];
      acc[flag].push(log);
    });
    return acc;
  }, {} as Record<string, typeof logs>);

  return {
    totalLogs: logs.length,
    groupedByFlag,
    logs,
  };
}
