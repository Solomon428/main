import { prisma } from "../../lib/prisma";
import { ScheduledTask } from "../../domain/models/ScheduledTask";
import { info } from "../../observability/logger";

/**
 * Cleanup old data and temporary files
 */
export async function runTask(
  task: ScheduledTask,
  signal: AbortSignal,
): Promise<void> {
  info("Starting data cleanup task", { taskId: task.id });

  const now = new Date();

  // Cleanup old sessions
  const sessionCutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // 90 days
  const deletedSessions = await prisma.session.deleteMany({
    where: {
      expires: { lt: sessionCutoff },
    },
  });
  info(`Deleted ${deletedSessions.count} expired sessions`, {
    taskId: task.id,
  });

  if (signal.aborted) return;

  // Cleanup old audit logs
  const auditCutoff = new Date(now.getTime() - 7 * 365 * 24 * 60 * 60 * 1000); // 7 years
  const deletedAuditLogs = await prisma.auditLog.deleteMany({
    where: {
      createdAt: { lt: auditCutoff },
    },
  });
  info(`Deleted ${deletedAuditLogs.count} old audit logs`, { taskId: task.id });

  if (signal.aborted) return;

  // Cleanup old notifications
  const notificationCutoff = new Date(
    now.getTime() - 1 * 365 * 24 * 60 * 60 * 1000,
  ); // 1 year
  const deletedNotifications = await prisma.notification.deleteMany({
    where: {
      createdAt: { lt: notificationCutoff },
      status: { in: ["READ", "ARCHIVED"] },
    },
  });
  info(`Deleted ${deletedNotifications.count} old notifications`, {
    taskId: task.id,
  });

  if (signal.aborted) return;

  // Cleanup old file attachments (soft delete)
  const fileCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days
  const deletedFiles = await prisma.fileAttachment.updateMany({
    where: {
      deletedAt: { lt: fileCutoff },
    },
    data: {
      // Mark for permanent deletion
    },
  });
  info(`Processed ${deletedFiles.count} deleted files`, { taskId: task.id });

  if (signal.aborted) return;

  // Cleanup old password reset tokens
  const tokenCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours
  const deletedTokens = await prisma.passwordResetToken.deleteMany({
    where: {
      expires: { lt: tokenCutoff },
    },
  });
  info(`Deleted ${deletedTokens.count} expired tokens`, { taskId: task.id });

  info("Data cleanup task completed", { taskId: task.id });
}
