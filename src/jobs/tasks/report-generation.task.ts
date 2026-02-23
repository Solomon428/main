import { prisma } from "../../lib/prisma";
import { ScheduledTask } from "../../domain/models/ScheduledTask";
import { info } from "../../observability/logger";

/**
 * Generate scheduled reports
 */
export async function runTask(
  task: ScheduledTask,
  signal: AbortSignal,
): Promise<void> {
  info("Starting report generation task", { taskId: task.id });

  // Get parameters from task
  const reportType = (task.parameters?.reportType as string) || "MONTHLY";
  const organizationId = task.parameters?.organizationId as string;

  if (!organizationId) {
    info("No organization specified, skipping report generation", {
      taskId: task.id,
    });
    return;
  }

  if (signal.aborted) return;

  // Generate different reports based on type
  switch (reportType) {
    case "DAILY":
      await generateDailyReport(organizationId);
      break;
    case "WEEKLY":
      await generateWeeklyReport(organizationId);
      break;
    case "MONTHLY":
      await generateMonthlyReport(organizationId);
      break;
    default:
      info(`Unknown report type: ${reportType}`, { taskId: task.id });
  }

  info("Report generation task completed", { taskId: task.id });
}

async function generateDailyReport(organizationId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const invoicesToday = await prisma.invoice.count({
    where: {
      organizationId,
      createdAt: { gte: today },
    },
  });

  const paymentsToday = await prisma.payment.aggregate({
    where: {
      organizationId,
      createdAt: { gte: today },
    },
    _sum: { amount: true },
  });

  // Store or send report
  info(
    `Daily report for ${organizationId}: ${invoicesToday} invoices, payments: ${paymentsToday._sum.amount || 0}`,
  );
}

async function generateWeeklyReport(organizationId: string) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const pendingApprovals = await prisma.approval.count({
    where: {
      invoice: { organizationId },
      status: "PENDING",
    },
  });

  const overdueInvoices = await prisma.invoice.count({
    where: {
      organizationId,
      dueDate: { lt: new Date() },
      paymentStatus: { in: ["UNPAID", "PARTIALLY_PAID"] },
    },
  });

  info(
    `Weekly report for ${organizationId}: ${pendingApprovals} pending approvals, ${overdueInvoices} overdue invoices`,
  );
}

async function generateMonthlyReport(organizationId: string) {
  const firstDayOfMonth = new Date();
  firstDayOfMonth.setDate(1);
  firstDayOfMonth.setHours(0, 0, 0, 0);

  const totalSpent = await prisma.payment.aggregate({
    where: {
      organizationId,
      createdAt: { gte: firstDayOfMonth },
      status: "COMPLETED" as any,
    },
    _sum: { amount: true },
  });

  const supplierCount = await prisma.supplier.count({
    where: {
      organizationId,
      createdAt: { gte: firstDayOfMonth },
    },
  });

  info(
    `Monthly report for ${organizationId}: Total spent: ${totalSpent._sum.amount ?? 0}, New suppliers: ${supplierCount}`,
  );
}
