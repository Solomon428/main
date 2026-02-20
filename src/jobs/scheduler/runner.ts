// ============================================================================
// Job Runner - Executes scheduled tasks
// ============================================================================

import { prisma } from "../../lib/prisma";
import { ScheduledTask } from "../../domain/models/ScheduledTask";
import { ScheduledTaskStatus } from "../../domain/enums/ScheduledTaskStatus";
import { getNextExecutionTime, shouldRunTask } from "./cron";
import { getTaskHandler } from "./registry";
import { info, error } from "../../observability/logger";

const RUNNING_TASKS = new Map<string, AbortController>();

/**
 * Run all due tasks
 */
export async function runDueTasks(): Promise<void> {
  const tasks = await prisma.scheduledTask.findMany({
    where: {
      isActive: true,
      isRunning: false,
      OR: [{ nextRunAt: { lte: new Date() } }, { nextRunAt: null }],
    },
  });

  for (const task of tasks) {
    if (shouldRunTask(task)) {
      // Run task asynchronously
      runTask(task).catch((err) => {
        error(`Failed to run task ${task.id}`, { error: err.message });
      });
    }
  }
}

/**
 * Run a single task
 */
export async function runTask(task: ScheduledTask): Promise<void> {
  const startTime = Date.now();
  const abortController = new AbortController();
  RUNNING_TASKS.set(task.id, abortController);

  // Mark task as running
  await prisma.scheduledTask.update({
    where: { id: task.id },
    data: {
      isRunning: true,
      lastRunStatus: ScheduledTaskStatus.RUNNING,
    },
  });

  info(`Starting task: ${task.name} (${task.taskType})`, { taskId: task.id });

  try {
    // Get task handler
    const handler = getTaskHandler(task.taskType);

    if (!handler) {
      throw new Error(`No handler found for task type: ${task.taskType}`);
    }

    // Execute task with timeout
    const timeoutMs = (task.timeout || 3600) * 1000;

    await Promise.race([
      handler(task, abortController.signal),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Task timeout")), timeoutMs);
      }),
    ]);

    // Task completed successfully
    const duration = Math.round((Date.now() - startTime) / 1000);
    const nextRunAt = getNextExecutionTime(task.schedule, task.timezone);

    await prisma.scheduledTask.update({
      where: { id: task.id },
      data: {
        isRunning: false,
        lastRunAt: new Date(),
        lastRunStatus: ScheduledTaskStatus.COMPLETED,
        lastRunDuration: duration,
        nextRunAt,
        runCount: { increment: 1 },
        lastRunError: null,
      },
    });

    info(`Task completed: ${task.name}`, { taskId: task.id, duration });
  } catch (err) {
    // Task failed
    const duration = Math.round((Date.now() - startTime) / 1000);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";

    // Check if we should retry
    const shouldRetry = task.failureCount < (task.retryAttempts || 3);
    const nextRunAt = shouldRetry
      ? new Date(Date.now() + (task.retryDelay || 300) * 1000)
      : getNextExecutionTime(task.schedule, task.timezone);

    await prisma.scheduledTask.update({
      where: { id: task.id },
      data: {
        isRunning: false,
        lastRunAt: new Date(),
        lastRunStatus: shouldRetry
          ? ScheduledTaskStatus.RETRYING
          : ScheduledTaskStatus.FAILED,
        lastRunDuration: duration,
        lastRunError: errorMessage,
        nextRunAt,
        failureCount: { increment: 1 },
      },
    });

    error(`Task failed: ${task.name}`, {
      taskId: task.id,
      duration,
      error: errorMessage,
      willRetry: shouldRetry,
    });
  } finally {
    RUNNING_TASKS.delete(task.id);
  }
}

/**
 * Cancel a running task
 */
export async function cancelTask(taskId: string): Promise<boolean> {
  const controller = RUNNING_TASKS.get(taskId);

  if (!controller) {
    return false;
  }

  controller.abort();

  await prisma.scheduledTask.update({
    where: { id: taskId },
    data: {
      isRunning: false,
      lastRunStatus: ScheduledTaskStatus.CANCELLED,
    },
  });

  RUNNING_TASKS.delete(taskId);
  return true;
}

/**
 * Get running tasks
 */
export function getRunningTasks(): string[] {
  return Array.from(RUNNING_TASKS.keys());
}

/**
 * Check if a task is running
 */
export function isTaskRunning(taskId: string): boolean {
  return RUNNING_TASKS.has(taskId);
}

/**
 * Manually trigger a task
 */
export async function triggerTask(taskId: string): Promise<void> {
  const task = await prisma.scheduledTask.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    throw new Error("Task not found");
  }

  if (task.isRunning) {
    throw new Error("Task is already running");
  }

  await runTask(task);
}
