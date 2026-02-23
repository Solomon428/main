import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_ORG_ID = "default-org-id";
const DEFAULT_USER_ID = "default-user-id";

function isValidCron(expression: string): boolean {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return false;

  const patterns = [
    /^(\*|([0-9]|[1-5][0-9])(-([0-9]|[1-5][0-9]))?(,([0-9]|[1-5][0-9])(-([0-9]|[1-5][0-9]))?)*)$/,
    /^(\*|([0-9]|1[0-9]|2[0-3])(-([0-9]|1[0-9]|2[0-3]))?(,([0-9]|1[0-9]|2[0-3])(-([0-9]|1[0-9]|2[0-3]))?)*)$/,
    /^(\*|([1-9]|[12][0-9]|3[01])(-([1-9]|[12][0-9]|3[01]))?(,([1-9]|[12][0-9]|3[01])(-([1-9]|[12][0-9]|3[01]))?)*)$/,
    /^(\*|([1-9]|1[0-2])(-([1-9]|1[0-2]))?(,([1-9]|1[0-2])(-([1-9]|1[0-2]))?)?|(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)(-(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec))?(,(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)(-(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec))?)*)$/i,
    /^(\*|[0-6](-[0-6])?(,[0-6](-[0-6])?)?|(sun|mon|tue|wed|thu|fri|sat)(-(sun|mon|tue|wed|thu|fri|sat))?(,(sun|mon|tue|wed|thu|fri|sat)(-(sun|mon|tue|wed|thu|fri|sat))?)*)$/i,
  ];

  return parts.every((part, index) => {
    const pattern = patterns[index];
    return pattern ? pattern.test(part) : false;
  });
}

function calculateNextRun(cronExpression: string): Date {
  const now = new Date();
  const nextRun = new Date(now);
  nextRun.setMinutes(nextRun.getMinutes() + 60);
  return nextRun;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const taskType = searchParams.get("taskType");
    const isActive = searchParams.get("isActive");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (taskType) {
      where.taskType = taskType;
    }
    if (isActive !== null) {
      where.isActive = isActive === "true";
    }

    const [tasks, total] = await Promise.all([
      prisma.scheduledTask.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isActive: "desc" }, { nextRunAt: "asc" }],
      }),
      prisma.scheduledTask.count({ where }),
    ]);

    const now = new Date();
    const enrichedTasks = tasks.map((task) => {
      const isOverdue =
        task.isActive &&
        task.nextRunAt &&
        new Date(task.nextRunAt) < now &&
        !task.isRunning;

      const successRate =
        task.runCount > 0
          ? ((task.runCount - task.failureCount) / task.runCount) * 100
          : 0;

      let priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
      if (task.taskType === "APPROVAL_ESCALATION" || task.taskType === "PAYMENT_PROCESSING") {
        priority = "CRITICAL";
      } else if (task.taskType === "RECONCILIATION" || task.taskType === "COMPLIANCE_CHECK") {
        priority = "HIGH";
      } else if (task.taskType === "REPORT_GENERATION" || task.taskType === "NOTIFICATION_DIGEST") {
        priority = "MEDIUM";
      } else {
        priority = "LOW";
      }

      return {
        ...task,
        isOverdue,
        successRate: Math.round(successRate * 100) / 100,
        priority,
      };
    });

    return NextResponse.json({
      success: true,
      data: enrichedTasks,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching system tasks:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch system tasks" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      description,
      taskType,
      schedule,
      timezone,
      parameters,
      timeout,
      retryAttempts,
      retryDelay,
      isActive,
    } = body;

    if (!name || !taskType || !schedule) {
      return NextResponse.json(
        { success: false, error: "Name, task type, and schedule are required" },
        { status: 400 }
      );
    }

    if (!isValidCron(schedule)) {
      return NextResponse.json(
        { success: false, error: "Invalid cron expression" },
        { status: 400 }
      );
    }

    const nextRunAt = calculateNextRun(schedule);

    const task = await prisma.scheduledTask.create({
      data: {
        organizationId: DEFAULT_ORG_ID,
        name,
        description,
        taskType,
        schedule,
        timezone: timezone || "Africa/Johannesburg",
        isActive: isActive ?? true,
        parameters: parameters || {},
        timeout: timeout || 3600,
        retryAttempts: retryAttempts || 3,
        retryDelay: retryDelay || 300,
        nextRunAt,
        createdBy: DEFAULT_USER_ID,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: task,
        message: "Task created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating system task:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create system task" },
      { status: 500 }
    );
  }
}
