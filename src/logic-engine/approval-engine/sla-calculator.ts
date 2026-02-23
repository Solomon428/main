import { DateTimeType, Duration, Interval } from "luxon";
import type { DateTimeType as DateTimeTypeType } from "luxon";

// ==================== DOMAIN TYPES ====================
export interface BusinessHoursConfig {
  timezone: string;
  workWeek: {
    startDay: number; // 1=Monday, 7=Sunday
    endDay: number;
  };
  dailyHours: {
    start: string; // "09:00"
    end: string; // "17:00"
  };
  lunchBreak?: {
    start: string;
    end: string;
  };
  holidayCalendar?: Holiday[];
}

export interface Holiday {
  date: string; // ISO "YYYY-MM-DD"
  name: string;
  observedDate?: string;
  isPartial?: boolean;
  partialHours?: {
    start?: string;
    end?: string;
  };
}

export interface SLACalculationResult {
  targetDateTimeType: ReturnType<typeof DateTimeType.fromISO>;
  elapsedBusinessMinutes: number;
  elapsedCalendarMinutes: number;
  businessDaysSkipped: number;
  holidaysEncountered: Holiday[];
  breached: boolean;
  remainingMinutes: number;
  meta: {
    calculationId: string;
    timestamp: ReturnType<typeof DateTimeType.fromISO>;
    timezone: string;
  };
}

export interface SLAPolicy {
  id: string;
  name: string;
  responseTargetMinutes: number;
  resolutionTargetMinutes: number;
  businessHoursConfig: BusinessHoursConfig;
  holidayCalendar: Holiday[];
  priorityLevels: Record<
    string,
    { multiplier: number; maxBreachMinutes: number }
  >;
}

// ==================== CUSTOM ERRORS ====================
export class SLACalculationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(`[SLA-${code}] ${message}`);
    this.name = "SLACalculationError";
  }
}

export class HolidayCalendarError extends SLACalculationError {
  constructor(message: string) {
    super(message, "HOLIDAY_ERR");
  }
}

// ==================== HOLIDAY CALENDAR SERVICE ====================
export class HolidayCalendarService {
  private readonly holidaysByDate: Map<string, Holiday>;
  private readonly partialHolidays: Set<string>;

  constructor(
    private readonly config: { holidays: Holiday[] },
    private readonly logger?: (
      level: "debug" | "info" | "warn" | "error",
      msg: string,
    ) => void,
  ) {
    this.holidaysByDate = new Map();
    this.partialHolidays = new Set();

    for (const holiday of config.holidays) {
      const key = holiday.observedDate || holiday.date;
      this.holidaysByDate.set(key, holiday);
      if (holiday.isPartial) this.partialHolidays.add(key);
    }
  }

  isHoliday(date: DateTimeType): boolean {
    return this.holidaysByDate.has(date.toISODate() as string);
  }

  getHoliday(date: DateTimeType): Holiday | undefined {
    return this.holidaysByDate.get(date.toISODate() as string);
  }

  isPartialHoliday(date: DateTimeType): boolean {
    return this.partialHolidays.has(date.toISODate() as string);
  }

  getPartialHours(date: DateTimeType): { start: import("luxon").DateTime; end: DateTimeType } | null {
    const holiday = this.getHoliday(date);
    if (!holiday?.isPartial || !holiday.partialHours) return null;

    const baseDate = date.setZone(this.getTimezoneFromHoliday(holiday));
    const startTime = holiday.partialHours.start || "09:00";
    const endTime = holiday.partialHours.end || "17:00";
    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);
    return {
      start: baseDate.set({
        hour: startHour,
        minute: startMin,
        second: 0,
        millisecond: 0,
      }),
      end: baseDate.set({
        hour: endHour,
        minute: endMin,
        second: 0,
        millisecond: 0,
      }),
    };
  }

  private getTimezoneFromHoliday(_holiday: Holiday): string {
    // In real implementation, holidays might carry timezone info
    return "UTC";
  }

  getNextBusinessDay(fromDate: DateTimeType): DateTimeType {
    let candidate = fromDate.plus({ days: 1 });
    while (this.isHoliday(candidate) || this.isWeekend(candidate)) {
      candidate = candidate.plus({ days: 1 });
    }
    return candidate.startOf("day");
  }

  private isWeekend(date: DateTimeType): boolean {
    const dow = date.weekday; // 1=Mon, 7=Sun
    return dow === 6 || dow === 7;
  }
}

// ==================== BUSINESS HOURS ENGINE ====================
export class BusinessHoursEngine {
  constructor(
    private readonly config: BusinessHoursConfig,
    private readonly holidayService: HolidayCalendarService,
  ) {
    this.validateConfig();
  }

