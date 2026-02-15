// ============================================================================
// Webhooks Service
// ============================================================================

import { prisma } from '../../db/prisma';

export async function listWebhooks() {
  return prisma.webhook.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

export async function createWebhook(data: any) {
  return prisma.webhook.create({
    data: {
      ...data,
      createdAt: new Date(),
    },
  });
}

export async function updateWebhook(id: string, data: any) {
  return prisma.webhook.update({
    where: { id },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });
}

export async function deleteWebhook(id: string) {
  return prisma.webhook.delete({
    where: { id },
  });
}

export async function triggerWebhook(webhookId: string, event: string, payload: any) {
  const webhook = await prisma.webhook.findUnique({
    where: { id: webhookId },
  });

  if (!webhook || !webhook.isActive) {
    return null;
  }

  // Update trigger statistics
  await prisma.webhook.update({
    where: { id: webhookId },
    data: {
      lastTriggeredAt: new Date(),
      totalTriggers: { increment: 1 },
    },
  });

  // Actual webhook delivery would be handled by a queue worker
  return {
    webhookId,
    event,
    payload,
    triggeredAt: new Date(),
  };
}
