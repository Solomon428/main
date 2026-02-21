import { prisma } from "@/lib/database/client";

export interface SupplierPerformanceMetrics {
  supplierId: string;
  supplierName: string;
  totalInvoices: number;
  totalAmount: number;
  averageInvoiceAmount: number;
  onTimeDeliveryRate: number;
  approvalRate: number;
  averageApprovalTime: number;
  disputeRate: number;
  qualityScore: number;
  riskLevel: string;
  trend: "improving" | "stable" | "declining";
}

export interface SupplierComparison {
  category: string;
  suppliers: Array<{
    id: string;
    name: string;
    totalSpend: number;
    invoiceCount: number;
    avgProcessingTime: number;
    priceCompetitiveness: number;
  }>;
}

export interface SpendingPattern {
  month: string;
  amount: number;
  invoiceCount: number;
  topCategory: string;
}

export class SupplierAnalyticsService {
  /**
   * Get comprehensive performance metrics for a supplier
   */
  static async getSupplierPerformance(
    supplierId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<SupplierPerformanceMetrics | null> {
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
    });

    if (!supplier) return null;

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = startDate;
    if (endDate) dateFilter.lte = endDate;

    const invoices = await prisma.invoice.findMany({
      where: {
        supplierId,
        ...(Object.keys(dateFilter).length > 0 && { invoiceDate: dateFilter }),
      },
      include: {
        approvals: true,
      },
    });

    if (invoices.length === 0) {
      return {
        supplierId,
        supplierName: supplier.name,
        totalInvoices: 0,
        totalAmount: 0,
        averageInvoiceAmount: 0,
        onTimeDeliveryRate: 0,
        approvalRate: 0,
        averageApprovalTime: 0,
        disputeRate: 0,
        qualityScore: 0,
        riskLevel: supplier.riskLevel,
        trend: "stable",
      };
    }

    const totalAmount = invoices.reduce(
      (sum, inv) => sum + Number(inv.totalAmount),
      0,
    );
    const approvedInvoices = invoices.filter(
      (inv) => inv.status === "APPROVED",
    );
    const disputedInvoices = invoices.filter(
      (inv) => inv.status === "DISPUTED",
    );

    // Calculate on-time delivery (invoices received before due date)
    const onTimeInvoices = invoices.filter((inv) => {
      const receivedDate = new Date(inv.receivedDate);
      const dueDate = new Date(inv.dueDate);
      return receivedDate <= dueDate;
    });

    // Calculate approval time
    let totalApprovalTime = 0;
    let approvalCount = 0;

    for (const invoice of invoices) {
      const approved = invoice.approvals.find((a) => a.status === "APPROVED");
      if (approved && approved.actionDate) {
        const received = new Date(invoice.receivedDate).getTime();
        const action = new Date(approved.actionDate).getTime();
        totalApprovalTime += (action - received) / (1000 * 60 * 60); // hours
        approvalCount++;
      }
    }

    // Calculate trend by comparing first half to second half
    const midPoint = Math.floor(invoices.length / 2);
    const firstHalf = invoices.slice(0, midPoint);
    const secondHalf = invoices.slice(midPoint);

    const firstHalfAvg =
      firstHalf.reduce((sum, inv) => sum + Number(inv.totalAmount), 0) /
      (firstHalf.length || 1);
    const secondHalfAvg =
      secondHalf.reduce((sum, inv) => sum + Number(inv.totalAmount), 0) /
      (secondHalf.length || 1);

    let trend: "improving" | "stable" | "declining" = "stable";
    if (secondHalfAvg > firstHalfAvg * 1.1) trend = "improving";
    if (secondHalfAvg < firstHalfAvg * 0.9) trend = "declining";

    // Calculate quality score (0-100)
    const qualityScore = Math.round(
      (onTimeInvoices.length / invoices.length) * 30 +
        (approvedInvoices.length / invoices.length) * 40 +
        (1 - disputedInvoices.length / invoices.length) * 30,
    );

