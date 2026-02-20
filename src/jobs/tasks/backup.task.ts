import { exec } from "child_process";
import { promisify } from "util";
import { prisma } from "../../lib/prisma";
import { ScheduledTask } from "../../domain/models/ScheduledTask";
import { info, error } from "../../observability/logger";

const execAsync = promisify(exec);

/**
 * Database backup task
 */
export async function runTask(
  task: ScheduledTask,
  signal: AbortSignal,
): Promise<void> {
  info("Starting backup task", { taskId: task.id });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = process.env.BACKUP_PATH || "./backups";
  const filename = `creditorflow-backup-${timestamp}.sql`;
  const filepath = `${backupDir}/${filename}`;

  try {
    // Get database URL from environment
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error("DATABASE_URL not set");
    }

    // Parse database URL
    const url = new URL(dbUrl);
    const user = url.username;
    const password = url.password;
    const host = url.hostname;
    const port = url.port || "5432";
    const database = url.pathname.substring(1);

    // Run pg_dump
    const command = `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${user} -d ${database} -F c -f "${filepath}"`;

    if (signal.aborted) {
      info("Backup task aborted", { taskId: task.id });
      return;
    }

    await execAsync(command);

    info(`Backup created: ${filepath}`, { taskId: task.id });

    // Clean up old backups (keep last 30 days)
    const cleanupCommand = `find ${backupDir} -name "creditorflow-backup-*.sql" -mtime +30 -delete`;
    await execAsync(cleanupCommand);

    info("Old backups cleaned up", { taskId: task.id });

    // Log backup completion
    await prisma.auditLog.create({
      data: {
        action: "BACKUP",
        entityType: "SYSTEM",
        entityId: task.id,
        changesSummary: `Backup created: ${filename}`,
        createdAt: new Date(),
      },
    });
  } catch (err) {
    error("Backup failed", {
      taskId: task.id,
      error: err instanceof Error ? err.message : "Unknown error",
    });
    throw err;
  }

  info("Backup task completed", { taskId: task.id });
}
