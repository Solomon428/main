/**
 * Supplier Analytics API Route
 */

import { NextRequest, NextResponse } from "next/server";
import { SupplierAnalyticsService } from "@/services/supplier-analytics-service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const supplierId = searchParams.get("supplierId");
    const category = searchParams.get("category");
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    const action = searchParams.get("action") || "performance";

    const startDate = startDateStr
      ? new Date(startDateStr)
      : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const endDate = endDateStr ? new Date(endDateStr) : new Date();

    let data;

    switch (action) {
      case "performance":
        if (!supplierId) {
          return NextResponse.json(
            { success: false, error: "supplierId required for performance" },
            { status: 400 },
          );
        }
        data = await SupplierAnalyticsService.getSupplierPerformance(
          supplierId,
          startDate,
          endDate,
        );
        break;

      case "compare":
        if (!category) {
          return NextResponse.json(
            { success: false, error: "category required for comparison" },
            { status: 400 },
          );
        }
        data = await SupplierAnalyticsService.compareSuppliers(category);
        break;

      case "spending":
        if (!supplierId) {
          return NextResponse.json(
            { success: false, error: "supplierId required for spending" },
            { status: 400 },
          );
        }
        const months = parseInt(searchParams.get("months") || "12");
        data = await SupplierAnalyticsService.getSpendingPatterns(
          supplierId,
          months,
        );
        break;

      case "risk":
        data = await SupplierAnalyticsService.getRiskReport();
        break;

      case "consolidation":
        data = await SupplierAnalyticsService.getConsolidationOpportunities();
        break;

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 },
        );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Supplier analytics error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get supplier analytics" },
      { status: 500 },
    );
  }
}
