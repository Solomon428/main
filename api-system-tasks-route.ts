// src/app/api/system/tasks/route.ts
// Scheduled Tasks Management - Cron Job Control & Monitoring

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { logAuditEvent } from '@/observability/audit';

const CreateTaskSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum([
    'INVOICE_PROCESSING',
    'APPROVAL_ESCALATION',
    'APPROVAL_REMINDER',
    'PAYMENT_PROCESSING',
    'PAYMENT_RECONCILIATION',
    'RECONCILIATION',
    'RISK_ASSESSMENT',
    'COMPLIANCE_CHECK',
    'REPORT_GENERATION',
    'DATA_CLEANUP',
    'BACKUP',
    'NOTIFICATION_DIGEST',
    'AUDIT_LOG_ARCHIVE',
    'SUPPLIER_RATING_UPDATE',
  ]),
  description: z.string().max(500).optional(),
  schedule: z.string().regex(/^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/, 'Invalid cron expression'),
  timezone: z.string().default('Africa/Johannesburg'),
  isActive: z.boolean().default(true),
  retryOnFailure: z.boolean().default(true),
  maxRetries: z.number().int().min(0).max(10).default(3),
  timeout: z.number().int().min(60).max(3600).default(300), // seconds
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  parameters: z.record(z.any()).optional(),
  notifyOnFailure: z.boolean().default(true),
  notifyOnSuccess: z.boolean().default(false),
  notificationEmails: z.array(z.string().email()).optional(),
});

const UpdateTaskSchema = CreateTaskSchema.partial();

// GET /api/system/tasks
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: 'AUTH_001', message: 'Authentication required' } }, { status: 401 });
    }

    // Only admins and system admins can view tasks
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!['SYSTEM_ADMIN', 'SUPER_ADMIN'].includes(user?.role || '')) {
      return NextResponse.json({
        success: false,
        error: { code: 'AUTH_002', message: 'Insufficient permissions' },
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const isActive = searchParams.get('isActive');

    let where: any = { deletedAt: null };

    if (status) {
      where.status = status;
    }
    if (type) {
      where.type = type;
    }
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    const tasks = await prisma.scheduledTask.findMany({
      where,
      orderBy: [
        { isActive: 'desc' },
        { nextRunAt: 'asc' },
      ],
    });

    // Calculate statistics
    const now = new Date();
    const stats = {
      total: tasks.length,
      active: tasks.filter(t => t.isActive).length,
      inactive: tasks.filter(t => !t.isActive).length,
      running: tasks.filter(t => t.isRunning).length,
      idle: tasks.filter(t => !t.isRunning && t.isActive).length,
      failed: tasks.filter(t => t.failureCount > 0).length,
      overdue: tasks.filter(t => t.isActive && t.nextRunAt && t.nextRunAt < now && !t.isRunning).length,
    };

    return NextResponse.json({
      success: true,
      data: { tasks, stats },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[GET /api/system/tasks] Error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' },
    }, { status: 500 });
  }
}

// POST /api/system/tasks
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: 'AUTH_001', message: 'Authentication required' } }, { status: 401 });
    }

    // Permission check
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, primaryOrganizationId: true },
    });

    if (!user || !['SYSTEM_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json({
        success: false,
        error: { code: 'AUTH_002', message: 'Insufficient permissions' },
      }, { status: 403 });
    }

    const body = await request.json();
    const data = CreateTaskSchema.parse(body);

    // Calculate next run time based on cron schedule
    const nextRunAt = calculateNextRunTime(data.schedule, data.timezone);

    const task = await prisma.scheduledTask.create({
      data: {
        name: data.name,
        description: data.description,
        taskType: data.type,
        schedule: data.schedule,
        timezone: data.timezone,
        organizationId: user.primaryOrganizationId ?? undefined,
        nextRunAt,
        createdBy: session.user.id,
        isActive: data.isActive ?? true,
        parameters: data.parameters,
        timeout: data.timeout ?? 3600,
      },
    });

    // Log audit event
    await logAuditEvent({
      userId: session.user.id,
      action: 'CREATE',
      entityType: 'SYSTEM',
      entityId: task.id,
      organizationId: user.primaryOrganizationId ?? undefined,
      newValue: task,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      data: { task },
      timestamp: new Date().toISOString(),
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: { code: 'VAL_001', message: 'Validation error', details: error.errors },
      }, { status: 400 });
    }
    console.error('[POST /api/system/tasks] Error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' },
    }, { status: 500 });
  }
}

// Helper: Calculate next run time from cron expression
function calculateNextRunTime(cronExpression: string, timezone: string): Date {
  // This is a simplified implementation
  // In production, use a library like 'cron-parser' or 'node-cron'
  
  const now = new Date();
  const [minute, hour, dayOfMonth, month, dayOfWeek] = cronExpression.split(' ');

  // Simple logic for common patterns
  if (cronExpression === '0 * * * *') { // Every hour
    const next = new Date(now);
    next.setHours(next.getHours() + 1);
    next.setMinutes(0);
    next.setSeconds(0);
    return next;
  }

  if (cronExpression === '0 0 * * *') { // Every day at midnight
    const next = new Date(now);
    next.setDate(next.getDate() + 1);
    next.setHours(0);
    next.setMinutes(0);
    next.setSeconds(0);
    return next;
  }

  if (cronExpression === '*/15 * * * *') { // Every 15 minutes
    const next = new Date(now);
    const minutes = next.getMinutes();
    const nextQuarter = Math.ceil(minutes / 15) * 15;
    next.setMinutes(nextQuarter);
    next.setSeconds(0);
    return next;
  }

  // Default: 1 hour from now
  const next = new Date(now.getTime() + 60 * 60 * 1000);
  return next;
}
