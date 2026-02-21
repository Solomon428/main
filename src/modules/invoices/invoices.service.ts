// ============================================================================
// Invoices Service
// ============================================================================

import { prisma } from "../../db/prisma";

export async function listInvoices() {
  return prisma.invoice.findMany({
    include: {
      supplier: true,
      lineItems: true,
      approvals: true,
      payments: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getInvoice(id: string) {
  return prisma.invoice.findUnique({
    where: { id },
    include: {
      supplier: true,
      lineItems: true,
      approvals: {
        include: {
          approver: true,
        },
      },
      payments: true,
      comments: {
        include: {
          user: true,
        },
        orderBy: { createdAt: "desc" },
      },
      attachments: true,
    },
  });
}

export async function createInvoice(data: any) {
  const { lineItems, ...invoiceData } = data;

  return prisma.invoice.create({
    data: {
      ...invoiceData,
      lineItems: lineItems
        ? {
            create: lineItems,
          }
        : undefined,
    },
    include: {
      lineItems: true,
      supplier: true,
    },
  });
}

export async function updateInvoice(id: string, data: any) {
  return prisma.invoice.update({
    where: { id },
    data: {
      ...data,
      updatedAt: new Date(),
    },
    include: {
      lineItems: true,
      supplier: true,
    },
  });
}

export async function approveInvoice(id: string, data: any) {
  return prisma.invoice.update({
    where: { id },
    data: {
      status: "APPROVED",
      approvalStatus: "APPROVED",
      approvedDate: new Date(),
      fullyApproved: true,
      updatedAt: new Date(),
    },
  });
}

export async function rejectInvoice(id: string, data: any) {
  return prisma.invoice.update({
    where: { id },
    data: {
      status: "REJECTED",
      approvalStatus: "REJECTED",
      rejectionReason: data.reason,
      updatedAt: new Date(),
    },
  });
}

export async function deleteInvoice(id: string) {
  return prisma.invoice.delete({
    where: { id },
  });
}
