import { prisma } from "../../lib/prisma";
import { ScheduledTask } from "../../domain/models/ScheduledTask";
import { info } from "../../observability/logger";

/**
 * Update supplier performance ratings
 */
export async function runTask(
  task: ScheduledTask,
  signal: AbortSignal,
): Promise<void> {
  info("Starting supplier rating update task", { taskId: task.id });

  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  // Get all suppliers
  const suppliers = await prisma.suppliers.findMany({
    include: {
      invoices: {
        where: {
          invoiceDate: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      },
    },
    take: 100,
  });

  for (const supplier of suppliers) {
    if (signal.aborted) return;

    const invoices = supplier.invoices;
    const totalAmount = invoices.reduce(
      (sum, inv) => sum + parseFloat(inv.totalAmount.toString()),
      0,
    );

    // Calculate metrics
    const onTimeCount = invoices.filter(
      (inv) => inv.paidDate && inv.dueDate && inv.paidDate <= inv.dueDate,
    ).length;
    const onTimeRate =
      invoices.length > 0 ? (onTimeCount / invoices.length) * 100 : 0;

    // Update or create performance record
    await prisma.supplierPerformance.upsert({
      where: {
        supplierId_period: {
          supplierId: supplier.id,
          period: currentMonth,
        },
      },
      update: {
        onTimeDelivery: onTimeRate,
        invoiceCount: invoices.length,
        totalAmount,
      },
      create: {
        supplierId: supplier.id,
        period: currentMonth,
        onTimeDelivery: onTimeRate,
        invoiceCount: invoices.length,
        totalAmount,
      },
    });

    // Update supplier stats
    await prisma.suppliers.update({
      where: { id: supplier.id },
      data: {
        totalInvoices: invoices.length,
        totalAmount,
      },
    });
  }

  info(`Updated ratings for ${suppliers.length} suppliers`, {
    taskId: task.id,
  });
  info("Supplier rating update task completed", { taskId: task.id });
}
