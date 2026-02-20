// ============================================================================
// Payments Service
// ============================================================================

import { prisma } from "../../db/prisma";

export async function listPayments() {
  return prisma.payment.findMany({
    include: {
      invoice: true,
      supplier: true,
      bankAccount: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPayment(id: string) {
  return prisma.payment.findUnique({
    where: { id },
    include: {
      invoice: true,
      supplier: true,
      bankAccount: true,
      batch: true,
    },
  });
}

export async function createPayment(data: any) {
  return prisma.payment.create({
    data: {
      ...data,
      status: "PENDING",
      createdAt: new Date(),
    },
    include: {
      invoice: true,
      supplier: true,
    },
  });
}

export async function createPaymentBatch(data: any) {
  const { paymentIds, ...batchData } = data;

  return prisma.paymentBatch.create({
    data: {
      ...batchData,
      status: "PENDING",
      paymentCount: paymentIds?.length || 0,
      payments: paymentIds
        ? {
            connect: paymentIds.map((id: string) => ({ id })),
          }
        : undefined,
    },
    include: {
      payments: true,
    },
  });
}

export async function getPaymentBatch(id: string) {
  return prisma.paymentBatch.findUnique({
    where: { id },
    include: {
      payments: {
        include: {
          invoice: true,
          supplier: true,
        },
      },
      bankAccount: true,
    },
  });
}

export async function processPayment(id: string) {
  return prisma.payment.update({
    where: { id },
    data: {
      status: "PROCESSING",
      processedAt: new Date(),
    },
  });
}
