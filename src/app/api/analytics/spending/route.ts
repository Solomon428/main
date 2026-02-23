/**
 * Spending Analytics API Route
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    const groupBy = searchParams.get("groupBy") || "month";

    const startDate = startDateStr
      ? new Date(startDateStr)
      : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const endDate = endDateStr ? new Date(endDateStr) : new Date();

    // Get spending data (without relations to avoid Prisma client issues)
    const invoices = await prisma.invoice.findMany({
      where: {
        invoiceDate: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          notIn: ["CANCELLED", "REJECTED"],
        },
      },
    });

    // Group by period
    const spendingByPeriod = new Map<
      string,
      {
        period: string;
        totalSpend: number;
        invoiceCount: number;
        bySupplier: Map<string, { name: string; amount: number }>;
      }
    >();

    for (const invoice of invoices) {
      const date = new Date(invoice.invoiceDate);
      let periodKey: string;

      if (groupBy === "month") {
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      } else if (groupBy === "quarter") {
        const quarter = Math.ceil((date.getMonth() + 1) / 3);
        periodKey = `${date.getFullYear()}-Q${quarter}`;
      } else {
        periodKey = `${date.getFullYear()}`;
      }

      if (!spendingByPeriod.has(periodKey)) {
        spendingByPeriod.set(periodKey, {
          period: periodKey,
          totalSpend: 0,
          invoiceCount: 0,
          bySupplier: new Map(),
        });
      }

      const period = spendingByPeriod.get(periodKey)!;
      const amount = Number(invoice.totalAmount);

      period.totalSpend += amount;
      period.invoiceCount += 1;

      // By supplier
      const supplierId = invoice.supplierId || "unknown";
      const existing = period.bySupplier.get(supplierId) || {
        name: invoice.supplierName || "Unknown",
        amount: 0,
      };
      existing.amount += amount;
      period.bySupplier.set(supplierId, existing);
    }

    // Convert to array format
    const data = Array.from(spendingByPeriod.values())
      .sort((a, b) => a.period.localeCompare(b.period))
      .map((period) => ({
        period: period.period,
        totalSpend: period.totalSpend,
        invoiceCount: period.invoiceCount,
        avgInvoiceAmount: period.totalSpend / period.invoiceCount,
        topSuppliers: Array.from(period.bySupplier.entries())
          .map(([id, { name, amount }]) => ({ id, name, amount }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 5),
      }));

    // Summary statistics
    const totalSpend = data.reduce((sum, p) => sum + p.totalSpend, 0);
    const totalInvoices = data.reduce((sum, p) => sum + p.invoiceCount, 0);

    return NextResponse.json({
      success: true,
      data: {
        periods: data,
        summary: {
          totalSpend,
          totalInvoices,
          avgInvoiceAmount: totalSpend / totalInvoices,
          periodCount: data.length,
          dateRange: { startDate, endDate },
        },
      },
    });
  } catch (error) {
    console.error("Spending analytics error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get spending analytics" },
      { status: 500 },
    );
  }
}
