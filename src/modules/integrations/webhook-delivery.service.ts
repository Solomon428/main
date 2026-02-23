// ============================================================================
// Webhook Delivery Service
// ============================================================================

import { prisma } from "../../db/prisma";
import { WebhookStatus } from "../../domain/enums/WebhookStatus";

export interface WebhookPayload {
  event: string;
  timestamp: Date;
  data: Record<string, unknown>;
  signature?: string;
}

export interface DeliveryAttempt {
  webhookId: string;
  payload: WebhookPayload;
  attemptNumber: number;
}

/**
 * List webhook deliveries for a webhook
 */
export async function listDeliveries(
  webhookId: string,
  options?: {
    status?: WebhookStatus;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  },
) {
  const where: any = { webhookId };

  if (options?.status) where.status = options.status;
  if (options?.startDate || options?.endDate) {
    where.createdAt = {};
    if (options.startDate) where.createdAt.gte = options.startDate;
    if (options.endDate) where.createdAt.lte = options.endDate;
  }

  const page = options?.page || 1;
  const limit = options?.limit || 20;
  const skip = (page - 1) * limit;

  const [deliveries, total] = await Promise.all([
    prisma.webhookDelivery.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.webhookDelivery.count({ where }),
  ]);

  return {
    deliveries,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get a delivery by ID
 */
export async function getDelivery(id: string) {
  return prisma.webhookDelivery.findUnique({
    where: { id },
    include: {
      webhook: {
        select: {
          id: true,
          url: true,
          eventTypes: true,
        },
      },
    },
  });
}

/**
 * Create a delivery record
 */
export async function createDelivery(
  webhookId: string,
  event: string,
  payload: Record<string, unknown>,
) {
  return prisma.webhookDelivery.create({
    data: {
      webhookId,
      event,
      payload,
      status: WebhookStatus.PENDING,
      attemptCount: 0,
    },
  });
}

/**
 * Record a delivery attempt
 */
export async function recordAttempt(
  deliveryId: string,
  attemptData: {
    status: WebhookStatus;
    httpStatusCode?: number;
    responseBody?: string;
    errorMessage?: string;
    duration?: number;
  },
) {
  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
  });

  if (!delivery) {
    throw new Error("Delivery not found");
  }

  const attemptCount = delivery.attemptCount + 1;

  return prisma.webhookDelivery.update({
    where: { id: deliveryId },
    data: {
      status: attemptData.status,
      statusCode: attemptData.httpStatusCode,
      response: attemptData.responseBody,
      errorMessage: attemptData.errorMessage,
      attemptCount,
      lastAttemptAt: new Date(),
      ...(attemptData.status === WebhookStatus.SUCCESS && {
        deliveredAt: new Date(),
      }),
    },
  });
}

/**
 * Retry a failed delivery
 */
export async function retryDelivery(deliveryId: string) {
  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
    include: {
      webhook: true,
    },
  });

  if (!delivery) {
    throw new Error("Delivery not found");
  }

  if (delivery.status === WebhookStatus.SUCCESS) {
    throw new Error("Cannot retry a successful delivery");
  }

  // Reset status to pending for retry
  return prisma.webhookDelivery.update({
    where: { id: deliveryId },
    data: {
      status: WebhookStatus.PENDING,
    },
  });
}

/**
 * Deliver webhook payload
 */
