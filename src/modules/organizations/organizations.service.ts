// ============================================================================
// Organizations Service
// ============================================================================

import { prisma } from "../../db/prisma";

export async function listOrganizations() {
  return prisma.organization.findMany({
    include: {
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      _count: {
        select: {
          users: true,
          suppliers: true,
          invoices: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOrganization(id: string) {
  return prisma.organization.findUnique({
    where: { id },
    include: {
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
        },
      },
      bankAccounts: true,
      _count: {
        select: {
          users: true,
          suppliers: true,
          invoices: true,
        },
      },
    },
  });
}

export async function createOrganization(data: any) {
  return prisma.organization.create({
    data: {
      ...data,
      createdAt: new Date(),
    },
  });
}

export async function updateOrganization(id: string, data: any) {
  return prisma.organization.update({
    where: { id },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });
}

export async function deleteOrganization(id: string) {
  return prisma.organization.delete({
    where: { id },
  });
}
