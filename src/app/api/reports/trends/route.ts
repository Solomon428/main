import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/db/prisma";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const months = parseInt(searchParams.get("months") || "6");

    // Generate monthly data for the last N months
    const trends = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const monthName = date.toLocaleString("default", {
        month: "short",
        year: "numeric",
      });

      const invoiceCount = await prisma.invoices.count({
        where: {
          createdAt: {
            gte: date,
            lte: endOfMonth,
          },
        },
      });

      const approvedCount = await prisma.invoices.count({
        where: {
          status: "APPROVED",
          approvedDate: {
            gte: date,
            lte: endOfMonth,
          },
        },
      });

      const rejectedCount = await prisma.invoices.count({
        where: {
          status: "REJECTED",
          updatedAt: {
            gte: date,
            lte: endOfMonth,
          },
        },
      });

      const totalAmount = await prisma.invoices.aggregate({
        where: {
          createdAt: {
            gte: date,
            lte: endOfMonth,
          },
        },
        _sum: {
          totalAmount: true,
        },
      });

      trends.push({
        month: monthName,
        invoices: invoiceCount,
        approved: approvedCount,
        rejected: rejectedCount,
        totalAmount: totalAmount._sum.totalAmount || 0,
      });
    }

    return NextResponse.json({
      success: true,
      data: trends,
    });
  } catch (error) {
    console.error("Error generating trends report:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate trends" },
      { status: 500 },
    );
  }
}
