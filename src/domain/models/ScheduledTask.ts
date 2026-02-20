import { ScheduledTaskType } from "../enums/ScheduledTaskType";
import { ScheduledTaskStatus } from "../enums/ScheduledTaskStatus";

export interface ScheduledTask {
  id: string;
  organizationId?: string | null;
  name: string;
  description?: string | null;
  taskType: ScheduledTaskType;
  schedule: string;
  timezone: string;
  isActive: boolean;
  isRunning: boolean;
  lastRunAt?: Date | null;
  lastRunStatus?: ScheduledTaskStatus | null;
  lastRunError?: string | null;
  lastRunDuration?: number | null;
  nextRunAt?: Date | null;
  runCount: number;
  failureCount: number;
  parameters?: Record<string, unknown> | null;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
}
