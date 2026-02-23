// ============================================================================
// Cron Job Scheduler
// ============================================================================

import { ScheduledTask } from "../../domain/models/ScheduledTask";
import { ScheduledTaskStatus } from "../../domain/enums/ScheduledTaskStatus";

// Cron expression parser
interface CronParts {
  minute: number[];
  hour: number[];
  dayOfMonth: number[];
  month: number[];
  dayOfWeek: number[];
}

/**
 * Parse a cron expression into its component parts
 */
export function parseCronExpression(expression: string): CronParts {
  const parts = expression.split(" ");

  if (parts.length !== 5) {
    throw new Error(
      "Invalid cron expression. Expected 5 parts: minute hour day month dayOfWeek",
    );
  }

  const minutePart = parts[0] ?? '';
  const hourPart = parts[1] ?? '';
  const dayOfMonthPart = parts[2] ?? '';
  const monthPart = parts[3] ?? '';
  const dayOfWeekPart = parts[4] ?? '';

  return {
    minute: parseCronPart(minutePart, 0, 59),
    hour: parseCronPart(hourPart, 0, 23),
    dayOfMonth: parseCronPart(dayOfMonthPart, 1, 31),
    month: parseCronPart(monthPart, 1, 12),
    dayOfWeek: parseCronPart(dayOfWeekPart, 0, 6),
  };
}

/**
 * Parse a single cron part
 */
function parseCronPart(part: string, min: number, max: number): number[] {
  const values: number[] = [];

  // Handle comma-separated values
  const segments = part.split(",");

  for (const segment of segments) {
    // Handle ranges (e.g., 1-5)
    if (segment.includes("-")) {
      const rangeParts = segment.split("-");
      const start = Number(rangeParts[0]) ?? min;
      const end = Number(rangeParts[1]) ?? max;
      for (let i = start; i <= end; i++) {
        if (i >= min && i <= max) values.push(i);
      }
    }
    // Handle steps (e.g., */5)
    else if (segment.includes("/")) {
      const stepParts = segment.split("/");
      const range = stepParts[0] ?? '*';
      const step = stepParts[1] ?? '1';
      const stepNum = Number(step);
      const start = range === "*" ? min : Number(range);
      for (let i = start; i <= max; i += stepNum) {
        values.push(i);
      }
    }
    // Handle wildcard
    else if (segment === "*") {
      for (let i = min; i <= max; i++) {
        values.push(i);
      }
    }
    // Handle single value
    else {
      const num = Number(segment);
      if (num >= min && num <= max) values.push(num);
    }
  }

  return [...new Set(values)].sort((a, b) => a - b);
}

/**
 * Get the next execution time for a cron expression
 */
export function getNextExecutionTime(
  expression: string,
  timezone: string = "Africa/Johannesburg",
  fromDate: Date = new Date(),
): Date {
  const cron = parseCronExpression(expression);

  // Start from the next minute
  const next = new Date(fromDate);
  next.setSeconds(0, 0);
  next.setMinutes(next.getMinutes() + 1);

  // Find next matching time (with a limit to prevent infinite loops)
  let attempts = 0;
  const maxAttempts = 366 * 24 * 60; // Max 1 year in minutes

  while (attempts < maxAttempts) {
    if (matchesCron(cron, next)) {
      return next;
    }

    next.setMinutes(next.getMinutes() + 1);
    attempts++;
  }

  throw new Error("Could not find next execution time within 1 year");
}

/**
 * Check if a date matches a cron expression
 */
function matchesCron(cron: CronParts, date: Date): boolean {
  return (
    cron.minute.includes(date.getMinutes()) &&
    cron.hour.includes(date.getHours()) &&
    cron.dayOfMonth.includes(date.getDate()) &&
    cron.month.includes(date.getMonth() + 1) &&
    cron.dayOfWeek.includes(date.getDay())
  );
}

/**
 * Check if a task should run now
 */
export function shouldRunTask(task: ScheduledTask): boolean {
  if (!task.isActive || task.isRunning) {
    return false;
  }

  const now = new Date();

  // Check if next run time has passed
  if (task.nextRunAt && task.nextRunAt <= now) {
    return true;
  }

  // Calculate and check next run time
  try {
    const nextRun = getNextExecutionTime(task.schedule, task.timezone);
    return nextRun <= now;
  } catch {
    return false;
  }
}

/**
 * Common cron expressions
 */
export const CRON_EXPRESSIONS = {
  EVERY_MINUTE: "* * * * *",
  EVERY_5_MINUTES: "*/5 * * * *",
  EVERY_15_MINUTES: "*/15 * * * *",
  EVERY_30_MINUTES: "*/30 * * * *",
  HOURLY: "0 * * * *",
  DAILY: "0 0 * * *",
  DAILY_2AM: "0 2 * * *",
  WEEKLY: "0 0 * * 0",
  WEEKLY_SUNDAY_3AM: "0 3 * * 0",
  MONTHLY: "0 0 1 * *",
  MONTHLY_FIRST_2AM: "0 2 1 * *",
  WEEKDAYS_9AM: "0 9 * * 1-5",
  WEEKDAYS_5PM: "0 17 * * 1-5",
} as const;

/**
 * Validate a cron expression
 */
export function validateCronExpression(expression: string): boolean {
  try {
    parseCronExpression(expression);
    return true;
  } catch {
    return false;
  }
}