  private validateConfig(): void {
    const { dailyHours, workWeek } = this.config;
    if (workWeek.startDay < 1 || workWeek.startDay > 7) {
      throw new SLACalculationError("Invalid startDay", "CONFIG_ERR");
    }
    if (workWeek.endDay < 1 || workWeek.endDay > 7) {
      throw new SLACalculationError("Invalid endDay", "CONFIG_ERR");
    }
    if (workWeek.startDay > workWeek.endDay) {
      throw new SLACalculationError(
        "startDay cannot be after endDay",
        "CONFIG_ERR",
      );
    }
    // Validate time formats
    [dailyHours.start, dailyHours.end].forEach((time) => {
      if (time && !/^\d{2}:\d{2}$/.test(time)) {
        throw new SLACalculationError(
          `Invalid time format: ${time}`,
          "CONFIG_ERR",
        );
      }
    });
  }

  isBusinessHour(dateTime: DateTimeType): boolean {
    if (this.holidayService.isHoliday(dateTime)) return false;
    if (this.isOutsideWorkWeek(dateTime)) return false;

    const timeStr = dateTime.toFormat("HH:mm");
    const { start, end } = this.config.dailyHours;

    if (timeStr < start || timeStr >= end) return false;

    if (this.config.lunchBreak) {
      const { start: lunchStart, end: lunchEnd } = this.config.lunchBreak;
      if (timeStr >= lunchStart && timeStr < lunchEnd) return false;
    }

    return true;
  }

  private isOutsideWorkWeek(dateTime: DateTimeType): boolean {
    const dow = dateTime.weekday;
    const { startDay, endDay } = this.config.workWeek;

    if (startDay <= endDay) {
      return dow < startDay || dow > endDay;
    } else {
      // Weekend-spanning work week (e.g., Fri-Sun)
      return dow > endDay && dow < startDay;
    }
  }

  getNextBusinessStart(fromTime: DateTimeType): DateTimeType {
    let candidate = fromTime;
    const [startHour, startMin] = (this.config.dailyHours.start || "09:00")
      .split(":")
      .map(Number);

    // If outside business hours, jump to next business day start
    while (!this.isBusinessHour(candidate)) {
      // Check if we're before business start today
      const dayStart = candidate.set({
        hour: startHour,
        minute: startMin,
        second: 0,
        millisecond: 0,
      });

      if (
        candidate < dayStart &&
        !this.holidayService.isHoliday(candidate) &&
        !this.isOutsideWorkWeek(candidate)
      ) {
        return dayStart;
      }

      // Move to next day start
      candidate = candidate.plus({ days: 1 }).startOf("day").set({
        hour: startHour,
        minute: startMin,
        second: 0,
        millisecond: 0,
      });
    }

    return candidate;
  }

  getBusinessMinutesBetween(start: DateTimeType, end: DateTimeType): number {
    if (end <= start) return 0;

    let totalMinutes = 0;
    let current = start;

    while (current < end) {
      if (this.isBusinessHour(current)) {
        const nextMinute = current.plus({ minutes: 1 });
        if (nextMinute <= end) totalMinutes++;
      }
      current = current.plus({ minutes: 1 });
    }

    return totalMinutes;
  }

  getBusinessDuration(start: DateTimeType, targetMinutes: number): DateTimeType {
    if (targetMinutes <= 0) return start;

    let remaining = targetMinutes;
    let current = this.isBusinessHour(start)
      ? start
      : this.getNextBusinessStart(start);

    while (remaining > 0) {
      if (this.isBusinessHour(current)) {
        remaining--;
      }
      if (remaining > 0) {
        current = current.plus({ minutes: 1 });
      }
    }

    return current;
  }
}

// ==================== SLA CALCULATOR SERVICE ====================
export class SLACalculatorService {
  private readonly businessHoursEngine: BusinessHoursEngine;
  private readonly holidayService: HolidayCalendarService;

  constructor(
    private readonly slaPolicy: SLAPolicy,
    private readonly opts: {
      logger?: (
        level: "debug" | "info" | "warn" | "error",
        msg: string,
        meta?: any,
      ) => void;
      clock?: () => DateTimeType;
      observabilityHook?: (event: string, data: any) => void;
    } = {},
  ) {
    this.holidayService = new HolidayCalendarService(
      { holidays: slaPolicy.businessHoursConfig.holidayCalendar || [] },
      opts.logger,
    );

    this.businessHoursEngine = new BusinessHoursEngine(
      slaPolicy.businessHoursConfig,
      this.holidayService,
    );
  }

  calculateResponseDeadline(
    ticketCreated: DateTimeType,
    priorityLevel: string = "standard",
  ): SLACalculationResult {
    const priorityConfig = this.slaPolicy.priorityLevels[priorityLevel] ||
      this.slaPolicy.priorityLevels["standard"] || {
        multiplier: 1.0,
        maxBreachMinutes: 60,
      };

    const targetMinutes = Math.round(
      this.slaPolicy.responseTargetMinutes * priorityConfig.multiplier,
    );

    return this.calculateDeadline(
      ticketCreated,
      targetMinutes,
      "response",
      priorityLevel,
    );
  }