    return {
      supplierId,
      supplierName: supplier.name,
      totalInvoices: invoices.length,
      totalAmount,
      averageInvoiceAmount: totalAmount / invoices.length,
      onTimeDeliveryRate: (onTimeInvoices.length / invoices.length) * 100,
      approvalRate: (approvedInvoices.length / invoices.length) * 100,
      averageApprovalTime:
        approvalCount > 0 ? totalApprovalTime / approvalCount : 0,
      disputeRate: (disputedInvoices.length / invoices.length) * 100,
      qualityScore,
      riskLevel: supplier.riskLevel,
      trend,
    };
  }

  /**
   * Compare suppliers within a category
   */
  static async compareSuppliers(
    category: string,
    limit: number = 10,
  ): Promise<SupplierComparison> {
    const suppliers = await prisma.supplier.findMany({
      where: { category },
      take: limit,
    });

    const comparisonData = await Promise.all(
      suppliers.map(async (supplier) => {
        const invoices = await prisma.invoice.findMany({
          where: { supplierId: supplier.id },
          include: { approvals: true },
        });

        const totalSpend = invoices.reduce(
          (sum, inv) => sum + Number(inv.totalAmount),
          0,
        );

        // Calculate average processing time
        let totalTime = 0;
        let count = 0;
        for (const inv of invoices) {
          const approved = inv.approvals.find((a) => a.status === "APPROVED");
          if (approved?.actionDate) {
            totalTime +=
              (new Date(approved.actionDate).getTime() -
                new Date(inv.receivedDate).getTime()) /
              (1000 * 60 * 60);
            count++;
          }
        }

        return {
          id: supplier.id,
          name: supplier.name,
          totalSpend,
          invoiceCount: invoices.length,
          avgProcessingTime: count > 0 ? totalTime / count : 0,
          priceCompetitiveness: 0, // Would need market data
        };
      }),
    );

    return {
      category,
      suppliers: comparisonData.sort((a, b) => b.totalSpend - a.totalSpend),
    };
  }

  /**
   * Get spending patterns for a supplier
   */
  static async getSpendingPatterns(
    supplierId: string,
    months: number = 12,
  ): Promise<SpendingPattern[]> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const invoices = await prisma.invoice.findMany({
      where: {
        supplierId,
        invoiceDate: { gte: startDate },
      },
      include: {
        lineItems: true,
      },
      orderBy: { invoiceDate: "asc" },
    });

    // Group by month
    const monthlyData: Record<string, SpendingPattern> = {};

    for (const invoice of invoices) {
      const monthKey = invoice.invoiceDate.toISOString().slice(0, 7);
      const monthLabel = invoice.invoiceDate.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthLabel,
          amount: 0,
          invoiceCount: 0,
          topCategory: "",
        };
      }

      monthlyData[monthKey].amount += Number(invoice.totalAmount);
      monthlyData[monthKey].invoiceCount++;

      // Determine top category
      const categories = invoice.lineItems
        .map((li) => li.category)
        .filter(Boolean) as string[];
      if (categories.length > 0) {
        monthlyData[monthKey].topCategory = categories[0];
      }
    }

    return Object.values(monthlyData);
  }

  /**
   * Get top performing suppliers
   */
  static async getTopPerformers(
    limit: number = 10,
    metric: "volume" | "value" | "quality" = "value",
  ): Promise<
    Array<{
      supplierId: string;
      name: string;
      metric: number;
      totalInvoices: number;
      avgAmount: number;
    }>
  > {
    const suppliers = await prisma.supplier.findMany({
      where: { isActive: true },
      take: 50, // Get more to calculate metrics
    });

    const performers = await Promise.all(
      suppliers.map(async (supplier) => {
        const invoices = await prisma.invoice.findMany({
          where: { supplierId: supplier.id },
        });

        const totalAmount = invoices.reduce(
          (sum, inv) => sum + Number(inv.totalAmount),
          0,
        );

        let metricValue = 0;
        switch (metric) {
          case "volume":
            metricValue = invoices.length;
            break;
          case "value":
            metricValue = totalAmount;
            break;
          case "quality":
            const approved = invoices.filter(
              (inv) => inv.status === "APPROVED",
            ).length;
            metricValue =
              invoices.length > 0 ? (approved / invoices.length) * 100 : 0;
            break;
        }

        return {
          supplierId: supplier.id,
          name: supplier.name,
          metric: metricValue,
          totalInvoices: invoices.length,
          avgAmount: invoices.length > 0 ? totalAmount / invoices.length : 0,
        };
      }),
    );

    return performers.sort((a, b) => b.metric - a.metric).slice(0, limit);
  }

  /**
   * Identify consolidation opportunities
   */
  static async getConsolidationOpportunities(): Promise<
    Array<{
      category: string;
      supplierCount: number;
      totalSpend: number;
      potentialSavings: number;
      recommendation: string;
    }>
  > {
    const categories = await prisma.supplier.groupBy({
      by: ["category"],
      _count: { id: true },
    });

    const opportunities = await Promise.all(
      categories.map(async (cat) => {
        const suppliers = await prisma.supplier.findMany({
          where: { category: cat.category },
        });

        let totalSpend = 0;
        for (const supplier of suppliers) {
          const invoices = await prisma.invoice.findMany({
            where: { supplierId: supplier.id },
          });
          totalSpend += invoices.reduce(
            (sum, inv) => sum + Number(inv.totalAmount),
            0,
          );
        }

        // Estimate savings potential (typically 5-15% for consolidation)
        const potentialSavings = totalSpend * 0.08;

        return {
          category: cat.category,
          supplierCount: suppliers.length,
          totalSpend,
          potentialSavings,
          recommendation:
            suppliers.length > 3
              ? `Consider consolidating ${suppliers.length} suppliers to 2-3 strategic partners`
              : `Current supplier count is optimal`,
        };
      }),
    );

    return opportunities
      .filter((o) => o.supplierCount > 3)
      .sort((a, b) => b.potentialSavings - a.potentialSavings);
  }

  /**
   * Generate supplier risk report
   */
  static async getRiskReport(): Promise<
    Array<{
      supplierId: string;
      name: string;
      riskLevel: string;
      riskFactors: string[];
      mitigations: string[];
    }>
  > {
    const highRiskSuppliers = await prisma.supplier.findMany({
      where: {
        riskLevel: { in: ["HIGH", "CRITICAL"] },
      },
    });

    const riskReport = await Promise.all(
      highRiskSuppliers.map(async (supplier) => {
        const riskFactors: string[] = [];
        const mitigations: string[] = [];

        // Check for late deliveries
        const invoices = await prisma.invoice.findMany({
          where: { supplierId: supplier.id },
        });

        const lateInvoices = invoices.filter((inv) => {
          const received = new Date(inv.receivedDate);
          const due = new Date(inv.dueDate);
          return received > due;
        });

        if (lateInvoices.length > invoices.length * 0.2) {
          riskFactors.push("Frequent late deliveries (>20%)");
          mitigations.push(
            "Implement SLA penalties",
            "Identify backup suppliers",
          );
        }

        // Check for quality issues
        const disputed = invoices.filter((inv) => inv.status === "DISPUTED");
        if (disputed.length > invoices.length * 0.1) {
          riskFactors.push("High dispute rate (>10%)");
          mitigations.push("Conduct quality audit", "Review contract terms");
        }

        // Check for single-source dependency
        if (supplier.riskLevel === "CRITICAL") {
          riskFactors.push("Critical supplier - single point of failure");
          mitigations.push(
            "Develop alternative suppliers",
            "Increase safety stock",
          );
        }

        return {
          supplierId: supplier.id,
          name: supplier.name,
          riskLevel: supplier.riskLevel,
          riskFactors,
          mitigations,
        };
      }),
    );

    return riskReport;
  }
}
