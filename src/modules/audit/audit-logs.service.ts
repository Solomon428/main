// ============================================================================
// Audit Logs Service
// ============================================================================

import { prisma } from "../../db/prisma";

export async function queryLogs(filters: any = {}) {
  const where: any = {};

  if (filters.entityType) where.entityType = filters.entityType;
  if (filters.entityId) where.entityId = filters.entityId;
  if (filters.userId) where.userId = filters.userId;
  if (filters.action) where.action = filters.action;
  if (filters.severity) where.severity = filters.severity;

  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
    if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
  }

  return prisma.auditLog.findMany({
    where,
    include: {
      user: true,
      organization: true,
    },
    orderBy: { createdAt: "desc" },
    take: filters.limit ? parseInt(filters.limit) : 100,
    skip: filters.offset ? parseInt(filters.offset) : 0,
  });
}

export async function exportLogs(filters: any = {}) {
  const logs = await queryLogs(filters);
  return JSON.stringify(logs, null, 2);
}

export async function archiveLogs(data: any) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - (data.retentionDays || 365));

  const logsToArchive = await prisma.auditLog.findMany({
    where: {
      createdAt: {
        lt: cutoffDate,
      },
    },
  });

  // Archive logic here (e.g., move to cold storage)

  return {
    archivedCount: logsToArchive.length,
    archivedAt: new Date(),
  };
}

export async function createAuditLog(data: any) {
  return prisma.auditLog.create({
    data: {
      ...data,
      createdAt: new Date(),
    },
  });
}
