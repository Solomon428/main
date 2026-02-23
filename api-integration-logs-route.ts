// src/app/api/integrations/[id]/logs/route.ts
// Integration Sync Logs - Monitoring & Troubleshooting

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

interface RouteContext {
  params: { id: string };
}

// GET /api/integrations/[id]/logs
export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: 'AUTH_001', message: 'Authentication required' } }, { status: 401 });
    }

    const { id: integrationId } = context.params;
    const { searchParams } = new URL(request.url);
    
    const status = searchParams.get('status'); // SUCCESS, FAILED, PARTIAL, PENDING
    const syncType = searchParams.get('syncType'); // FULL, INCREMENTAL, MANUAL
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);

    // Verify integration exists
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        provider: true,
      },
    });

    if (!integration) {
      return NextResponse.json({
        success: false,
        error: { code: 'INT_001', message: 'Integration not found' },
      }, { status: 404 });
    }

    // Build where clause
    let where: any = { integrationId, deletedAt: null };

    if (status) {
      where.status = status;
    }

    if (syncType) {
      where.syncType = syncType;
    }

    if (startDate || endDate) {
      where.syncStartedAt = {};
      if (startDate) {
        where.syncStartedAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.syncStartedAt.lte = new Date(endDate);
      }
    }

    // Fetch logs with pagination
    const [logs, total] = await Promise.all([
      prisma.integrationSyncLog.findMany({
        where,
        select: {
          id: true,
          syncType: true,
          status: true,
          startedAt: true,
          completedAt: true,
          recordsProcessed: true,
          recordsSucceeded: true,
          recordsFailed: true,
          metadata: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { startedAt: 'desc' },
      }),
      prisma.integrationSyncLog.count({ where }),
    ]);

    // Calculate statistics
    const stats = {
      total,
      success: await prisma.integrationSyncLog.count({ where: { ...where, status: 'SUCCESS' } }),
      failed: await prisma.integrationSyncLog.count({ where: { ...where, status: 'FAILED' } }),
      partial: await prisma.integrationSyncLog.count({ where: { ...where, status: 'PARTIAL' } }),
      pending: await prisma.integrationSyncLog.count({ where: { ...where, status: 'PENDING' } }),
      totalRecordsProcessed: logs.reduce((sum, log) => sum + (log.recordsProcessed || 0), 0),
      totalRecordsSucceeded: logs.reduce((sum, log) => sum + (log.recordsSucceeded || 0), 0),
      totalRecordsFailed: logs.reduce((sum, log) => sum + (log.recordsFailed || 0), 0),
    };

    // Calculate average sync duration
    const completedLogs = logs.filter(log => log.completedAt);
    const avgDuration = completedLogs.length > 0
      ? completedLogs.reduce((sum, log) => {
          const duration = log.completedAt!.getTime() - log.startedAt.getTime();
          return sum + duration;
        }, 0) / completedLogs.length
      : 0;

    // Enrich logs with calculated fields
    const enrichedLogs = logs.map(log => ({
      ...log,
      duration: log.completedAt
        ? log.completedAt.getTime() - log.startedAt.getTime()
        : null,
      successRate: log.recordsProcessed && log.recordsProcessed > 0
        ? ((log.recordsSucceeded || 0) / log.recordsProcessed) * 100
        : 0,
    }));

    return NextResponse.json({
      success: true,
      data: {
        integration: {
          id: integration.id,
          name: integration.name,
          type: integration.type,
          status: integration.status,
          provider: integration.provider,
        },
        logs: enrichedLogs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        stats,
        avgDurationMs: Math.round(avgDuration),
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[GET /api/integrations/[id]/logs] Error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' },
    }, { status: 500 });
  }
}

// POST /api/integrations/[id]/logs
// Create new sync log (typically called by integration worker)
export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: 'AUTH_001', message: 'Authentication required' } }, { status: 401 });
    }

    const { id: integrationId } = context.params;
    const body = await request.json();

    const log = await prisma.integrationSyncLog.create({
      data: {
        integrationId,
        syncType: body.syncType || 'MANUAL',
        status: body.status || 'PENDING',
        startedAt: body.startedAt ? new Date(body.startedAt) : new Date(),
        completedAt: body.completedAt ? new Date(body.completedAt) : null,
        recordsProcessed: body.recordsProcessed || 0,
        recordsSucceeded: body.recordsSucceeded || 0,
        recordsFailed: body.recordsFailed || 0,
        metadata: body.metadata || {},
        triggeredBy: session.user.id,
      } as any,
    });

    return NextResponse.json({
      success: true,
      data: { log },
      timestamp: new Date().toISOString(),
    }, { status: 201 });

  } catch (error) {
    console.error('[POST /api/integrations/[id]/logs] Error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' },
    }, { status: 500 });
  }
}

// GET /api/integrations/[id]/logs/[logId]
// Get detailed log with full error stack
export async function GETSingle(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const logId = pathParts[pathParts.length - 1];

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: 'AUTH_001', message: 'Authentication required' } }, { status: 401 });
    }

    const log = await prisma.integrationSyncLog.findUnique({
      where: { id: logId },
      include: {
        integration: {
          select: {
            id: true,
            name: true,
            type: true,
            provider: true,
          },
        },
      },
    });

    if (!log) {
      return NextResponse.json({
        success: false,
        error: { code: 'LOG_001', message: 'Sync log not found' },
      }, { status: 404 });
    }

    // Calculate duration if completed
    const duration = log.completedAt
      ? log.completedAt.getTime() - log.startedAt.getTime()
      : null;

    return NextResponse.json({
      success: true,
      data: {
        log: {
          ...log,
          duration,
          successRate: log.recordsProcessed && log.recordsProcessed > 0
            ? ((log.recordsSucceeded || 0) / log.recordsProcessed) * 100
            : 0,
        },
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[GET /api/integrations/[id]/logs/[logId]] Error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' },
    }, { status: 500 });
  }
}
