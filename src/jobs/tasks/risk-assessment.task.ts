import { prisma } from "../../lib/prisma";
import { ScheduledTask } from "../../domain/models/ScheduledTask";
import { RiskLevel } from "../../domain/enums/RiskLevel";
import { InvoiceStatus } from "../../domain/enums/InvoiceStatus";
import { info, error } from "../../observability/logger";

/**
 * Assess risk for invoices and suppliers
 */
export async function runTask(
  task: ScheduledTask,
  signal: AbortSignal,
): Promise<void> {
  info("Starting risk assessment task", { taskId: task.id });

  // Get invoices pending risk assessment
  const invoices = await prisma.invoices.findMany({
    where: {
      status: { in: [InvoiceStatus.SUBMITTED, InvoiceStatus.PROCESSING] },
      riskLevel: RiskLevel.UNKNOWN,
    },
    include: {
      supplier: true,
    },
    take: 100,
  });

  for (const invoice of invoices) {
    if (signal.aborted) return;

    try {
      // Calculate risk factors
      const factors: string[] = [];
      let score = 0;

      // Amount-based risk
      const amount = parseFloat(invoice.totalAmount.toString());
      if (amount > 100000) {
        score += 30;
        factors.push("High value invoice");
      } else if (amount > 50000) {
        score += 20;
        factors.push("Medium-high value invoice");
      }

      // Supplier risk
      if (invoice.supplier?.riskLevel === RiskLevel.HIGH) {
        score += 25;
        factors.push("High risk supplier");
      }

      // Duplicate check risk
      const duplicates = await prisma.invoices.count({
        where: {
          supplierId: invoice.supplierId,
          invoiceNumber: invoice.invoiceNumber,
          id: { not: invoice.id },
        },
      });

      if (duplicates > 0) {
        score += 40;
        factors.push("Potential duplicate invoice");
      }

      // Determine risk level
      let riskLevel: RiskLevel;
      if (score >= 70) riskLevel = RiskLevel.CRITICAL;
      else if (score >= 50) riskLevel = RiskLevel.HIGH;
      else if (score >= 30) riskLevel = RiskLevel.MEDIUM;
      else riskLevel = RiskLevel.LOW;

      // Create risk score record
      await prisma.riskScore.create({
        data: {
          invoiceId: invoice.id,
          organizationId: invoice.organizationId,
          score,
          level: riskLevel,
          factors,
          assessedAt: new Date(),
        },
      });

      // Update invoice risk level
      await prisma.invoices.update({
        where: { id: invoice.id },
        data: { riskLevel },
      });
    } catch (err) {
      error(`Failed to assess risk for invoice ${invoice.id}`, {
        taskId: task.id,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  info("Risk assessment task completed", { taskId: task.id });
}
