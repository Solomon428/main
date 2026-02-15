import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get basic stats
    const [
      totalInvoices,
      pendingInvoices,
      approvedInvoices,
      paidInvoices,
      overdueInvoices,
      totalSuppliers,
      recentInvoices,
    ] = await Promise.all([
      prisma.invoices.count(),
      prisma.invoices.count({
        where: {
          status: { in: ['PENDING_EXTRACTION', 'PENDING_APPROVAL', 'UNDER_REVIEW'] },
        },
      }),
      prisma.invoices.count({
        where: { status: 'APPROVED' },
      }),
      prisma.invoices.count({
        where: { status: 'PAID' },
      }),
      prisma.invoices.count({
        where: {
          status: { notIn: ['PAID', 'CANCELLED'] },
          dueDate: { lt: new Date() },
        },
      }),
      prisma.suppliers.count(),
      prisma.invoices.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          invoiceNumber: true,
          supplierName: true,
          totalAmount: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    // Calculate total amounts
    const invoices = await prisma.invoices.findMany({
      select: { totalAmount: true, status: true },
    });

    const totalAmount = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const pendingAmount = invoices
      .filter(inv => ['PENDING_EXTRACTION', 'PENDING_APPROVAL'].includes(inv.status))
      .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalInvoices,
          pendingInvoices,
          approvedInvoices,
          paidInvoices,
          overdueInvoices,
          totalSuppliers,
          totalAmount,
          pendingAmount,
        },
        recentInvoices,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
