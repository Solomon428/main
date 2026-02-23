import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseInvoiceStatusFilter } from '@/utils/invoice-status';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const statusParam = searchParams.get('status');
    const supplierName = searchParams.get('supplierName');

    // Build where clause with proper status handling
    let where: any = {};
    if (statusParam) {
      const statuses = parseInvoiceStatusFilter(statusParam);
      if (statuses.length > 0) {
        // Cast to Prisma InvoiceStatus[] to satisfy TS typings
        where.status = { in: statuses as unknown as import('@prisma/client').InvoiceStatus[] } as any;
      }
    }
    if (supplierName) where.supplier = { name: { contains: supplierName, mode: 'insensitive' } };

    const total = await prisma.invoice.count({ where });
    const invoices = await prisma.invoice.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { supplier: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: invoices,
      pagination: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    console.error("GET /api/invoices error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    // Determine organizationId for the new invoice
    const organizationId = (body as any).organizationId ?? (body as any).organization?.id;
    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      );
    }

    const invoiceData: any = {
      invoiceNumber: body.invoiceNumber,
      supplierId: body.supplierId,
      amount: body.amount,
      currency: body.currency || 'ZAR',
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      issueDate: body.issueDate ? new Date(body.issueDate) : null,
      status: body.status || 'PENDING',
      organizationId: organizationId,
    };

    const invoice = await prisma.invoice.create({ data: invoiceData });
    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error("POST /api/invoices error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
