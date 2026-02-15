// ============================================================================
// Integration Sync Logs Service
// ============================================================================

import { prisma } from '../../db/prisma';
import { SyncStatus } from '../../domain/enums/SyncStatus';

export interface CreateSyncLogInput {
  integrationId: string;
  syncType: 'IMPORT' | 'EXPORT' | 'BIDIRECTIONAL' | 'DELTA';
  status: SyncStatus;
  recordsProcessed?: number;
  recordsSucceeded?: number;
  recordsFailed?: number;
  startedAt: Date;
  completedAt?: Date;
  errorMessage?: string;
  errorDetails?: Record<string, unknown>;
  triggeredBy: string;
  metadata?: Record<string, unknown>;
}

/**
 * List sync logs for an integration
 */
export async function listSyncLogs(
  integrationId: string,
  options?: {
    status?: SyncStatus;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }
) {
  const where: any = { integrationId };

  if (options?.status) where.status = options.status;
  if (options?.startDate || options?.endDate) {
    where.startedAt = {};
    if (options.startDate) where.startedAt.gte = options.startDate;
    if (options.endDate) where.startedAt.lte = options.endDate;
  }

  const page = options?.page || 1;
  const limit = options?.limit || 20;
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    prisma.integrationSyncLog.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.integrationSyncLog.count({ where }),
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
 * Get a sync log by ID
 */
export async function getSyncLog(id: string) {
  return prisma.integrationSyncLog.findUnique({
    where: { id },
    include: {
      integration: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
    },
  });
}

/**
 * Create a sync log entry
 */
export async function createSyncLog(data: CreateSyncLogInput) {
  return prisma.integrationSyncLog.create({
    data: {
      integrationId: data.integrationId,
      syncType: data.syncType,
      status: data.status,
      recordsProcessed: data.recordsProcessed || 0,
      recordsSucceeded: data.recordsSucceeded || 0,
      recordsFailed: data.recordsFailed || 0,
      startedAt: data.startedAt,
      completedAt: data.completedAt,
      errorMessage: data.errorMessage,
      errorDetails: data.errorDetails,
      triggeredBy: data.triggeredBy,
      metadata: data.metadata,
    },
  });
}

/**
 * Update sync log status
 */
export async function updateSyncLogStatus(
  id: string,
  status: SyncStatus,
  data?: {
    recordsProcessed?: number;
    recordsSucceeded?: number;
    recordsFailed?: number;
    errorMessage?: string;
    errorDetails?: Record<string, unknown>;
    completedAt?: Date;
  }
) {
  return prisma.integrationSyncLog.update({
    where: { id },
    data: {
      status,
      ...data,
    },
  });
}

/**
 * Mark sync log as completed
 */
export async function completeSyncLog(
  id: string,
  recordsProcessed: number,
  recordsSucceeded: number,
  recordsFailed: number
) {
  return prisma.integrationSyncLog.update({
    where: { id },
    data: {
      status: SyncStatus.SUCCESS,
      recordsProcessed,
      recordsSucceeded,
      recordsFailed,
      completedAt: new Date(),
    },
  });
}

/**
 * Mark sync log as failed
 */
export async function failSyncLog(
  id: string,
  errorMessage: string,
  errorDetails?: Record<string, unknown>
) {
  return prisma.integrationSyncLog.update({
    where: { id },
    data: {
      status: SyncStatus.FAILED,
      errorMessage,
      errorDetails,
      completedAt: new Date(),
    },
  });
}

/**
 * Get latest sync log for an integration
 */
export async function getLatestSyncLog(integrationId: string) {
  return prisma.integrationSyncLog.findFirst({
    where: { integrationId },
    orderBy: { startedAt: 'desc' },
  });
}

/**
 * Get sync statistics for an integration
 */
export async function getSyncStats(integrationId: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [totalSyncs, successCount, failedCount, avgDuration] = await Promise.all([
    prisma.integrationSyncLog.count({
      where: {
        integrationId,
        startedAt: { gte: startDate },
      },
    }),
    prisma.integrationSyncLog.count({
      where: {
        integrationId,
        status: SyncStatus.SUCCESS,
        startedAt: { gte: startDate },
      },
    }),
    prisma.integrationSyncLog.count({
      where: {
        integrationId,
        status: SyncStatus.FAILED,
        startedAt: { gte: startDate },
      },
    }),
    prisma.integrationSyncLog.aggregate({
      where: {
        integrationId,
        startedAt: { gte: startDate },
        completedAt: { not: null },
      },
      _avg: {
        // Calculate duration manually since Prisma doesn't support expression aggregates
      },
    }),
  ]);

  // Get recent sync logs
  const recentLogs = await prisma.integrationSyncLog.findMany({
    where: {
      integrationId,
      startedAt: { gte: startDate },
    },
    orderBy: { startedAt: 'desc' },
    take: 10,
  });

  // Calculate average duration
  let totalDuration = 0;
  let durationCount = 0;
  for (const log of recentLogs) {
    if (log.completedAt && log.startedAt) {
      totalDuration += log.completedAt.getTime() - log.startedAt.getTime();
      durationCount++;
    }
  }
  const averageDuration = durationCount > 0 ? totalDuration / durationCount : 0;

  return {
    totalSyncs,
    successCount,
    failedCount,
    successRate: totalSyncs > 0 ? (successCount / totalSyncs) * 100 : 0,
    averageDuration,
    recentLogs,
  };
}

/**
 * Get sync logs with errors
 */
export async function getFailedSyncLogs(
  integrationId?: string,
  options?: {
    limit?: number;
    startDate?: Date;
  }
) {
  const where: any = {
    status: SyncStatus.FAILED,
  };

  if (integrationId) where.integrationId = integrationId;
  if (options?.startDate) where.startedAt = { gte: options.startDate };

  return prisma.integrationSyncLog.findMany({
    where,
    orderBy: { startedAt: 'desc' },
    take: options?.limit || 20,
    include: {
      integration: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
    },
  });
}

/**
 * Clean up old sync logs
 */
export async function cleanupOldSyncLogs(cutoffDate: Date) {
  return prisma.integrationSyncLog.deleteMany({
    where: {
      startedAt: { lt: cutoffDate },
      status: { in: [SyncStatus.SUCCESS, SyncStatus.CANCELLED] },
    },
  });
}
