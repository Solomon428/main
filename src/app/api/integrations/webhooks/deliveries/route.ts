import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_ORG_ID = "default-org-id";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const eventType = searchParams.get("eventType");
    const webhookId = searchParams.get("webhookId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const webhookWhere: Record<string, unknown> = {
      organizationId: DEFAULT_ORG_ID,
    };

    if (webhookId) {
      webhookWhere.id = webhookId;
    }

    const webhooks = await prisma.webhook.findMany({
      where: webhookWhere,
      select: { id: true },
    });

    if (webhooks.length === 0) {
      return NextResponse.json(
        { success: false, error: "No webhooks found" },
        { status: 404 }
      );
    }

    const webhookIds = webhooks.map((w) => w.id);

    const where: Record<string, unknown> = {
      webhookId: { in: webhookIds },
    };

    if (status) {
      where.status = status;
    }
    if (eventType) {
      where.eventType = eventType;
    }

    const [deliveries, total] = await Promise.all([
      prisma.webhookDelivery.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          webhook: {
            select: {
              id: true,
              name: true,
              url: true,
              isActive: true,
            },
          },
        },
      }),
      prisma.webhookDelivery.count({ where }),
    ]);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentDeliveries = await prisma.webhookDelivery.findMany({
      where: {
        webhookId: { in: webhookIds },
        createdAt: { gte: sevenDaysAgo },
      },
      select: {
        status: true,
        eventType: true,
        attempts: true,
      },
    });

    const stats = {
      totalDeliveries: recentDeliveries.length,
      successful: recentDeliveries.filter((d) => d.status === "SUCCESS").length,
      failed: recentDeliveries.filter((d) => d.status === "FAILED").length,
      pending: recentDeliveries.filter((d) => d.status === "PENDING").length,
      retrying: recentDeliveries.filter((d) => d.status === "RETRYING").length,
      successRate:
        recentDeliveries.length > 0
          ? (recentDeliveries.filter((d) => d.status === "SUCCESS").length /
              recentDeliveries.length) *
            100
          : 0,
      avgAttempts:
        recentDeliveries.reduce((sum, d) => sum + d.attempts, 0) /
          recentDeliveries.length || 0,
      eventTypes: [...new Set(recentDeliveries.map((d) => d.eventType))],
    };

    const enrichedDeliveries = deliveries.map((d) => ({
      ...d,
      canRetry: d.status === "FAILED" && d.attempts < d.maxAttempts,
      isPending: d.status === "PENDING",
    }));

    return NextResponse.json({
      success: true,
      data: {
        deliveries: enrichedDeliveries,
        stats,
      },
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching webhook deliveries:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch webhook deliveries" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, deliveryIds } = body;

    if (action === "retry" && deliveryIds && Array.isArray(deliveryIds)) {
      const results = [];

      for (const deliveryId of deliveryIds) {
        const delivery = await prisma.webhookDelivery.findFirst({
          where: { id: deliveryId },
          include: {
            webhook: {
              select: {
                organizationId: true,
                isActive: true,
              },
            },
          },
        });

        if (!delivery) continue;

        if (
          delivery.webhook.organizationId !== DEFAULT_ORG_ID ||
          !delivery.webhook.isActive
        ) {
          continue;
        }

        if (delivery.attempts >= delivery.maxAttempts) {
          continue;
        }

        const updatedDelivery = await prisma.webhookDelivery.update({
          where: { id: deliveryId },
          data: {
            status: "RETRYING",
            attempts: { increment: 1 },
            nextRetryAt: new Date(Date.now() + Math.pow(2, delivery.attempts) * 60000),
          },
        });

        results.push(updatedDelivery);
      }

      return NextResponse.json({
        success: true,
        data: {
          retriedCount: results.length,
          deliveries: results,
        },
        message: `${results.length} deliveries queued for retry`,
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action. Use: retry" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error processing webhook deliveries:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process webhook deliveries" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Delivery ID is required" },
        { status: 400 }
      );
    }

    const delivery = await prisma.webhookDelivery.findFirst({
      where: { id },
      include: {
        webhook: {
          select: { organizationId: true },
        },
      },
    });

    if (!delivery) {
      return NextResponse.json(
        { success: false, error: "Delivery not found" },
        { status: 404 }
      );
    }

    if (delivery.webhook.organizationId !== DEFAULT_ORG_ID) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    if (delivery.status === "PENDING") {
      await prisma.webhookDelivery.update({
        where: { id },
        data: { status: "CANCELLED" },
      });

      return NextResponse.json({
        success: true,
        message: "Pending delivery cancelled",
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Only pending deliveries can be cancelled",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error cancelling webhook delivery:", error);
    return NextResponse.json(
      { success: false, error: "Failed to cancel webhook delivery" },
      { status: 500 }
    );
  }
}
