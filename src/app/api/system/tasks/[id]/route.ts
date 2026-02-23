import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_USER_ID = "default-user-id";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const task = await prisma.scheduledTask.findUnique({
      where: { id: params.id },
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );
    }

    const now = new Date();
    const isOverdue =
      task.isActive &&
      task.nextRunAt &&
      new Date(task.nextRunAt) < now &&
      !task.isRunning;

    const successRate =
      task.runCount > 0
        ? ((task.runCount - task.failureCount) / task.runCount) * 100
        : 0;

    return NextResponse.json({
      success: true,
      data: {
        ...task,
        isOverdue,
        successRate: Math.round(successRate * 100) / 100,
      },
    });
  } catch (error) {
    console.error("Error fetching task:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch task" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const {
      name,
      description,
      schedule,
      timezone,
      parameters,
      timeout,
      retryAttempts,
      retryDelay,
      isActive,
    } = body;

    const existingTask = await prisma.scheduledTask.findUnique({
      where: { id: params.id },
    });

    if (!existingTask) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (schedule !== undefined) {
      updateData.schedule = schedule;
      const nextRun = new Date();
      nextRun.setMinutes(nextRun.getMinutes() + 60);
      updateData.nextRunAt = nextRun;
    }
    if (timezone !== undefined) updateData.timezone = timezone;
    if (parameters !== undefined) updateData.parameters = parameters;
    if (timeout !== undefined) updateData.timeout = timeout;
    if (retryAttempts !== undefined) updateData.retryAttempts = retryAttempts;
    if (retryDelay !== undefined) updateData.retryDelay = retryDelay;
    if (isActive !== undefined) updateData.isActive = isActive;

    const task = await prisma.scheduledTask.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: task,
      message: "Task updated successfully",
    });
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update task" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const existingTask = await prisma.scheduledTask.findUnique({
      where: { id: params.id },
    });

    if (!existingTask) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );
    }

    await prisma.scheduledTask.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete task" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    const existingTask = await prisma.scheduledTask.findUnique({
      where: { id: params.id },
    });

    if (!existingTask) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );
    }

    if (action === "trigger") {
      if (existingTask.isRunning) {
        return NextResponse.json(
          { success: false, error: "Task is already running" },
          { status: 400 }
        );
      }

      const task = await prisma.scheduledTask.update({
        where: { id: params.id },
        data: {
          isRunning: true,
          lastRunAt: new Date(),
          lastRunStatus: "RUNNING",
        },
      });

      return NextResponse.json({
        success: true,
        data: task,
        message: "Task triggered successfully",
      });
    }

    if (action === "pause") {
      const task = await prisma.scheduledTask.update({
        where: { id: params.id },
        data: { isActive: false },
      });

      return NextResponse.json({
        success: true,
        data: task,
        message: "Task paused successfully",
      });
    }

    if (action === "resume") {
      const nextRun = new Date();
      nextRun.setMinutes(nextRun.getMinutes() + 5);

      const task = await prisma.scheduledTask.update({
        where: { id: params.id },
        data: {
          isActive: true,
          nextRunAt: nextRun,
        },
      });

      return NextResponse.json({
        success: true,
        data: task,
        message: "Task resumed successfully",
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action. Use: trigger, pause, or resume" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error controlling task:", error);
    return NextResponse.json(
      { success: false, error: "Failed to control task" },
      { status: 500 }
    );
  }
}
