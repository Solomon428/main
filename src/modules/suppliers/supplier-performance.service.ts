// ============================================================================
// Supplier Performance Service
// ============================================================================

import { prisma } from "../../db/prisma";
import { generateId } from "../../utils/ids";
import { info, error } from "../../observability/logger";

interface PerformanceMetrics {
  onTimeDeliveryRate: number;
  qualityScore: number;
  invoiceAccuracyRate: number;
  responseTimeHours: number;
  disputeRate: number;
  totalInvoices: number;
  totalAmount: number;
}

interface CalculatePerformanceInput {
  supplierId: string;
  periodStart: Date;
  periodEnd: Date;
}

/**
 * Calculate performance metrics for a supplier
 */
export async function calculatePerformanceScore(
  input: CalculatePerformanceInput,
): Promise<PerformanceMetrics> {
  try {
    // Get invoices for the period
    const invoices = await prisma.invoice.findMany({
      where: {
        supplierId: input.supplierId,
        createdAt: {
          gte: input.periodStart,
          lte: input.periodEnd,
        },
      },
    });

    const totalInvoices = invoices.length;
    const totalAmount = invoices.reduce(
      (sum, inv) => sum + Number(inv.totalAmount),
      0,
    );

    // Calculate on-time delivery rate
    const onTimeDeliveries = invoices.filter((inv) => {
      if (!inv.dueDate || !inv.paidAt) return false;
      return new Date(inv.paidAt) <= new Date(inv.dueDate);
    }).length;
    const onTimeDeliveryRate =
      totalInvoices > 0 ? (onTimeDeliveries / totalInvoices) * 100 : 0;

    // Get compliance checks for quality score
    const complianceChecks = await prisma.complianceCheck.findMany({
      where: {
        supplierId: input.supplierId,
        createdAt: {
          gte: input.periodStart,
          lte: input.periodEnd,
        },
      },
    });

    const passedChecks = complianceChecks.filter(
      (check) => check.status === "COMPLIANT",
    ).length;
    const qualityScore =
      complianceChecks.length > 0
        ? (passedChecks / complianceChecks.length) * 100
        : 0;

    // Calculate invoice accuracy (invoices without compliance issues)
    const accurateInvoices = invoices.filter((inv) => {
      const issues = complianceChecks.filter(
        (check) => check.invoiceId === inv.id,
      );
      return (
        issues.length === 0 ||
        issues.every((issue) => issue.status === "COMPLIANT")
      );
    }).length;
    const invoiceAccuracyRate =
      totalInvoices > 0 ? (accurateInvoices / totalInvoices) * 100 : 0;

    // Get approval metrics for response time
    const approvals = await prisma.approval.findMany({
      where: {
        invoice: {
          supplierId: input.supplierId,
        },
        createdAt: {
          gte: input.periodStart,
          lte: input.periodEnd,
        },
        actionedAt: { not: null },
      },
    });

    const avgResponseTime =
      approvals.length > 0
        ? approvals.reduce((sum, app) => {
            const responseTime =
              app.actionedAt && app.assignedAt
                ? new Date(app.actionedAt).getTime() -
                  new Date(app.assignedAt).getTime()
                : 0;
            return sum + responseTime;
          }, 0) /
          approvals.length /
          (1000 * 60 * 60) // Convert to hours
        : 0;

    // Calculate dispute rate
    const disputedInvoices = invoices.filter(
      (inv) => inv.status === "DISPUTED",
    ).length;
    const disputeRate =
      totalInvoices > 0 ? (disputedInvoices / totalInvoices) * 100 : 0;

    const metrics: PerformanceMetrics = {
      onTimeDeliveryRate: Math.round(onTimeDeliveryRate * 100) / 100,
      qualityScore: Math.round(qualityScore * 100) / 100,
      invoiceAccuracyRate: Math.round(invoiceAccuracyRate * 100) / 100,
      responseTimeHours: Math.round(avgResponseTime * 100) / 100,
      disputeRate: Math.round(disputeRate * 100) / 100,
      totalInvoices,
      totalAmount,
    };

    return metrics;
  } catch (err) {
    error("Failed to calculate performance score", {
      error: err instanceof Error ? err.message : "Unknown error",
      supplierId: input.supplierId,
    });
    throw err;
  }
}

