// ============================================================================
// Date Utilities - Africa/Johannesburg Timezone
// ============================================================================

const DEFAULT_TIMEZONE = "Africa/Johannesburg";

/**
 * Format a date according to specified format
 */
export function formatDate(
  date: Date | string,
  format: string = "YYYY-MM-DD",
): string {
  const d = new Date(date);

  const tokens: Record<string, string> = {
    YYYY: d.getFullYear().toString(),
    MM: String(d.getMonth() + 1).padStart(2, "0"),
    DD: String(d.getDate()).padStart(2, "0"),
    HH: String(d.getHours()).padStart(2, "0"),
    mm: String(d.getMinutes()).padStart(2, "0"),
    ss: String(d.getSeconds()).padStart(2, "0"),
  };

  return format.replace(
    /YYYY|MM|DD|HH|mm|ss/g,
    (match) => tokens[match] || match,
  );
}

/**
 * Parse a date string
 */
export function parseDate(dateString: string): Date {
  return new Date(dateString);
}

/**
 * Get current date in Johannesburg timezone
 */
export function getCurrentDate(): Date {
  return new Date();
}

/**
 * Add business days to a date
 */
export function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let addedDays = 0;

  while (addedDays < days) {
    result.setDate(result.getDate() + 1);
    if (isBusinessDay(result)) {
      addedDays++;
    }
  }

  return result;
}

/**
 * Check if a date is a business day
 */
export function isBusinessDay(date: Date): boolean {
  const day = date.getDay();
  // 0 = Sunday, 6 = Saturday
  return day !== 0 && day !== 6;
}

/**
 * Check if a date is a weekend
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Get start of day
 */
export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get end of day
 */
export function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Calculate days between two dates
 */
export function daysBetween(startDate: Date, endDate: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  const start = startOfDay(startDate);
  const end = startOfDay(endDate);
  return Math.round((end.getTime() - start.getTime()) / oneDay);
}

/**
 * Calculate business days between two dates
 */
export function businessDaysBetween(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);

  while (current <= endDate) {
    if (isBusinessDay(current)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Check if date is in the past
 */
export function isPast(date: Date): boolean {
  return date.getTime() < Date.now();
}

/**
 * Check if date is in the future
 */
export function isFuture(date: Date): boolean {
  return date.getTime() > Date.now();
}

/**
 * Check if date is today
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Format date for display in ZA locale
 */
export function formatDisplayDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

/**
 * Format datetime for display in ZA locale
 */
export function formatDisplayDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Get financial year start date
 */
export function getFinancialYearStart(date: Date, month: number = 3): Date {
  const result = new Date(date);
  const currentMonth = result.getMonth();

  if (currentMonth < month) {
    result.setFullYear(result.getFullYear() - 1);
  }
  result.setMonth(month, 1);
  result.setHours(0, 0, 0, 0);

  return result;
}

/**
 * Calculate age in days
 */
export function getAgeInDays(date: Date): number {
  return daysBetween(date, new Date());
}

/**
 * Check if date is overdue
 */
export function isOverdue(dueDate: Date): boolean {
  return endOfDay(dueDate).getTime() < Date.now();
}

/**
 * Get days until due
 */
export function getDaysUntilDue(dueDate: Date): number {
  return daysBetween(new Date(), dueDate);
}
