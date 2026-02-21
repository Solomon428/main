// ============================================================================
// Suppliers Service
// ============================================================================

import { prisma } from "../../db/prisma";

export async function listSuppliers() {
  return prisma.supplier.findMany({
    include: {
      contacts: true,
      bankAccounts: true,
      contracts: true,
    },
    orderBy: { name: "asc" },
  });
}

export async function getSupplier(id: string) {
  return prisma.supplier.findUnique({
    where: { id },
    include: {
      contacts: true,
      bankAccounts: true,
      contracts: true,
      performanceMetrics: {
        orderBy: { period: "desc" },
        take: 12,
      },
    },
  });
}

export async function createSupplier(data: any) {
  return prisma.supplier.create({
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
  return prisma.supplier.update({
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
  return prisma.supplier.delete({
    where: { id },
  });
}

export async function searchSuppliers(query: string) {
  return prisma.supplier.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { primaryContactEmail: { contains: query, mode: "insensitive" } },
        { vatNumber: { contains: query, mode: "insensitive" } },
      ],
    },
    take: 20,
  });
}