/**
 * Update performance metrics in database
 */
export async function updatePerformanceMetrics(
  supplierId: string,
  metrics: PerformanceMetrics,
): Promise<void> {
  try {
    await prisma.supplierPerformance.upsert({
      where: {
        supplierId: supplierId,
      },
      create: {
        id: generateId(),
        supplierId: supplierId,
        onTimeDeliveryRate: metrics.onTimeDeliveryRate,
        qualityScore: metrics.qualityScore,
        invoiceAccuracyRate: metrics.invoiceAccuracyRate,
        responseTimeHours: metrics.responseTimeHours,
        disputeRate: metrics.disputeRate,
        totalInvoices: metrics.totalInvoices,
        totalAmount: metrics.totalAmount,
        periodStart: new Date(),
        periodEnd: new Date(),
      },
      update: {
        onTimeDeliveryRate: metrics.onTimeDeliveryRate,
        qualityScore: metrics.qualityScore,
        invoiceAccuracyRate: metrics.invoiceAccuracyRate,
        responseTimeHours: metrics.responseTimeHours,
        disputeRate: metrics.disputeRate,
        totalInvoices: metrics.totalInvoices,
        totalAmount: metrics.totalAmount,
        periodStart: new Date(),
        periodEnd: new Date(),
        updatedAt: new Date(),
      },
    });

    info("Performance metrics updated", { supplierId });
  } catch (err) {
    error("Failed to update performance metrics", {
      error: err instanceof Error ? err.message : "Unknown error",
      supplierId,
    });
    throw err;
  }
}

/**
 * Get performance report for a supplier
 */
export async function getPerformanceReport(supplierId: string) {
  try {
    const performance = await prisma.supplierPerformance.findUnique({
      where: { supplierId },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            code: true,
            status: true,
          },
        },
      },
    });

    return performance;
  } catch (err) {
    error("Failed to get performance report", {
      error: err instanceof Error ? err.message : "Unknown error",
      supplierId,
    });
    throw err;
  }
}

/**
 * Get performance comparison across multiple suppliers
 */
export async function getPerformanceComparison(supplierIds: string[]) {
  try {
    const performances = await prisma.supplierPerformance.findMany({
      where: {
        supplierId: {
          in: supplierIds,
        },
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        qualityScore: "desc",
      },
    });

    return performances;
  } catch (err) {
    error("Failed to get performance comparison", {
      error: err instanceof Error ? err.message : "Unknown error",
      supplierIds,
    });
    throw err;
  }
}

/**
 * Calculate overall supplier rating (1-5 stars)
 */
export function calculateOverallRating(metrics: PerformanceMetrics): number {
  const weights = {
    onTimeDelivery: 0.3,
    quality: 0.3,
    accuracy: 0.2,
    responseTime: 0.1,
    disputeRate: 0.1,
  };

  // Normalize response time (lower is better, max 72 hours)
  const responseTimeScore = Math.max(
    0,
    100 - (metrics.responseTimeHours / 72) * 100,
  );

  // Normalize dispute rate (lower is better)
  const disputeScore = Math.max(0, 100 - metrics.disputeRate);

  const weightedScore =
    metrics.onTimeDeliveryRate * weights.onTimeDelivery +
    metrics.qualityScore * weights.quality +
    metrics.invoiceAccuracyRate * weights.accuracy +
    responseTimeScore * weights.responseTime +
    disputeScore * weights.disputeRate;

  // Convert to 1-5 scale
  const rating = (weightedScore / 100) * 5;

  return Math.round(rating * 10) / 10;
}

export default {
  calculatePerformanceScore,
  updatePerformanceMetrics,
  getPerformanceReport,
  getPerformanceComparison,
  calculateOverallRating,
};
