// src/app/api/suppliers/[id]/performance/route.ts
// Supplier Performance Analytics & KPI Tracking

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

interface RouteContext {
  params: { id: string };
}

// GET /api/suppliers/[id]/performance
export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: 'AUTH_001', message: 'Authentication required' } }, { status: 401 });
    }

    const { id: supplierId } = context.params;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '12'; // months
    const periodMonths = parseInt(period, 10);

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - periodMonths);

    // Fetch supplier
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { id: true, name: true, supplierCode: true, status: true, createdAt: true },
    });

    if (!supplier) {
      return NextResponse.json({ success: false, error: { code: 'SUP_001', message: 'Supplier not found' } }, { status: 404 });
    }

    // Calculate metrics in parallel
    const [
      invoiceMetrics,
      paymentMetrics,
      complianceMetrics,
      qualityMetrics,
      performanceRecords,
    ] = await Promise.all([
      // Invoice metrics
      prisma.invoice.aggregate({
        where: { supplierId, createdAt: { gte: startDate }, deletedAt: null },
        _count: { id: true },
        _sum: { totalAmount: true },
        _avg: { totalAmount: true },
      }),

      // Payment timing metrics
      prisma.payment.aggregate({
        where: {
          invoice: { supplierId },
          createdAt: { gte: startDate },
          status: 'PAID',
        },
        _count: { id: true },
        _sum: { amount: true },
      }),

      // Compliance rate
      prisma.complianceCheck.aggregate({
        where: {
          invoice: { supplierId },
          createdAt: { gte: startDate },
          status: 'COMPLIANT',
        },
        _count: { id: true },
      }),

      // Quality metrics (rejection rate)
      prisma.invoice.aggregate({
        where: {
          supplierId,
          createdAt: { gte: startDate },
          status: 'REJECTED',
        },
        _count: { id: true },
      }),

      // Historical performance records
      prisma.supplierPerformance.findMany({
        where: {
          supplierId,
          period: { gte: String(startDate.getFullYear()) + '-' + String(startDate.getMonth() + 1).padStart(2, '0') },
        },
        orderBy: { period: 'desc' },
        take: 12,
      }),
    ]);

    // Calculate KPIs
    const totalInvoices = invoiceMetrics._count.id || 0;
    const rejectedInvoices = qualityMetrics._count.id || 0;
    const acceptanceRate = totalInvoices > 0 ? ((totalInvoices - rejectedInvoices) / totalInvoices) * 100 : 100;
    
    const totalCompliance = await prisma.complianceCheck.count({
      where: { invoice: { supplierId }, createdAt: { gte: startDate } },
    });
    const complianceRate = totalCompliance > 0 ? ((complianceMetrics?._count?.id ?? 0) / totalCompliance) * 100 : 100;

    // Calculate average payment delay
    const paymentsWithDelay = await prisma.$queryRaw<Array<{ avgDelay: number }>>`
      SELECT AVG(EXTRACT(DAY FROM (p."paymentDate" - i."dueDate"))) as "avgDelay"
      FROM "payments" p
      JOIN "invoices" i ON p."invoiceId" = i.id
      WHERE i."supplierId" = ${supplierId}
        AND p."paymentDate" IS NOT NULL
        AND p."createdAt" >= ${startDate}
        AND p.status = 'PAID'
    `;
    const avgPaymentDelay = paymentsWithDelay[0]?.avgDelay || 0;

    // Calculate overall score (weighted)
    const overallScore = (
      (acceptanceRate * 0.35) + 
      (complianceRate * 0.30) +
      (Math.max(0, 100 - (avgPaymentDelay * 2)) * 0.20) +
      (supplier.status === 'ACTIVE' ? 15 : 0)
    );

    const performance = {
      supplierId,
      supplierName: supplier.name,
      period: `${periodMonths} months`,
      startDate,
      endDate: new Date(),
      
      // Overall metrics
      overallScore: Math.round(overallScore * 10) / 10,
      rating: overallScore >= 90 ? 'EXCELLENT' : overallScore >= 75 ? 'GOOD' : overallScore >= 60 ? 'AVERAGE' : 'POOR',
      
      // Invoice metrics
      invoiceMetrics: {
        totalInvoices,
        totalValue: Number(invoiceMetrics._sum.totalAmount || 0),
        avgInvoiceValue: Number(invoiceMetrics._avg.totalAmount || 0),
        rejectedInvoices,
        acceptanceRate: Math.round(acceptanceRate * 10) / 10,
      },
      
      // Payment metrics
      paymentMetrics: {
        totalPayments: paymentMetrics._count.id || 0,
        totalPaid: Number(paymentMetrics._sum.amount || 0),
        avgPaymentDelay: Math.round(avgPaymentDelay * 10) / 10,
        onTimePaymentRate: avgPaymentDelay <= 0 ? 100 : Math.max(0, 100 - (avgPaymentDelay * 5)),
      },
      
      // Compliance metrics
      complianceMetrics: {
        totalChecks: totalCompliance,
        passedChecks: complianceMetrics?._count?.id ?? 0,
        complianceRate: Math.round(complianceRate * 10) / 10,
      },
      
      // Historical trends
      historicalData: performanceRecords.map(record => ({
        period: record.period,
        score: record.overallScore,
        onTimeDeliveryRate: record.onTimeDelivery,
        qualityScore: record.qualityScore,
        invoiceCount: record.invoiceCount,
        totalAmount: Number(record.totalAmount),
      })),
    };

    return NextResponse.json({
      success: true,
      data: { performance },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[GET /api/suppliers/[id]/performance] Error:', error);
    return NextResponse.json({ success: false, error: { code: 'SYS_001', message: 'Internal server error' } }, { status: 500 });
  }
}

// POST /api/suppliers/[id]/performance
// Record new performance period
export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: 'AUTH_001', message: 'Authentication required' } }, { status: 401 });
    }

    const { id: supplierId } = context.params;
    const body = await request.json();

    const performance = await prisma.supplierPerformance.create({
      data: {
        supplierId,
        period: body.period || new Date().toISOString().slice(0, 7),
        onTimeDelivery: body.onTimeDeliveryRate || 0,
        qualityScore: body.qualityScore || 0,
        overallScore: body.performanceScore || body.overallScore || 0,
        invoiceCount: body.invoiceCount || body.totalInvoices || 0,
        totalAmount: body.totalAmount || body.totalValue || 0,
        avgProcessingDays: body.avgProcessingDays || body.responseTime || 0,
        priceCompetitiveness: body.priceCompetitiveness || 0,
        serviceLevel: body.serviceLevel || 0,
      },
    });

    return NextResponse.json({
      success: true,
      data: { performance },
      timestamp: new Date().toISOString(),
    }, { status: 201 });

  } catch (error) {
    console.error('[POST /api/suppliers/[id]/performance] Error:', error);
    return NextResponse.json({ success: false, error: { code: 'SYS_001', message: 'Internal server error' } }, { status: 500 });
  }
}
