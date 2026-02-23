import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const status = searchParams.get("status");
    const supplierName = searchParams.get("supplierName");

    const where: any = {};
    if (status) where.status = status;
    if (supplierName) where.supplier = { name: { contains: supplierName, mode: "insensitive" } };

    const total = await prisma.invoice.count({ where });
    const invoices = await prisma.invoice.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { supplier: true },
      orderBy: { createdAt: "desc" },
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
    const invoice = await prisma.invoice.create({ data: body });
    return NextResponse.json({ success: true, data: invoice }, { status: 201 });
  } catch (error) {
    console.error("POST /api/invoices error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