  calculateResolutionDeadline(
    ticketCreated: DateTimeType,
    priorityLevel: string = "standard",
  ): SLACalculationResult {
    const priorityConfig = this.slaPolicy.priorityLevels[priorityLevel] ||
      this.slaPolicy.priorityLevels["standard"] || {
        multiplier: 1.0,
        maxBreachMinutes: 480,
      };

    const targetMinutes = Math.round(
      this.slaPolicy.resolutionTargetMinutes * priorityConfig.multiplier,
    );

    return this.calculateDeadline(
      ticketCreated,
      targetMinutes,
      "resolution",
      priorityLevel,
    );
  }

  private calculateDeadline(
    start: DateTimeType,
    targetMinutes: number,
    slaType: "response" | "resolution",
    priorityLevel: string,
  ): SLACalculationResult {
    if (!start.isValid) {
      throw new SLACalculationError("Invalid start DateTimeType", "INVALID_DT");
    }

    const deadline = this.businessHoursEngine.getBusinessDuration(
      start,
      targetMinutes,
    );
    const now = (this.opts.clock || (() => DateTimeType.now()))();

    // Collect holidays encountered
    const holidaysEncountered: Holiday[] = [];
    const interval = Interval.fromDateTimeTypes(start, deadline);
    const daysInRange = Math.ceil(interval.length("days"));

    for (let i = 0; i <= daysInRange; i++) {
      const date = start.plus({ days: i }).startOf("day");
      const holiday = this.holidayService.getHoliday(date);
      if (holiday) holidaysEncountered.push(holiday);
    }

    const elapsedBusinessMinutes =
      this.businessHoursEngine.getBusinessMinutesBetween(start, now);
    const elapsedCalendarMinutes = now.diff(start, "minutes").minutes;
    const businessDaysSkipped = this.countBusinessDaysSkipped(start, deadline);

    const result: SLACalculationResult = {
      targetDateTimeType: deadline,
      elapsedBusinessMinutes,
      elapsedCalendarMinutes,
      businessDaysSkipped,
      holidaysEncountered,
      breached: now > deadline,
      remainingMinutes: Math.max(0, targetMinutes - elapsedBusinessMinutes),
      meta: {
        calculationId: `sla-${DateTimeType.now().toMillis()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: DateTimeType.now(),
        timezone: this.slaPolicy.businessHoursConfig.timezone,
      },
    };

    this.opts.observabilityHook?.("sla_calculation", {
      slaType,
      priorityLevel,
      start,
      deadline,
      breached: result.breached,
      calculationId: result.meta.calculationId,
    });

    this.opts.logger?.("debug", `SLA ${slaType} deadline calculated`, {
      start: start.toISO(),
      deadline: deadline.toISO(),
      targetMinutes,
      priority: priorityLevel,
    });

    return result;
  }

  private countBusinessDaysSkipped(start: DateTimeType, end: DateTimeType): number {
    if (end <= start) return 0;

    let count = 0;
    let current = start.startOf("day");

    while (current < end) {
      if (
        this.holidayService.isHoliday(current) ||
        this.businessHoursEngine["isOutsideWorkWeek"](current)
      ) {
        count++;
      }
      current = current.plus({ days: 1 });
    }

    return count;
  }

  isWithinSLA(
    ticketCreated: DateTimeType,
    currentTime: DateTimeType = DateTimeType.now(),
    priorityLevel: string = "standard",
  ): { responseWithinSLA: boolean; resolutionWithinSLA: boolean } {
    const response = this.calculateResponseDeadline(
      ticketCreated,
      priorityLevel,
    );
    const resolution = this.calculateResolutionDeadline(
      ticketCreated,
      priorityLevel,
    );

    return {
      responseWithinSLA: currentTime <= response.targetDateTimeType,
      resolutionWithinSLA: currentTime <= resolution.targetDateTimeType,
    };
  }

  getBusinessHoursConfig(): BusinessHoursConfig {
    return { ...this.slaPolicy.businessHoursConfig };
  }

  getActiveHolidays(): Holiday[] {
    const now = DateTimeType.now();
    return Array.from(this.holidayService["holidaysByDate"].values()).filter(
      (h) => {
        const date = DateTimeType.fromISO(h.observedDate || h.date);
        return (
          date >= now.minus({ days: 30 }) && date <= now.plus({ days: 365 })
        );
      },
    );
  }
}

// ==================== FACTORY & UTILITIES ====================
export class SLACalculatorFactory {
  static createDefaultEnterpriseSLA(
    timezone: string = "America/New_York",
  ): SLACalculatorService {
    const policy: SLAPolicy = {
      id: "enterprise-default",
      name: "Enterprise Support SLA",
      responseTargetMinutes: 60, // 1 hour response
      resolutionTargetMinutes: 480, // 8 business hours resolution
      businessHoursConfig: {
        timezone,
        workWeek: { startDay: 1, endDay: 5 }, // Mon-Fri
        dailyHours: { start: "09:00", end: "17:00" },
        lunchBreak: { start: "12:00", end: "13:00" },
      },
      holidayCalendar: [
        { date: "2026-01-01", name: "New Year's Day" },
        { date: "2026-12-25", name: "Christmas Day" },
        { date: "2026-07-04", name: "Independence Day" },
      ],
      priorityLevels: {
        critical: { multiplier: 0.25, maxBreachMinutes: 15 }, // 15 min response
        high: { multiplier: 0.5, maxBreachMinutes: 30 }, // 30 min response
        standard: { multiplier: 1.0, maxBreachMinutes: 60 }, // 60 min response
        low: { multiplier: 2.0, maxBreachMinutes: 120 }, // 120 min response
      },
    };

    return new SLACalculatorService(policy);
  }

  static create24x7SLA(timezone: string = "UTC"): SLACalculatorService {
    const policy: SLAPolicy = {
      id: "24x7-premium",
      name: "24x7 Premium Support",
      responseTargetMinutes: 15,
      resolutionTargetMinutes: 120,
      businessHoursConfig: {
        timezone,
        workWeek: { startDay: 1, endDay: 7 }, // 24x7
        dailyHours: { start: "00:00", end: "24:00" },
      },
      holidayCalendar: [],
      priorityLevels: {
        critical: { multiplier: 0.33, maxBreachMinutes: 5 },
        high: { multiplier: 0.66, maxBreachMinutes: 10 },
        standard: { multiplier: 1.0, maxBreachMinutes: 15 },
      },
    };

    return new SLACalculatorService(policy);
  }
}

// ==================== VALIDATION HELPERS ====================
export function validateBusinessHoursConfig(
  config: unknown,
): asserts config is BusinessHoursConfig {
  if (typeof config !== "object" || config === null) {
    throw new SLACalculationError("Config must be an object", "VALIDATION_ERR");
  }

  const c = config as BusinessHoursConfig;

  if (typeof c.timezone !== "string") {
    throw new SLACalculationError("timezone must be string", "VALIDATION_ERR");
  }

  if (
    typeof c.workWeek?.startDay !== "number" ||
    typeof c.workWeek?.endDay !== "number"
  ) {
    throw new SLACalculationError(
      "workWeek requires startDay/endDay numbers",
      "VALIDATION_ERR",
    );
  }

  if (
    typeof c.dailyHours?.start !== "string" ||
    typeof c.dailyHours?.end !== "string"
  ) {
    throw new SLACalculationError(
      "dailyHours requires start/end strings",
      "VALIDATION_ERR",
    );
  }
}

export function validateHoliday(holiday: unknown): asserts holiday is Holiday {
  if (typeof holiday !== "object" || holiday === null) {
    throw new HolidayCalendarError("Holiday must be an object");
  }

  const h = holiday as Holiday;

  if (typeof h.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(h.date)) {
    throw new HolidayCalendarError("Invalid date format (YYYY-MM-DD required)");
  }

  if (typeof h.name !== "string") {
    throw new HolidayCalendarError("Holiday name required");
  }

  if (h.observedDate && !/^\d{4}-\d{2}-\d{2}$/.test(h.observedDate)) {
    throw new HolidayCalendarError("Invalid observedDate format");
  }
}

// ==================== TYPE GUARDS ====================
export function isSLACalculationResult(
  obj: unknown,
): obj is SLACalculationResult {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "targetDateTimeType" in obj &&
    "elapsedBusinessMinutes" in obj &&
    "breached" in obj
  );
}

// ==================== EXAMPLE USAGE ====================
/*
const slaService = SLACalculatorFactory.createDefaultEnterpriseSLA('America/New_York');

const ticketCreated = DateTimeType.fromISO('2026-02-06T10:30:00', { zone: 'America/New_York' });
const responseSLA = slaService.calculateResponseDeadline(ticketCreated, 'high');
const resolutionSLA = slaService.calculateResolutionDeadline(ticketCreated, 'high');

console.log('Response Deadline:', responseSLA.targetDateTimeType.toISO());
console.log('Resolution Deadline:', resolutionSLA.targetDateTimeType.toISO());
console.log('Breached?', responseSLA.breached ? 'YES' : 'NO');
console.log('Holidays in period:', responseSLA.holidaysEncountered.map(h => h.name));
*/

// ==================== EXPORTS ====================
// All types are already exported inline above

// Alias for backward compatibility
export const SLACalculator = SLACalculatorService;
