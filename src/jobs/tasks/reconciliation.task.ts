import { prisma } from '../../lib/prisma';
import { ScheduledTask } from '../../domain/models/ScheduledTask';
import { ReconciliationStatus } from '../../domain/enums/ReconciliationStatus';
import { info } from '../../observability/logger';

/**
 * Auto-create reconciliation records for bank accounts
 */
export async function runTask(
  task: ScheduledTask,
  signal: AbortSignal
): Promise<void> {
  info('Starting reconciliation auto-creation task', { taskId: task.id });

  const bankAccounts = await prisma.bankAccount.findMany({
    where: { isActive: true },
  });

  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  for (const account of bankAccounts) {
    if (signal.aborted) return;

    // Check if reconciliation already exists for this period
    const existing = await prisma.reconciliation.findFirst({
      where: {
        bankAccountId: account.id,
        startDate: firstDayOfMonth,
        endDate: lastDayOfMonth,
      },
    });

    if (!existing) {
      await prisma.reconciliation.create({
        data: {
          organizationId: account.organizationId,
          bankAccountId: account.id,
          statementDate: today,
          startDate: firstDayOfMonth,
          endDate: lastDayOfMonth,
          openingBalance: account.currentBalance,
          closingBalance: account.currentBalance,
          statementBalance: account.currentBalance,
          status: ReconciliationStatus.PENDING,
        },
      });

      info(`Created reconciliation for account ${account.id}`, { taskId: task.id });
    }
  }

  info('Reconciliation auto-creation task completed', { taskId: task.id });
}
