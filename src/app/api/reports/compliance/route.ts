import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get VAT compliance stats
    const totalInvoices = await prisma.invoice.count();
    const vatCompliant = await prisma.invoice.count({
      where: { vatCompliant: true },
    });
    const nonCompliant = totalInvoices - vatCompliant;

    // Calculate compliance rate
    const vatComplianceRate =
      totalInvoices > 0 ? (vatCompliant / totalInvoices) * 100 : 0;

    // Get duplicate rate
    const duplicateInvoices = await prisma.invoice.count({
      where: { isDuplicate: true },
    });
    const duplicateRate =
      totalInvoices > 0 ? (duplicateInvoices / totalInvoices) * 100 : 0;

    return NextResponse.json({
      success: true,
      data: {
        vatCompliance: {
          compliant: vatCompliant || 0,
          nonCompliant: nonCompliant || 0,
          rate: parseFloat(vatComplianceRate.toFixed(1)) || 0,
        },
        duplicateRate: parseFloat(duplicateRate.toFixed(1)) || 0,
        sanctionViolations: 0,
        totalProcessed: totalInvoices || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching compliance data:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch compliance data" },
      { status: 500 },
    );
  }
}
