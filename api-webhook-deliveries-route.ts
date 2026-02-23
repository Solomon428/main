// src/app/api/integrations/webhooks/deliveries/route.ts
// Webhook Delivery Management - Event Tracking & Retry

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

const RetryDeliverySchema = z.object({
  deliveryIds: z.array(z.string().cuid()),
});

// GET /api/integrations/webhooks/deliveries
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: 'AUTH_001', message: 'Authentication required' } }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    const webhookId = searchParams.get('webhookId');
    const status = searchParams.get('status'); // SUCCESS, FAILED, PENDING, RETRYING
    const eventType = searchParams.get('eventType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);

    let where: any = { deletedAt: null };

    if (webhookId) {
      where.webhookId = webhookId;
    }

    if (status) {
      where.status = status;
    }

    if (eventType) {
      where.eventType = eventType;
    }

    if (startDate || endDate) {
      where.sentAt = {};
      if (startDate) {
        where.sentAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.sentAt.lte = new Date(endDate);
      }
    }

    // Fetch deliveries with pagination
    const [deliveries, total] = await Promise.all([
      prisma.webhookDelivery.findMany({
        where,
        select: {
          id: true,
          webhookId: true,
          eventType: true,
          status: true,
          statusCode: true,
          response: true,
          errorMessage: true,
          attempts: true,
          nextRetryAt: true,
          deliveredAt: true,
          webhook: {
            select: {
              id: true,
              name: true,
              url: true,
              isActive: true,
            },
          },
          createdAt: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.webhookDelivery.count({ where }),
    ]);

    // Calculate statistics
    const stats = {
      total,
      success: await prisma.webhookDelivery.count({ where: { ...where, status: 'SUCCESS' } }),
      failed: await prisma.webhookDelivery.count({ where: { ...where, status: 'FAILED' } }),
      pending: await prisma.webhookDelivery.count({ where: { ...where, status: 'PENDING' } }),
      retrying: await prisma.webhookDelivery.count({ where: { ...where, status: 'RETRYING' } }),
      avgResponseTime: 0, // Would calculate from response times if stored
    };

    // Group by event type
    const byEventType = await prisma.webhookDelivery.groupBy({
      by: ['eventType'],
      where,
      _count: { id: true },
    });

    // Group by status
    const byStatus = await prisma.webhookDelivery.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
    });

    // Calculate success rate
    const successRate = stats.total > 0
      ? (stats.success / stats.total) * 100
      : 100;

    return NextResponse.json({
      success: true,
      data: {
        deliveries,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        stats: {
          ...stats,
          successRate: Math.round(successRate * 10) / 10,
          byEventType: byEventType.map(item => ({
            eventType: item.eventType,
            count: item._count.id,
          })),
          byStatus: byStatus.map(item => ({
            status: item.status,
            count: item._count.id,
          })),
        },
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[GET /api/integrations/webhooks/deliveries] Error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' },
    }, { status: 500 });
  }
}

// POST /api/integrations/webhooks/deliveries/retry
// Retry failed webhook deliveries
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: 'AUTH_001', message: 'Authentication required' } }, { status: 401 });
    }

    const body = await request.json();
    const { deliveryIds } = RetryDeliverySchema.parse(body);

    // Fetch deliveries to retry
    const deliveries = await prisma.webhookDelivery.findMany({
      where: {
        id: { in: deliveryIds },
        status: { in: ['FAILED', 'PENDING'] },
      },
      include: {
        webhook: {
          select: {
            id: true,
            url: true,
            secret: true,
            isActive: true,
          },
        },
      },
    });

    if (deliveries.length === 0) {
      return NextResponse.json({
        success: false,
        error: { code: 'WH_001', message: 'No eligible deliveries found for retry' },
      }, { status: 404 });
    }

    // Update deliveries to RETRYING status
    await prisma.webhookDelivery.updateMany({
      where: {
        id: { in: deliveries.map(d => d.id) },
      },
      data: {
        status: 'RETRYING',
        nextRetryAt: new Date(Date.now() + 5 * 60 * 1000), // Retry in 5 minutes
      },
    });

    // TODO: Actually trigger webhook deliveries here
    // This would involve:
    // 1. Queue the delivery jobs
    // 2. Execute HTTP requests with proper signing
    // 3. Update delivery status based on response
    // For now, we just update the status

    return NextResponse.json({
      success: true,
      data: {
        message: `Scheduled ${deliveries.length} deliveries for retry`,
        deliveryIds: deliveries.map(d => d.id),
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: { code: 'VAL_001', message: 'Validation error', details: error.errors },
      }, { status: 400 });
    }
    console.error('[POST /api/integrations/webhooks/deliveries/retry] Error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' },
    }, { status: 500 });
  }
}

// GET /api/integrations/webhooks/deliveries/[id]
// Get detailed delivery information
export async function GETSingle(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const deliveryId = pathParts[pathParts.length - 1];

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: 'AUTH_001', message: 'Authentication required' } }, { status: 401 });
    }

    const delivery = await prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: {
        webhook: {
          select: {
            id: true,
            name: true,
            url: true,
            events: true,
            isActive: true,
            retryPolicy: true,
          },
        },
      },
    });

    if (!delivery) {
      return NextResponse.json({
        success: false,
        error: { code: 'WH_002', message: 'Delivery not found' },
      }, { status: 404 });
    }

    // Calculate delivery duration if completed
    const duration = delivery.deliveredAt
      ? delivery.deliveredAt.getTime() - delivery.createdAt.getTime()
      : null;

    // Get retry history
    const retryHistory = await prisma.auditLog.findMany({
      where: {
        entityType: 'INTEGRATION',
        entityId: deliveryId,
        action: 'UPDATE',
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      data: {
        delivery: {
          ...delivery,
          duration,
        },
        retryHistory,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[GET /api/integrations/webhooks/deliveries/[id]] Error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' },
    }, { status: 500 });
  }
}

// DELETE /api/integrations/webhooks/deliveries/[id]
// Cancel pending delivery
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const deliveryId = pathParts[pathParts.length - 1];

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: 'AUTH_001', message: 'Authentication required' } }, { status: 401 });
    }

    const delivery = await prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
    });

    if (!delivery) {
      return NextResponse.json({
        success: false,
        error: { code: 'WH_002', message: 'Delivery not found' },
      }, { status: 404 });
    }

    if (!['PENDING', 'RETRYING'].includes(delivery.status)) {
      return NextResponse.json({
        success: false,
        error: { code: 'WH_003', message: 'Can only cancel pending or retrying deliveries' },
      }, { status: 400 });
    }

    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: 'FAILED',
        errorMessage: 'Cancelled by user',
      },
    });

    return NextResponse.json({
      success: true,
      data: { message: 'Delivery cancelled', deliveryId },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[DELETE /api/integrations/webhooks/deliveries/[id]] Error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'SYS_001', message: 'Internal server error' },
    }, { status: 500 });
  }
}