export async function deliverWebhook(
  webhookId: string,
  event: string,
  data: Record<string, unknown>,
) {
  const webhook = await prisma.webhook.findUnique({
    where: { id: webhookId },
  });

  if (!webhook) {
    throw new Error("Webhook not found");
  }

  if (!webhook.isActive) {
    throw new Error("Webhook is not active");
  }

  // Check if event type is subscribed
  if (
    webhook.eventTypes.length > 0 &&
    !webhook.eventTypes.includes("*") &&
    !webhook.eventTypes.includes(event)
  ) {
    return null; // Skip delivery for unsubscribed events
  }

  // Create delivery record
  const delivery = await createDelivery(webhookId, event, data);

  // In production, this would actually send the HTTP request
  // For now, we simulate the delivery
  try {
    const payload: WebhookPayload = {
      event,
      timestamp: new Date(),
      data,
    };

    // Simulate HTTP request
    const response = await simulateWebhookDelivery(
      webhook.url,
      payload,
      webhook.secretKey,
    );

    await recordAttempt(delivery.id, {
      status: response.success ? WebhookStatus.SUCCESS : WebhookStatus.FAILED,
      httpStatusCode: response.statusCode,
      responseBody: response.body,
      duration: response.duration,
    });

    return delivery;
  } catch (error) {
    await recordAttempt(delivery.id, {
      status: WebhookStatus.FAILED,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return delivery;
  }
}

/**
 * Process pending deliveries
 */
export async function processPendingDeliveries(maxAttempts: number = 5) {
  const pendingDeliveries = await prisma.webhookDelivery.findMany({
    where: {
      status: { in: [WebhookStatus.PENDING, WebhookStatus.RETRYING] },
      attemptCount: { lt: maxAttempts },
    },
    take: 100,
    include: {
      webhook: true,
    },
  });

  const results = [];

  for (const delivery of pendingDeliveries) {
    try {
      const payload: WebhookPayload = {
        event: delivery.event,
        timestamp: delivery.createdAt,
        data: delivery.payload as Record<string, unknown>,
      };

      const response = await simulateWebhookDelivery(
        delivery.webhook.url,
        payload,
        delivery.webhook.secretKey,
      );

      const updated = await recordAttempt(delivery.id, {
        status: response.success
          ? WebhookStatus.SUCCESS
          : WebhookStatus.RETRYING,
        httpStatusCode: response.statusCode,
        responseBody: response.body,
        duration: response.duration,
      });

      results.push({
        deliveryId: delivery.id,
        success: response.success,
        delivery: updated,
      });
    } catch (error) {
      const updated = await recordAttempt(delivery.id, {
        status: WebhookStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });

      results.push({
        deliveryId: delivery.id,
        success: false,
        delivery: updated,
      });
    }
  }

  return {
    processed: pendingDeliveries.length,
    results,
  };
}

/**
 * Get delivery statistics for a webhook
 */
export async function getDeliveryStats(webhookId: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [totalDeliveries, successCount, failedCount] = await Promise.all([
    prisma.webhookDelivery.count({
      where: {
        webhookId,
        createdAt: { gte: startDate },
      },
    }),
    prisma.webhookDelivery.count({
      where: {
        webhookId,
        status: WebhookStatus.SUCCESS,
        createdAt: { gte: startDate },
      },
    }),
    prisma.webhookDelivery.count({
      where: {
        webhookId,
        status: WebhookStatus.FAILED,
        createdAt: { gte: startDate },
      },
    }),
  ]);

  return {
    totalDeliveries,
    successCount,
    failedCount,
    successRate:
      totalDeliveries > 0 ? (successCount / totalDeliveries) * 100 : 0,
  };
}

/**
 * Clean up old deliveries
 */
export async function cleanupOldDeliveries(cutoffDate: Date) {
  return prisma.webhookDelivery.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
      status: { in: [WebhookStatus.SUCCESS, WebhookStatus.FAILED] },
    },
  });
}

// Helper function to simulate webhook delivery
async function simulateWebhookDelivery(
  url: string,
  payload: WebhookPayload,
  secretKey?: string,
): Promise<{
  success: boolean;
  statusCode?: number;
  body?: string;
  duration: number;
}> {
  const startTime = Date.now();

  // In production, this would be a real HTTP request
  // For now, we simulate success/failure randomly for testing
  const isSuccess = Math.random() > 0.1; // 90% success rate

  const duration = Date.now() - startTime;

  if (isSuccess) {
    return {
      success: true,
      statusCode: 200,
      body: JSON.stringify({ received: true }),
      duration,
    };
  } else {
    return {
      success: false,
      statusCode: 500,
      body: "Internal Server Error",
      duration,
    };
  }
}
