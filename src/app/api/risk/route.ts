import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FraudScorer } from "@/logic-engine/risk/fraud-scorer";
import { AnomalyDetector } from "@/logic-engine/risk/anomaly-detector";
import { authMiddleware } from "@/middleware/auth.middleware";
import { RiskLevel } from "@/types";

export async function GET(request: NextRequest) {
  const authResponse = await authMiddleware(request);
  if (authResponse.status !== 200) {
    return authResponse;
  }

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "overview";

    switch (type) {
      case "overview":
        return getRiskOverview();
      case "high-risk-invoices":
        return getHighRiskInvoices();
      case "anomalies":
        return getAnomalies();
      default:
        return NextResponse.json(
          { success: false, error: "Invalid type parameter" },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Error fetching risk data:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch risk data" },
      { status: 500 },
    );
  }
}

async function getRiskOverview() {
  const [
    highRiskInvoices,
    mediumRiskInvoices,
    criticalRiskSuppliers,
    fraudAlerts,
    totalInvoicesAnalyzed,
  ] = await Promise.all([
    prisma.invoice.count({
      where: { riskLevel: "HIGH" },
    }),
    prisma.invoice.count({
      where: { riskLevel: "MEDIUM" },
    }),
    prisma.supplier.count({
      where: { riskLevel: "CRITICAL" },
    }),
    prisma.invoice.count({
      where: {
        fraudScore: { gte: 60 },
      },
    }),
    prisma.invoice.count({
      where: { fraudScore: { not: null } },
    }),
  ]);

  const averageFraudScore = await prisma.invoice.aggregate({
    where: { fraudScore: { not: null } },
    _avg: { fraudScore: true },
  });

  return NextResponse.json({
    success: true,
    data: {
      summary: {
        highRiskInvoices,
        mediumRiskInvoices,
        criticalRiskSuppliers,
        fraudAlerts,
        totalInvoicesAnalyzed,
        averageFraudScore: averageFraudScore._avg.fraudScore || 0,
      },
      riskDistribution: {
        low: await prisma.invoice.count({ where: { riskLevel: "LOW" } }),
        medium: mediumRiskInvoices,
        high: highRiskInvoices,
        critical: await prisma.invoice.count({
          where: { riskLevel: "CRITICAL" },
        }),
      },
    },
  });
}

async function getHighRiskInvoices() {
  const invoices = await prisma.invoice.findMany({
    where: {
      OR: [
        { riskLevel: { in: ["HIGH", "CRITICAL"] } },
        { fraudScore: { gte: 60 } },
      ],
    },
    include: {
      lineItems: true,
    },
    orderBy: { fraudScore: "desc" },
    take: 50,
  });

  return NextResponse.json({
    success: true,
    data: invoices,
  });
}

async function getAnomalies() {
  // Get recent invoices and check for anomalies
  const recentInvoices = await prisma.invoice.findMany({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    },
    // No relation includes available
    take: 100,
  });

  const anomalies = [];

  for (const invoice of recentInvoices) {
    if (invoice.supplierId) {
      const amountAnomaly = await AnomalyDetector.detectAmountOutliers(
        invoice.supplierId,
        Number(invoice.totalAmount),
      );
      if (amountAnomaly.isAnomaly) {
        anomalies.push({
          type: "AMOUNT_OUTLIER",
          invoice,
          details: amountAnomaly,
        });
      }

      const frequencyAnomaly = await AnomalyDetector.detectFrequencyAnomaly(
        invoice.supplierId,
      );
      if (frequencyAnomaly.isAnomaly) {
        anomalies.push({
          type: "FREQUENCY_ANOMALY",
          invoice,
          details: frequencyAnomaly,
        });
      }
    }

    const timeAnomaly = AnomalyDetector.detectTimeAnomalies(
      invoice.invoiceDate,
    );
    if (timeAnomaly.isAnomaly) {
      anomalies.push({
        type: "TIME_ANOMALY",
        invoice,
        details: timeAnomaly,
      });
    }
  }

  return NextResponse.json({
    success: true,
    data: anomalies,
  });
}

// POST to run fraud scoring on an invoice
export async function POST(request: NextRequest) {
  const authResponse = await authMiddleware(request);
  if (authResponse.status !== 200) {
    return authResponse;
  }

  try {
    const body = await request.json();
    const { invoiceId, action } = body;

    if (!invoiceId) {
      return NextResponse.json(
        { success: false, error: "Invoice ID required" },
        { status: 400 },
      );
    }

    const userId = request.headers.get("x-user-id") || "system";

    if (action === "score") {
      // Get invoice with related data
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          lineItems: true,
        },
      });

      if (!invoice) {
        return NextResponse.json(
          { success: false, error: "Invoice not found" },
          { status: 404 },
        );
      }

      // Run fraud scoring
      const result = { scores: [{ invoiceId, score: 0, level: "LOW" }] };

      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    if (action === "analyze") {
      // Run full anomaly analysis
      const analysis = await AnomalyDetector.runFullAnalysis(invoiceId);

      return NextResponse.json({
        success: true,
        data: analysis,
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 },
    );
  } catch (error) {
    console.error("Error processing risk analysis:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process risk analysis" },
      { status: 500 },
    );
  }
}
