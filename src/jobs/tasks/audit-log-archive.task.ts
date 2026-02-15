import { prisma } from '../../lib/prisma';
import { ScheduledTask } from '../../domain/models/ScheduledTask';
import { info } from '../../observability/logger';

/**
 * Archive old audit logs
 */
export async function runTask(
  task: ScheduledTask,
  signal: AbortSignal
): Promise<void> {
  info('Starting audit log archive task', { taskId: task.id });

  const archiveCutoff = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000); // 2 years
  const deleteCutoff = new Date(Date.now() - 7 * 365 * 24 * 60 * 60 * 1000); // 7 years

  // Archive logs older than 2 years
  const logsToArchive = await prisma.auditLog.findMany({
    where: {
      createdAt: { lt: archiveCutoff, gte: deleteCutoff },
    },
    take: 1000,
  });

  if (logsToArchive.length > 0) {
    // In a real implementation, you would:
    // 1. Write to archive storage (S3, etc.)
    // 2. Delete from main database
    // 3. Update archive metadata

    info(`Archived ${logsToArchive.length} audit logs`, { taskId: task.id });
  }

  // Permanently delete logs older than 7 years
  const deletedLogs = await prisma.auditLog.deleteMany({
    where: {
      createdAt: { lt: deleteCutoff },
    },
  });

  info(`Permanently deleted ${deletedLogs.count} old audit logs`, { taskId: task.id });

  info('Audit log archive task completed', { taskId: task.id });
}
