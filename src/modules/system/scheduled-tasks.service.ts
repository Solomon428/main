import { prisma } from '../../lib/prisma';
import { generateId } from '../../utils/ids';
import { logAuditEvent } from '../../observability/audit';
import { AuditAction } from '../../domain/enums/AuditAction';
import { EntityType } from '../../domain/enums/EntityType';
import { ScheduledTaskType } from '../../domain/enums/ScheduledTaskType';
import { ScheduledTaskStatus } from '../../domain/enums/ScheduledTaskStatus';

export interface CreateScheduledTaskInput {
  name: string;
  description?: string;
  taskType: ScheduledTaskType;
  schedule: string; // Cron expression
  timezone?: string;
  parameters?: Record<string, unknown>;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  isActive?: boolean;
}

export interface UpdateScheduledTaskInput {
  name?: string;
  description?: string;
  schedule?: string;
  timezone?: string;
  parameters?: Record<string, unknown>;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  isActive?: boolean;
}

export interface TaskExecutionContext {
  taskId: string;
  organizationId?: string;
  parameters?: Record<string, unknown>;
  attempt: number;
  startedAt: Date;
}

// Task registry for executable tasks
export type TaskHandler = (context: TaskExecutionContext) => Promise<void>;

const taskRegistry = new Map<ScheduledTaskType, TaskHandler>();

export function registerTaskHandler(type: ScheduledTaskType, handler: TaskHandler) {
  taskRegistry.set(type, handler);
}

export function getTaskHandler(type: ScheduledTaskType): TaskHandler | undefined {
  return taskRegistry.get(type);
}

// Create scheduled task
export async function createScheduledTask(
  organizationId: string | null,
  data: CreateScheduledTaskInput,
  createdBy?: string
) {
  // Validate cron expression
  if (!isValidCronExpression(data.schedule)) {
    throw new Error('Invalid cron expression');
  }

  // Calculate next run time
  const nextRunAt = calculateNextRun(data.schedule, data.timezone);

  const task = await prisma.scheduledTask.create({
    data: {
      id: generateId(),
      organizationId,
      name: data.name,
      description: data.description,
      taskType: data.taskType,
      schedule: data.schedule,
      timezone: data.timezone || 'Africa/Johannesburg',
      parameters: data.parameters || {},
      timeout: data.timeout || 3600,
      retryAttempts: data.retryAttempts ?? 3,
      retryDelay: data.retryDelay ?? 300,
      isActive: data.isActive ?? true,
      nextRunAt,
      createdBy,
    },
  });

  await logAuditEvent({
    userId: createdBy,
    organizationId: organizationId || undefined,
    action: AuditAction.CREATE,
    entityType: EntityType.AUDIT_LOG,
    entityId: task.id,
    newValue: {
      name: task.name,
      taskType: task.taskType,
      schedule: task.schedule,
    },
  });

  return task;
}

export async function updateScheduledTask(
  taskId: string,
  data: UpdateScheduledTaskInput,
  updatedBy?: string
) {
  const task = await prisma.scheduledTask.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    throw new Error('Scheduled task not found');
  }

  // Validate cron expression if provided
  if (data.schedule && !isValidCronExpression(data.schedule)) {
    throw new Error('Invalid cron expression');
  }

  // Recalculate next run if schedule or timezone changed
  let nextRunAt = task.nextRunAt;
  if (data.schedule || data.timezone) {
    nextRunAt = calculateNextRun(
      data.schedule || task.schedule,
      data.timezone || task.timezone
    );
  }

  const updated = await prisma.scheduledTask.update({
    where: { id: taskId },
    data: {
      ...data,
      nextRunAt,
      updatedAt: new Date(),
    },
  });

  await logAuditEvent({
    userId: updatedBy,
    organizationId: task.organizationId || undefined,
    action: AuditAction.UPDATE,
    entityType: EntityType.AUDIT_LOG,
    entityId: taskId,
    oldValue: { schedule: task.schedule, isActive: task.isActive },
    newValue: { schedule: updated.schedule, isActive: updated.isActive },
  });

  return updated;
}

export async function getScheduledTask(taskId: string) {
  return prisma.scheduledTask.findUnique({
    where: { id: taskId },
  });
}

