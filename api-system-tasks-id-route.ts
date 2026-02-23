// src/app/api/system/tasks/[id]/route.ts
// Individual Scheduled Task Operations

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { logAuditEvent } from '@/observability/audit';

interface RouteContext {
  params: { id: string };
}

const UpdateTaskSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
  schedule: z.string().optional(),
  isActive: z.boolean().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  parameters: z.record(z.any()).optional(),
  notifyOnFailure: z.boolean().optional(),
  notifyOnSuccess: z.boolean().optional(),
  notificationEmails: z.array(z.string().email()).optional(),
});

// GET /api/system/tasks/[id]
export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: 'AUTH_001', message: 'Authentication required' } }, { status: 401 });
    }

    const { id } = context.params;

    const task = await prisma.scheduledTask.findUnique({
      where: { id },
    });

    if (!task) {
      return NextResponse.json({
        success: false,
        error: { code: 'TASK_001', message: 'Task not found' },
      }, { status: 404 });
    }

    // Fetch execution history (last 20 runs)
    const executionHistory = await prisma.auditLog.findMany({
      where: {
        entityType: 'SYSTEM',
        entityId: id,
        action: { in: ['CREATE', 'UPDATE', 'DELETE'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        action: true,
        createdAt: true,
        metadata: true,
        user: { select: { name: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        task,
        executionHistory,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[GET /api/system/tasks/[id]] Error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' },
    }, { status: 500 });
  }
}

// PUT /api/system/tasks/[id]
export async function PUT(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: 'AUTH_001', message: 'Authentication required' } }, { status: 401 });
    }

    const { id } = context.params;
    const body = await request.json();
    const data = UpdateTaskSchema.parse(body);

    const existing = await prisma.scheduledTask.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({
        success: false,
        error: { code: 'TASK_001', message: 'Task not found' },
      }, { status: 404 });
    }

    const updated = await prisma.scheduledTask.update({
      where: { id },
      data: {
        ...data,
      },
    });

    // Log audit event
    await logAuditEvent({
      userId: session.user.id,
      action: 'UPDATE',
      entityType: 'SYSTEM',
      entityId: id,
      organizationId: existing.organizationId ?? undefined,
      oldValue: existing,
      newValue: updated,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      data: { task: updated },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: { code: 'VAL_001', message: 'Validation error', details: error.errors },
      }, { status: 400 });
    }
    console.error('[PUT /api/system/tasks/[id]] Error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' },
    }, { status: 500 });
  }
}

// DELETE /api/system/tasks/[id]
export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: 'AUTH_001', message: 'Authentication required' } }, { status: 401 });
    }

    const { id } = context.params;

    const existing = await prisma.scheduledTask.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({
        success: false,
        error: { code: 'TASK_001', message: 'Task not found' },
      }, { status: 404 });
    }

    // Hard delete
    await prisma.scheduledTask.delete({
      where: { id },
    });

    // Log audit event
    await logAuditEvent({
      userId: session.user.id,
      action: 'DELETE',
      entityType: 'SYSTEM',
      entityId: id,
      organizationId: existing.organizationId ?? undefined,
      oldValue: existing,
      newValue: undefined,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      data: { message: 'Task deleted successfully', taskId: id },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[DELETE /api/system/tasks/[id]] Error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' },
    }, { status: 500 });
  }
}

// POST /api/system/tasks/[id]/trigger
// Manual task execution
export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: 'AUTH_001', message: 'Authentication required' } }, { status: 401 });
    }

    const { id } = context.params;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action'); // 'trigger', 'pause', 'resume'

    const task = await prisma.scheduledTask.findUnique({
      where: { id },
    });

    if (!task) {
      return NextResponse.json({
        success: false,
        error: { code: 'TASK_001', message: 'Task not found' },
      }, { status: 404 });
    }

    if (action === 'trigger') {
      // Update task status to RUNNING
      await prisma.scheduledTask.update({
        where: { id },
        data: {
          isRunning: true,
          lastRunAt: new Date(),
          runCount: { increment: 1 },
        },
      });

      // Log execution start
      await logAuditEvent({
        userId: session.user.id,
        action: 'CREATE',
        entityType: 'SYSTEM',
        entityId: id,
        organizationId: task.organizationId ?? undefined,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      });

      // TODO: Actually trigger the task handler here
      // This would involve importing and calling the appropriate task handler
      // For now, we just update the status

      return NextResponse.json({
        success: true,
        data: {
          message: 'Task triggered successfully',
          taskId: id,
          status: 'RUNNING',
        },
        timestamp: new Date().toISOString(),
      });

    } else if (action === 'pause') {
      await prisma.scheduledTask.update({
        where: { id },
        data: { isActive: false },
      });

      return NextResponse.json({
        success: true,
        data: { message: 'Task paused', taskId: id },
        timestamp: new Date().toISOString(),
      });

    } else if (action === 'resume') {
      await prisma.scheduledTask.update({
        where: { id },
        data: { isActive: true, isRunning: false },
      });

      return NextResponse.json({
        success: true,
        data: { message: 'Task resumed', taskId: id },
        timestamp: new Date().toISOString(),
      });

    } else {
      return NextResponse.json({
        success: false,
        error: { code: 'VAL_001', message: 'Invalid action. Use: trigger, pause, or resume' },
      }, { status: 400 });
    }

  } catch (error) {
    console.error('[POST /api/system/tasks/[id]/trigger] Error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' },
    }, { status: 500 });
  }
}
