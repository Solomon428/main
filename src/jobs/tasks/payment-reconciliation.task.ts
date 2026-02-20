import { prisma } from "../../lib/prisma";
import { ScheduledTask } from "../../domain/models/ScheduledTask";
import { ReconciliationStatus } from "../../domain/enums/ReconciliationStatus";
import { PaymentStatus } from "../../domain/enums/PaymentStatus";
import { info, error } from "../../observability/logger";

/**
 * Reconcile payments with bank statements
 */
export async function runTask(
  task: ScheduledTask,
  signal: AbortSignal,
): Promise<void> {
  info("Starting payment reconciliation task", { taskId: task.id });

  // Get pending reconciliations
  const pendingReconciliations = await prisma.reconciliation.findMany({
    where: {
      status: ReconciliationStatus.PENDING,
    },
    include: {
      bankAccount: true,
      items: true,
    },
    take: 10,
  });

  for (const reconciliation of pendingReconciliations) {
    if (signal.aborted) return;

    try {
      await prisma.reconciliation.update({
        where: { id: reconciliation.id },
        data: { status: ReconciliationStatus.IN_PROGRESS },
      });

      // Match reconciliation items with payments
      let matchedCount = 0;
      for (const item of reconciliation.items) {
        if (signal.aborted) return;

        // Find matching payment
        const matchingPayment = await prisma.payment.findFirst({
          where: {
            bankAccountId: reconciliation.bankAccountId,
            amount: item.amount,
            status: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
          },
        });

        if (matchingPayment) {
          await prisma.reconciliationItem.update({
            where: { id: item.id },
            data: {
              matchedPaymentId: matchingPayment.id,
              status: "MATCHED",
              matchConfidence: 100,
              matchingMethod: "AUTO",
            },
          });

          // Update payment as reconciled
          await prisma.payment.update({
            where: { id: matchingPayment.id },
            data: {
              isReconciled: true,
              reconciledAt: new Date(),
              reconciliationId: reconciliation.id,
              status: PaymentStatus.COMPLETED,
            },
          });

          matchedCount++;
        }
      }

      // Update reconciliation status
      const allMatched = reconciliation.items.every(
        (item) => item.status === "MATCHED",
      );
      await prisma.reconciliation.update({
        where: { id: reconciliation.id },
        data: {
          status: allMatched
            ? ReconciliationStatus.RECONCILED
            : ReconciliationStatus.REVIEWED,
          completedAt: new Date(),
        },
      });

      info(
        `Reconciliation ${reconciliation.id} processed: ${matchedCount} items matched`,
        {
          taskId: task.id,
        },
      );
    } catch (err) {
      error(`Failed to reconcile ${reconciliation.id}`, {
        taskId: task.id,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  info("Payment reconciliation task completed", { taskId: task.id });
}
