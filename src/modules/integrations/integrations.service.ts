// ============================================================================
// Integrations Service
// ============================================================================

import { prisma } from "../../db/prisma";

export async function listIntegrations() {
  return prisma.integration.findMany({
    include: {
      syncLogs: {
        orderBy: { startedAt: "desc" },
        take: 5,
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getIntegration(id: string) {
  return prisma.integration.findUnique({
    where: { id },
    include: {
      syncLogs: {
        orderBy: { startedAt: "desc" },
      },
    },
  });
}

export async function createIntegration(data: any) {
  return prisma.integration.create({
    data: {
      ...data,
      status: "PENDING",
      createdAt: new Date(),
    },
  });
}

export async function updateIntegration(id: string, data: any) {
  return prisma.integration.update({
    where: { id },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });
}

export async function deleteIntegration(id: string) {
  return prisma.integration.delete({
    where: { id },
  });
}

export async function triggerSync(integrationId: string) {
  const integration = await prisma.integration.update({
    where: { id: integrationId },
    data: {
      status: "SYNCING",
      lastSyncAt: new Date(),
    },
  });

  // Create sync log entry
  await prisma.integrationSyncLog.create({
    data: {
      integrationId,
      syncType: "BIDIRECTIONAL",
      status: "PENDING",
      triggeredBy: "USER",
      startedAt: new Date(),
    },
  });

  return integration;
}

export async function logSync(data: any) {
  return prisma.integrationSyncLog.create({
    data,
  });
}

export async function getSyncStatus(integrationId: string) {
  const logs = await prisma.integrationSyncLog.findMany({
    where: { integrationId },
    orderBy: { startedAt: "desc" },
    take: 10,
  });

  return {
    integrationId,
    recentSyncs: logs,
    lastSync: logs[0] || null,
  };
}

export async function listSyncLogs(integrationId: string) {
  return prisma.integrationSyncLog.findMany({
    where: { integrationId },
    orderBy: { startedAt: "desc" },
  });
}
