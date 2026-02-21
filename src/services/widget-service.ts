import { prisma } from "@/lib/database/client";
import { Prisma } from "@prisma/client";
import { InvoiceStatus, PriorityLevel, ApprovalStatus } from "@/types";

export interface WidgetData {
  id: string;
  type: string;
  title: string;
  data: any;
  lastUpdated: Date;
}

export interface DashboardWidgets {
  widgets: WidgetData[];
  layout: Array<{
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
  }>;
}

export class WidgetService {
  /**
   * Get all dashboard widgets
   */
  static async getDashboardWidgets(userId: string): Promise<DashboardWidgets> {
    const [
      statsWidget,
      pendingWidget,
      overdueWidget,
      categoryWidget,
      topSuppliersWidget,
      monthlyTrendWidget,
      workloadWidget,
      currencyWidget,
    ] = await Promise.all([
      this.getStatsWidget(),
      this.getPendingApprovalsWidget(userId),
      this.getOverdueWidget(),
      this.getCategoryWidget(),
      this.getTopSuppliersWidget(),
      this.getMonthlyTrendWidget(),
      this.getWorkloadWidget(),
      this.getCurrencyExposureWidget(),
    ]);

    return {
      widgets: [
        statsWidget,
        pendingWidget,
        overdueWidget,
        categoryWidget,
        topSuppliersWidget,
        monthlyTrendWidget,
        workloadWidget,
        currencyWidget,
      ],
      layout: [
        { id: statsWidget.id, x: 0, y: 0, w: 12, h: 2 },
        { id: pendingWidget.id, x: 0, y: 2, w: 6, h: 3 },
        { id: overdueWidget.id, x: 6, y: 2, w: 6, h: 3 },
        { id: categoryWidget.id, x: 0, y: 5, w: 4, h: 3 },
        { id: topSuppliersWidget.id, x: 4, y: 5, w: 4, h: 3 },
        { id: monthlyTrendWidget.id, x: 8, y: 5, w: 4, h: 3 },
        { id: workloadWidget.id, x: 0, y: 8, w: 6, h: 3 },
        { id: currencyWidget.id, x: 6, y: 8, w: 6, h: 3 },
      ],
    };
  }

  /**
   * Get statistics widget
   */
  static async getStatsWidget(): Promise<WidgetData> {
    const [
      totalInvoices,
      pendingApprovals,
      totalPaid,
      overdueCount,
      avgProcessingTime,
    ] = await Promise.all([
      prisma.invoice.count(),
      prisma.invoice.count({
        where: { status: { in: ["PENDING_APPROVAL", "UNDER_REVIEW"] } },
      }),
      prisma.invoice.aggregate({
        where: { status: "PAID" },
        _sum: { totalAmount: true },
      }),
      prisma.invoice.count({
        where: {
          status: { notIn: ["PAID", "CANCELLED"] },
          dueDate: { lt: new Date() },
        },
      }),
      this.calculateAvgProcessingTime(),
    ]);

    return {
      id: "stats",
      type: "stats",
      title: "Key Metrics",
      data: {
        totalInvoices,
        pendingApprovals,
        totalPaid: totalPaid._sum.totalAmount || 0,
        overdueCount,
        avgProcessingTime,
      },
      lastUpdated: new Date(),
    };
  }