export async function listScheduledTasks(
  organizationId: string | null,
  options?: {
    taskType?: ScheduledTaskType;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }
) {
  const page = options?.page || 1;
  const limit = options?.limit || 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  
  if (organizationId) {
    where.organizationId = organizationId;
  }

  if (options?.taskType) {
    where.taskType = options.taskType;
  }

  if (options?.isActive !== undefined) {
    where.isActive = options.isActive;
  }

  const [tasks, total] = await Promise.all([
    prisma.scheduledTask.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.scheduledTask.count({ where }),
  ]);

  return {
    tasks,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function deleteScheduledTask(taskId: string, deletedBy?: string) {
  const task = await prisma.scheduledTask.delete({
    where: { id: taskId },
  });

  await logAuditEvent({
    userId: deletedBy,
    organizationId: task.organizationId || undefined,
    action: AuditAction.DELETE,
    entityType: EntityType.AUDIT_LOG,
    entityId: taskId,
    oldValue: { name: task.name, taskType: task.taskType },
  });

  return task;
}

// Task execution
export async function executeTask(
  taskId: string,
  triggeredBy?: string
): Promise<{ success: boolean; duration: number; error?: string }> {
  const startTime = Date.now();
  const task = await prisma.scheduledTask.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    throw new Error('Task not found');
  }

  if (!task.isActive) {
    throw new Error('Task is not active');
  }

  // Mark as running
  await prisma.scheduledTask.update({
    where: { id: taskId },
    data: {
      isRunning: true,
      lastRunStatus: ScheduledTaskStatus.RUNNING,
    },
  });

  const context: TaskExecutionContext = {
    taskId,
    organizationId: task.organizationId || undefined,
    parameters: (task.parameters as Record<string, unknown>) || {},
    attempt: 1,
    startedAt: new Date(),
  };

  try {
    // Get task handler
    const handler = getTaskHandler(task.taskType);
    
    if (!handler) {
      throw new Error(`No handler registered for task type: ${task.taskType}`);
    }

    // Execute with timeout
    await executeWithTimeout(handler, context, task.timeout);

    const duration = Math.floor((Date.now() - startTime) / 1000);

    // Update success status
    await prisma.scheduledTask.update({
      where: { id: taskId },
      data: {
        isRunning: false,
        lastRunAt: new Date(),
        lastRunStatus: ScheduledTaskStatus.SUCCESS,
        lastRunError: null,
        lastRunDuration: duration,
        nextRunAt: calculateNextRun(task.schedule, task.timezone),
        runCount: { increment: 1 },
        failureCount: 0,
      },
    });

    await logAuditEvent({
      userId: triggeredBy,
      organizationId: task.organizationId || undefined,
      action: AuditAction.UPDATE,
      entityType: EntityType.AUDIT_LOG,
      entityId: taskId,
      changesSummary: `Task executed successfully in ${duration}s`,
    });

    return { success: true, duration };
  } catch (error) {
    const duration = Math.floor((Date.now() - startTime) / 1000);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Update failure status
    await prisma.scheduledTask.update({
      where: { id: taskId },
      data: {
        isRunning: false,
        lastRunAt: new Date(),
        lastRunStatus: ScheduledTaskStatus.FAILED,
        lastRunError: errorMessage,
        lastRunDuration: duration,
        nextRunAt: calculateNextRun(task.schedule, task.timezone),
        runCount: { increment: 1 },
        failureCount: { increment: 1 },
      },
    });

    await logAuditEvent({
      userId: triggeredBy,
      organizationId: task.organizationId || undefined,
      action: AuditAction.UPDATE,
      entityType: EntityType.AUDIT_LOG,
      entityId: taskId,
      changesSummary: `Task execution failed: ${errorMessage}`,
    });

    return { success: false, duration, error: errorMessage };
  }
}

async function executeWithTimeout(
  handler: TaskHandler,
  context: TaskExecutionContext,
  timeoutSeconds: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Task timed out after ${timeoutSeconds} seconds`));
    }, timeoutSeconds * 1000);

    handler(context)
      .then(() => {
        clearTimeout(timeoutId);
        resolve();
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

// Run all pending tasks
export async function runPendingTasks(): Promise<{
  executed: number;
  results: Array<{ taskId: string; success: boolean; error?: string }>;
}> {
  const now = new Date();
  
  const pendingTasks = await prisma.scheduledTask.findMany({
    where: {
      isActive: true,
      isRunning: false,
      nextRunAt: { lte: now },
    },
  });

  const results = [];

  for (const task of pendingTasks) {
    try {
      const result = await executeTask(task.id, 'scheduler');
      results.push({
        taskId: task.id,
        success: result.success,
        error: result.error,
      });
    } catch (error) {
      results.push({
        taskId: task.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return {
    executed: pendingTasks.length,
    results,
  };
}

// Pause/Resume task
export async function pauseTask(taskId: string, pausedBy?: string) {
  const task = await prisma.scheduledTask.update({
    where: { id: taskId },
    data: {
      isActive: false,
      updatedAt: new Date(),
    },
  });

  await logAuditEvent({
    userId: pausedBy,
    organizationId: task.organizationId || undefined,
    action: AuditAction.UPDATE,
    entityType: EntityType.AUDIT_LOG,
    entityId: taskId,
    changesSummary: 'Task paused',
  });

  return task;
}

export async function resumeTask(taskId: string, resumedBy?: string) {
  const task = await prisma.scheduledTask.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    throw new Error('Task not found');
  }

  const updated = await prisma.scheduledTask.update({
    where: { id: taskId },
    data: {
      isActive: true,
      nextRunAt: calculateNextRun(task.schedule, task.timezone),
      updatedAt: new Date(),
    },
  });

  await logAuditEvent({
    userId: resumedBy,
    organizationId: task.organizationId || undefined,
    action: AuditAction.UPDATE,
    entityType: EntityType.AUDIT_LOG,
    entityId: taskId,
    changesSummary: 'Task resumed',
  });

  return updated;
}

// Manual trigger
export async function triggerTask(taskId: string, triggeredBy: string) {
  return executeTask(taskId, triggeredBy);
}

// Task statistics
export async function getTaskStatistics(organizationId?: string) {
  const where: Record<string, unknown> = organizationId
    ? { organizationId }
    : {};

  const [byType, byStatus, recentFailures] = await Promise.all([
    prisma.scheduledTask.groupBy({
      by: ['taskType'],
      where,
      _count: { id: true },
    }),
    prisma.scheduledTask.groupBy({
      by: ['lastRunStatus'],
      where,
      _count: { id: true },
    }),
    prisma.scheduledTask.findMany({
      where: {
        ...where,
        lastRunStatus: ScheduledTaskStatus.FAILED,
      },
      orderBy: { lastRunAt: 'desc' },
      take: 10,
    }),
  ]);

  const totals = await prisma.scheduledTask.aggregate({
    where,
    _sum: {
      runCount: true,
      failureCount: true,
    },
    _count: {
      id: true,
    },
  });

  return {
    byType,
    byStatus,
    recentFailures,
    totals: {
      tasks: totals._count.id,
      totalRuns: totals._sum.runCount || 0,
      totalFailures: totals._sum.failureCount || 0,
    },
  };
}

// Helper functions
function isValidCronExpression(schedule: string): boolean {
  // Basic cron validation (5 parts: minute hour day month weekday)
  const parts = schedule.split(' ');
  if (parts.length < 5 || parts.length > 6) {
    return false;
  }
  // More comprehensive validation would use a cron parser library
  return true;
}

function calculateNextRun(schedule: string, timezone?: string): Date {
  // In production, use a proper cron parser like node-cron or node-schedule
  // For now, return a time 1 hour from now
  const next = new Date();
  next.setHours(next.getHours() + 1);
  return next;
}

// Register built-in task handlers
registerTaskHandler(ScheduledTaskType.INVOICE_PROCESSING, async (context) => {
  console.log(`[TASK] Processing invoices for ${context.organizationId}`);
  // Implement invoice processing logic
});

registerTaskHandler(ScheduledTaskType.APPROVAL_ESCALATION, async (context) => {
  console.log(`[TASK] Checking approval escalations for ${context.organizationId}`);
  // Implement approval escalation logic
});

registerTaskHandler(ScheduledTaskType.APPROVAL_REMINDER, async (context) => {
  console.log(`[TASK] Sending approval reminders for ${context.organizationId}`);
  // Implement approval reminder logic
});

registerTaskHandler(ScheduledTaskType.PAYMENT_PROCESSING, async (context) => {
  console.log(`[TASK] Processing payments for ${context.organizationId}`);
  // Implement payment processing logic
});

registerTaskHandler(ScheduledTaskType.PAYMENT_RECONCILIATION, async (context) => {
  console.log(`[TASK] Reconciling payments for ${context.organizationId}`);
  // Implement reconciliation logic
});

registerTaskHandler(ScheduledTaskType.RECONCILIATION, async (context) => {
  console.log(`[TASK] Running reconciliation for ${context.organizationId}`);
  // Implement reconciliation logic
});

registerTaskHandler(ScheduledTaskType.RISK_ASSESSMENT, async (context) => {
  console.log(`[TASK] Running risk assessment for ${context.organizationId}`);
  // Implement risk assessment logic
});

registerTaskHandler(ScheduledTaskType.COMPLIANCE_CHECK, async (context) => {
  console.log(`[TASK] Running compliance checks for ${context.organizationId}`);
  // Implement compliance check logic
});

registerTaskHandler(ScheduledTaskType.REPORT_GENERATION, async (context) => {
  console.log(`[TASK] Generating reports for ${context.organizationId}`);
  // Implement report generation logic
});

registerTaskHandler(ScheduledTaskType.DATA_CLEANUP, async (context) => {
  console.log(`[TASK] Running data cleanup for ${context.organizationId}`);
  // Implement data cleanup logic
});

registerTaskHandler(ScheduledTaskType.BACKUP, async (context) => {
  console.log(`[TASK] Running backup`);
  // Implement backup logic
});

registerTaskHandler(ScheduledTaskType.NOTIFICATION_DIGEST, async (context) => {
  console.log(`[TASK] Sending notification digests for ${context.organizationId}`);
  // Implement notification digest logic
});

registerTaskHandler(ScheduledTaskType.AUDIT_LOG_ARCHIVE, async (context) => {
  console.log(`[TASK] Archiving audit logs for ${context.organizationId}`);
  // Implement audit log archiving logic
});

registerTaskHandler(ScheduledTaskType.SUPPLIER_RATING_UPDATE, async (context) => {
  console.log(`[TASK] Updating supplier ratings for ${context.organizationId}`);
  // Implement supplier rating update logic
});
