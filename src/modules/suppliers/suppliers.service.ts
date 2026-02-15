// ============================================================================
// Suppliers Service
// ============================================================================

import { prisma } from '../../db/prisma';

export async function listSuppliers() {
  return prisma.suppliers.findMany({
    include: {
      contacts: true,
      bankAccounts: true,
      contracts: true,
    },
    orderBy: { name: 'asc' },
  });
}

export async function getSupplier(id: string) {
  return prisma.suppliers.findUnique({
    where: { id },
    include: {
      contacts: true,
      bankAccounts: true,
      contracts: true,
      performanceMetrics: {
        orderBy: { period: 'desc' },
        take: 12,
      },
    },
  });
}

export async function createSupplier(data: any) {
  return prisma.suppliers.create({
    data: {
      ...data,
      createdAt: new Date(),
    },
    include: {
      contacts: true,
      bankAccounts: true,
    },
  });
}

export async function updateSupplier(id: string, data: any) {
  return prisma.suppliers.update({
    where: { id },
    data: {
      ...data,
      updatedAt: new Date(),
    },
    include: {
      contacts: true,
      bankAccounts: true,
    },
  });
}

export async function deleteSupplier(id: string) {
  return prisma.suppliers.delete({
    where: { id },
  });
}

export async function searchSuppliers(query: string) {
  return prisma.suppliers.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { vatNumber: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: 20,
  });
}
