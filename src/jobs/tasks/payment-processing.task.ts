import { prisma } from "../../lib/prisma";
import { ScheduledTask } from "../../domain/models/ScheduledTask";
import { PaymentStatus } from "../../domain/enums/PaymentStatus";
import { InvoiceStatus } from "../../domain/enums/InvoiceStatus";
import { createNotification } from "../../modules/notifications/notifications.service";
import { NotificationType } from "../../domain/enums/NotificationType";
import { info, error } from "../../observability/logger";

/**
 * Process scheduled payments
 */
export async function runTask(
  task: ScheduledTask,
  signal: AbortSignal,
): Promise<void> {
  info("Starting payment processing task", { taskId: task.id });

  // Get approved invoices ready for payment
  const pendingPayments = await prisma.invoice.findMany({
    where: {
      status: InvoiceStatus.APPROVED,
      readyForPayment: true,
      paymentStatus: { in: ["UNPAID", "PARTIALLY_PAID"] as any },
      dueDate: { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    },
    include: {
      supplier: true,
      organization: true,
    },
    take: 100,
  });

  info(`Found ${pendingPayments.length} invoices ready for payment`, {
    taskId: task.id,
  });

  for (const invoice of pendingPayments) {
    if (signal.aborted) {
      info("Payment processing task aborted", { taskId: task.id });
      return;
    }

    try {
      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          organizationId: invoice.organizationId,
          invoiceId: invoice.id,
          supplierId: invoice.supplierId,
          paymentNumber: `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          paymentDate: new Date(),
          amount: invoice.amountDue,
          currency: invoice.currency,
          paymentMethod: invoice.paymentMethod || "BANK_TRANSFER",
          status: "PENDING" as any,
        },
      });

      // Update invoice status
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          paymentStatus: "SCHEDULED" as any,
          paidDate: new Date(),
        },
      });

      // Notify relevant users
      const users = await prisma.user.findMany({
        where: {
          organizations: { some: { id: invoice.organizationId } },
          role: { in: ["FINANCE_MANAGER", "ADMIN"] as any },
        },
      });

      for (const user of users) {
        await createNotification(user.id, invoice.organizationId, {
          type: NotificationType.PAYMENT_PROCESSED,
          title: "Payment Scheduled",
          message: `Payment of ${invoice.amountDue} ${invoice.currency} scheduled for invoice ${invoice.invoiceNumber}`,
          priority: "MEDIUM" as any,
          entityType: "PAYMENT" as any,
          entityId: payment.id,
        });
      }
    } catch (err) {
      error(`Failed to process payment for invoice ${invoice.id}`, {
        taskId: task.id,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  info("Payment processing task completed", { taskId: task.id });
}
