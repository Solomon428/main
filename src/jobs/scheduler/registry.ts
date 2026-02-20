// ============================================================================
// Task Handler Registry
// ============================================================================

import { ScheduledTask } from "../../domain/models/ScheduledTask";
import { ScheduledTaskType } from "../../domain/enums/ScheduledTaskType";

// Task handler type
export type TaskHandler = (
  task: ScheduledTask,
  signal: AbortSignal,
) => Promise<void>;

// Registry of task handlers
const handlers = new Map<ScheduledTaskType, TaskHandler>();

/**
 * Register a task handler
 */
export function registerTaskHandler(
  type: ScheduledTaskType,
  handler: TaskHandler,
): void {
  handlers.set(type, handler);
}

/**
 * Get a task handler
 */
export function getTaskHandler(
  type: ScheduledTaskType,
): TaskHandler | undefined {
  return handlers.get(type);
}

/**
 * Check if a handler exists
 */
export function hasTaskHandler(type: ScheduledTaskType): boolean {
  return handlers.has(type);
}

/**
 * Get all registered handler types
 */
export function getRegisteredHandlers(): ScheduledTaskType[] {
  return Array.from(handlers.keys());
}

/**
 * Remove a task handler
 */
export function unregisterTaskHandler(type: ScheduledTaskType): boolean {
  return handlers.delete(type);
}

/**
 * Clear all handlers
 */
export function clearHandlers(): void {
  handlers.clear();
}

// Import and register built-in handlers
// These would be imported from ../tasks/ directory
export async function registerBuiltInHandlers(): Promise<void> {
  // Import task modules dynamically to avoid circular dependencies
  const taskModules = [
    {
      type: ScheduledTaskType.INVOICE_PROCESSING,
      path: "../tasks/invoice-processing.task",
    },
    {
      type: ScheduledTaskType.APPROVAL_ESCALATION,
      path: "../tasks/approval-escalation.task",
    },
    {
      type: ScheduledTaskType.APPROVAL_REMINDER,
      path: "../tasks/approval-reminder.task",
    },
    {
      type: ScheduledTaskType.PAYMENT_PROCESSING,
      path: "../tasks/payment-processing.task",
    },
    {
      type: ScheduledTaskType.RECONCILIATION,
      path: "../tasks/reconciliation.task",
    },
    {
      type: ScheduledTaskType.RISK_ASSESSMENT,
      path: "../tasks/risk-assessment.task",
    },
    {
      type: ScheduledTaskType.COMPLIANCE_CHECK,
      path: "../tasks/compliance-check.task",
    },
    {
      type: ScheduledTaskType.REPORT_GENERATION,
      path: "../tasks/report-generation.task",
    },
    {
      type: ScheduledTaskType.DATA_CLEANUP,
      path: "../tasks/data-cleanup.task",
    },
    { type: ScheduledTaskType.BACKUP, path: "../tasks/backup.task" },
    {
      type: ScheduledTaskType.NOTIFICATION_DIGEST,
      path: "../tasks/notification-digest.task",
    },
    {
      type: ScheduledTaskType.AUDIT_LOG_ARCHIVE,
      path: "../tasks/audit-log-archive.task",
    },
    {
      type: ScheduledTaskType.SUPPLIER_RATING_UPDATE,
      path: "../tasks/supplier-rating-update.task",
    },
  ];

  for (const { type, path } of taskModules) {
    try {
      const module = await import(path);
      if (module.runTask) {
        registerTaskHandler(type, module.runTask);
      }
    } catch (error) {
      console.warn(`Failed to load task handler for ${type}:`, error);
    }
  }
}
