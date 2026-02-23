import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

const DEFAULT_ORG_ID = "default-org-id";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const periodMonths = parseInt(searchParams.get("period") || "12");

    const supplier = await prisma.supplier.findFirst({
      where: { id: params.id, deletedAt: null },
      select: {
        id: true,
        name: true,
        totalInvoices: true,
        totalAmount: true,
        totalPaid: true,
        averagePaymentDays: true,
        riskLevel: true,
        riskScore: true,
        complianceStatus: true,
      },
    });

    if (!supplier) {
      return NextResponse.json(
        { success: false, error: "Supplier not found" },
        { status: 404 }
      );
    }

    const performanceRecords = await prisma.supplierPerformance.findMany({
      where: { supplierId: params.id },
      orderBy: { period: "desc" },
      take: periodMonths,
    });

    const invoices = await prisma.invoice.findMany({
      where: {
        supplierId: params.id,
        deletedAt: null,
      },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        approvedDate: true,
        paidDate: true,
        riskLevel: true,
      },
    });

    const totalInvoicesCount = invoices.length;
    const approvedInvoices = invoices.filter(
      (i) => i.status === "APPROVED" || i.status === "PAID"
    );
    const rejectedInvoices = invoices.filter((i) => i.status === "REJECTED");
    const paidInvoices = invoices.filter((i) => i.status === "PAID");

    const invoiceAcceptanceRate =
      totalInvoicesCount > 0
        ? (approvedInvoices.length / totalInvoicesCount) * 100
        : 0;

    const complianceRecords = await prisma.complianceCheck.count({
      where: {
        supplierId: params.id,
        status: "COMPLIANT",
      },
    });

    const totalComplianceChecks = await prisma.complianceCheck.count({
      where: { supplierId: params.id },
    });

    const complianceRate =
      totalComplianceChecks > 0
        ? (complianceRecords / totalComplianceChecks) * 100
        : 100;

    const paymentsWithDates = paidInvoices
      .filter((i) => i.approvedDate && i.paidDate)
      .map((i) => {
        const diffTime = Math.abs(
          i.paidDate!.getTime() - i.approvedDate!.getTime()
        );
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      });

    const avgPaymentDelay =
      paymentsWithDates.length > 0
        ? paymentsWithDates.reduce((a, b) => a + b, 0) / paymentsWithDates.length
        : supplier.averagePaymentDays || 0;

    const overallScore =
      invoiceAcceptanceRate * 0.4 +
      complianceRate * 0.3 +
      Math.max(0, 100 - avgPaymentDelay * 2) * 0.3;

    let rating: "EXCELLENT" | "GOOD" | "AVERAGE" | "POOR";
    if (overallScore >= 85) rating = "EXCELLENT";
    else if (overallScore >= 70) rating = "GOOD";
    else if (overallScore >= 50) rating = "AVERAGE";
    else rating = "POOR";

    const monthlyTrends = performanceRecords.map((record) => ({
      period: record.period,
      onTimeDelivery: record.onTimeDelivery ? Number(record.onTimeDelivery) : null,
      qualityScore: record.qualityScore ? Number(record.qualityScore) : null,
      priceCompetitiveness: record.priceCompetitiveness
        ? Number(record.priceCompetitiveness)
        : null,
      serviceLevel: record.serviceLevel ? Number(record.serviceLevel) : null,
      overallScore: record.overallScore ? Number(record.overallScore) : null,
      invoiceCount: record.invoiceCount,
      totalAmount: Number(record.totalAmount),
      avgProcessingDays: record.avgProcessingDays
        ? Number(record.avgProcessingDays)
        : null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        supplier: {
          ...supplier,
          totalAmount: Number(supplier.totalAmount),
          totalPaid: Number(supplier.totalPaid),
          riskScore: supplier.riskScore ? Number(supplier.riskScore) : null,
        },
        performance: {
          invoiceAcceptanceRate: Math.round(invoiceAcceptanceRate * 100) / 100,
          complianceRate: Math.round(complianceRate * 100) / 100,
          averagePaymentDelay: Math.round(avgPaymentDelay * 10) / 10,
          overallScore: Math.round(overallScore * 100) / 100,
          rating,
          totalInvoices: totalInvoicesCount,
          approvedInvoices: approvedInvoices.length,
          rejectedInvoices: rejectedInvoices.length,
          paidInvoices: paidInvoices.length,
        },
        trends: monthlyTrends,
        periodMonths,
      },
    });
  } catch (error) {
    console.error("Error fetching supplier performance:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch supplier performance" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const {
      period,
      onTimeDelivery,
      qualityScore,
      priceCompetitiveness,
      serviceLevel,
      invoiceCount,
      totalAmount,
      avgProcessingDays,
    } = body;

    if (!period) {
      return NextResponse.json(
        { success: false, error: "Period is required (YYYY-MM format)" },
        { status: 400 }
      );
    }

    const calculatedOverallScore =
      ((onTimeDelivery || 0) +
        (qualityScore || 0) +
        (priceCompetitiveness || 0) +
        (serviceLevel || 0)) /
      4;

    const existingRecord = await prisma.supplierPerformance.findUnique({
      where: {
        supplierId_period: {
          supplierId: params.id,
          period,
        },
      },
    });

    let record;
    if (existingRecord) {
      record = await prisma.supplierPerformance.update({
        where: { id: existingRecord.id },
        data: {
          onTimeDelivery: onTimeDelivery ? new Decimal(onTimeDelivery) : null,
          qualityScore: qualityScore ? new Decimal(qualityScore) : null,
          priceCompetitiveness: priceCompetitiveness
            ? new Decimal(priceCompetitiveness)
            : null,
          serviceLevel: serviceLevel ? new Decimal(serviceLevel) : null,
          overallScore: new Decimal(calculatedOverallScore),
          invoiceCount: invoiceCount || 0,
          totalAmount: new Decimal(totalAmount || 0),
          avgProcessingDays: avgProcessingDays
            ? new Decimal(avgProcessingDays)
            : null,
        },
      });
    } else {
      record = await prisma.supplierPerformance.create({
        data: {
          supplierId: params.id,
          period,
          onTimeDelivery: onTimeDelivery ? new Decimal(onTimeDelivery) : null,
          qualityScore: qualityScore ? new Decimal(qualityScore) : null,
          priceCompetitiveness: priceCompetitiveness
            ? new Decimal(priceCompetitiveness)
            : null,
          serviceLevel: serviceLevel ? new Decimal(serviceLevel) : null,
          overallScore: new Decimal(calculatedOverallScore),
          invoiceCount: invoiceCount || 0,
          totalAmount: new Decimal(totalAmount || 0),
          avgProcessingDays: avgProcessingDays
            ? new Decimal(avgProcessingDays)
            : null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...record,
        onTimeDelivery: record.onTimeDelivery ? Number(record.onTimeDelivery) : null,
        qualityScore: record.qualityScore ? Number(record.qualityScore) : null,
        priceCompetitiveness: record.priceCompetitiveness
          ? Number(record.priceCompetitiveness)
          : null,
        serviceLevel: record.serviceLevel ? Number(record.serviceLevel) : null,
        overallScore: Number(record.overallScore),
        totalAmount: Number(record.totalAmount),
        avgProcessingDays: record.avgProcessingDays
          ? Number(record.avgProcessingDays)
          : null,
      },
      message: existingRecord
        ? "Performance record updated"
        : "Performance record created",
    });
  } catch (error) {
    console.error("Error recording supplier performance:", error);
    return NextResponse.json(
      { success: false, error: "Failed to record supplier performance" },
      { status: 500 }
    );
  }
}
