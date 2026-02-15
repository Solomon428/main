// ============================================================================
// System Settings Service
// ============================================================================

import { prisma } from '../../db/prisma';

export async function listSettings() {
  return prisma.systemSetting.findMany({
    orderBy: { category: 'asc' },
  });
}

export async function getSetting(key: string) {
  return prisma.systemSetting.findUnique({
    where: { key },
  });
}

export async function updateSetting(key: string, data: any) {
  const existing = await prisma.systemSetting.findUnique({
    where: { key },
  });

  if (existing) {
    return prisma.systemSetting.update({
      where: { key },
      data: {
        value: data.value,
        updatedBy: data.updatedBy,
        updatedAt: new Date(),
      },
    });
  }

  return prisma.systemSetting.create({
    data: {
      key,
      value: data.value,
      description: data.description,
      category: data.category || 'GENERAL',
      dataType: data.dataType || 'STRING',
      updatedBy: data.updatedBy,
    },
  });
}

export async function deleteSetting(key: string) {
  return prisma.systemSetting.delete({
    where: { key },
  });
}

export async function getSettingsByCategory(category: string) {
  return prisma.systemSetting.findMany({
    where: { category },
    orderBy: { key: 'asc' },
  });
}