  /**
   * Get pending approvals widget
   */
  static async getPendingApprovalsWidget(userId?: string): Promise<WidgetData> {
    const where: Prisma.invoicesWhereInput = {
      status: { in: ["PENDING_APPROVAL", "UNDER_REVIEW"] },
    };

    if (userId) {
      where.currentApproverId = userId;
    }

    const [count, highPriority, atRisk] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.count({
        where: { ...where, priority: "HIGH" },
      }),
      prisma.approval.count({
        where: {
          status: "PENDING",
          slaDeadline: { lt: new Date() },
        },
      }),
    ]);

    // Get top 5 pending
    const pending = await prisma.invoice.findMany({
      where,
      orderBy: { priority: "desc" },
      take: 5,
      include: {
        supplier: { select: { name: true } },
      },
    });

    return {
      id: "pending",
      type: "list",
      title: "Pending Approvals",
      data: {
        count,
        highPriority,
        atRisk,
        items: pending.map((p) => ({
          id: p.id,
          invoiceNumber: p.invoiceNumber,
          supplierName: p.supplier?.name,
          amount: p.totalAmount.toString(),
          currency: p.currency,
          priority: p.priority,
          dueDate: p.dueDate,
        })),
      },
      lastUpdated: new Date(),
    };
  }

  /**
   * Get overdue widget
   */
  static async getOverdueWidget(): Promise<WidgetData> {
    const overdue = await prisma.invoice.findMany({
      where: {
        status: { notIn: ["PAID", "CANCELLED"] },
        dueDate: { lt: new Date() },
      },
      orderBy: { dueDate: "asc" },
      take: 5,
      include: {
        supplier: { select: { name: true } },
      },
    });

    const totalOverdue = await prisma.invoice.aggregate({
      where: {
        status: { notIn: ["PAID", "CANCELLED"] },
        dueDate: { lt: new Date() },
      },
      _sum: { totalAmount: true },
    });

    return {
      id: "overdue",
      type: "list",
      title: "Overdue Invoices",
      data: {
        count: overdue.length,
        totalAmount: totalOverdue._sum.totalAmount || 0,
        items: overdue.map((o) => ({
          id: o.id,
          invoiceNumber: o.invoiceNumber,
          supplierName: o.supplier?.name,
          amount: o.totalAmount.toString(),
          currency: o.currency,
          daysOverdue: Math.floor(
            (Date.now() - new Date(o.dueDate).getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        })),
      },
      lastUpdated: new Date(),
    };
  }

  /**
   * Get category breakdown widget
   */
  static async getCategoryWidget(): Promise<WidgetData> {
    const categories = await prisma.line_items.groupBy({
      by: ["category"],
      where: { category: { not: null } },
      _count: { category: true },
      _sum: { lineTotal: true },
    });

    return {
      id: "categories",
      type: "chart",
      title: "Spending by Category",
      data: {
        type: "pie",
        categories: categories.map((c) => ({
          name: c.category,
          count: c._count.category,
          total: c._sum.lineTotal || 0,
        })),
      },
      lastUpdated: new Date(),
    };
  }

  /**
   * Get top suppliers widget
   */
  static async getTopSuppliersWidget(): Promise<WidgetData> {
    const suppliers = await prisma.invoice.groupBy({
      by: ["supplierId"],
      _count: { id: true },
      _sum: { totalAmount: true },
      orderBy: { _sum: { totalAmount: "desc" } },
      take: 5,
    });

    const supplierDetails = await prisma.supplier.findMany({
      where: { id: { in: suppliers.map((s) => s.supplierId) } },
      select: { id: true, name: true },
    });

    return {
      id: "topSuppliers",
      type: "chart",
      title: "Top Suppliers",
      data: {
        type: "bar",
        suppliers: suppliers.map((s) => ({
          id: s.supplierId,
          name:
            supplierDetails.find((sd) => sd.id === s.supplierId)?.name ||
            "Unknown",
          invoiceCount: s._count.id,
          totalAmount: s._sum.totalAmount || 0,
        })),
      },
      lastUpdated: new Date(),
    };
  }

  /**
   * Get monthly trend widget
   */
  static async getMonthlyTrendWidget(): Promise<WidgetData> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const invoices = await prisma.invoice.findMany({
      where: {
        createdAt: { gte: sixMonthsAgo },
      },
      select: {
        createdAt: true,
        totalAmount: true,
        status: true,
      },
    });

    // Group by month
    const monthlyData: Record<
      string,
      { month: string; count: number; amount: number }
    > = {};

    for (const invoice of invoices) {
      const monthKey = invoice.createdAt.toISOString().slice(0, 7); // YYYY-MM
      const monthLabel = invoice.createdAt.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthLabel, count: 0, amount: 0 };
      }

      monthlyData[monthKey].count++;
      monthlyData[monthKey].amount += Number(invoice.totalAmount);
    }

    return {
      id: "monthlyTrend",
      type: "chart",
      title: "Monthly Trend",
      data: {
        type: "line",
        months: Object.values(monthlyData),
      },
      lastUpdated: new Date(),
    };
  }

  /**
   * Get workload widget
   */
  static async getWorkloadWidget(): Promise<WidgetData> {
    const approvers = await prisma.user.findMany({
      where: {
        role: { in: ["CREDIT_CLERK", "BRANCH_MANAGER", "FINANCIAL_MANAGER"] },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        role: true,
        currentWorkload: true,
        maxWorkload: true,
      },
    });

    const workloadData = approvers.map((a) => {
      const utilization = (a.currentWorkload / a.maxWorkload) * 100;
      return {
        id: a.id,
        name: a.name,
        role: a.role,
        current: a.currentWorkload,
        max: a.maxWorkload,
        utilization,
        status:
          utilization > 80
            ? "overloaded"
            : utilization > 60
              ? "busy"
              : "optimal",
      };
    });

    return {
      id: "workload",
      type: "chart",
      title: "Approver Workload",
      data: {
        type: "bar",
        approvers: workloadData,
      },
      lastUpdated: new Date(),
    };
  }

  /**
   * Get currency exposure widget
   */
  static async getCurrencyExposureWidget(): Promise<WidgetData> {
    const currencies = await prisma.invoice.groupBy({
      by: ["currency"],
      _count: { id: true },
      _sum: { totalAmount: true },
      where: {
        status: { notIn: ["PAID", "CANCELLED"] },
      },
    });

    return {
      id: "currency",
      type: "chart",
      title: "Currency Exposure",
      data: {
        type: "pie",
        currencies: currencies.map((c) => ({
          code: c.currency,
          count: c._count.id,
          totalAmount: c._sum.totalAmount || 0,
        })),
      },
      lastUpdated: new Date(),
    };
  }

  // Private helper methods

  private static async calculateAvgProcessingTime(): Promise<number> {
    const approvedInvoices = await prisma.invoice.findMany({
      where: {
        status: "APPROVED",
        approvedDate: { not: null },
      },
      select: {
        createdAt: true,
        approvedDate: true,
      },
      take: 100,
    });

    if (approvedInvoices.length === 0) return 0;

    const totalHours = approvedInvoices.reduce((sum, inv) => {
      const created = inv.createdAt.getTime();
      const approved = inv.approvedDate!.getTime();
      const hours = (approved - created) / (1000 * 60 * 60);
      return sum + hours;
    }, 0);

    return Math.round(totalHours / approvedInvoices.length);
  }

  /**
   * Get real-time updates for a widget
   */
  static async getWidgetUpdate(
    widgetId: string,
    userId?: string,
  ): Promise<WidgetData> {
    switch (widgetId) {
      case "stats":
        return this.getStatsWidget();
      case "pending":
        return this.getPendingApprovalsWidget(userId);
      case "overdue":
        return this.getOverdueWidget();
      case "categories":
        return this.getCategoryWidget();
      case "topSuppliers":
        return this.getTopSuppliersWidget();
      case "monthlyTrend":
        return this.getMonthlyTrendWidget();
      case "workload":
        return this.getWorkloadWidget();
      case "currency":
        return this.getCurrencyExposureWidget();
      default:
        throw new Error(`Unknown widget: ${widgetId}`);
    }
  }
}
