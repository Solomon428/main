import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/db/prisma";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get user ID from query parameter or header
    const { searchParams } = new URL(request.url);
    const userId =
      searchParams.get("userId") || request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");

    // Get total count
    const total = await prisma.approval.count({
      where: {
        approverId: userId,
        status: "PENDING",
      },
    });

    // Get pending approvals
    const approvals = await prisma.approval.findMany({
      where: {
        approverId: userId,
        status: "PENDING",
      },
      orderBy: { assignedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            supplierName: true,
            totalAmount: true,
            dueDate: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        approvals,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("Error fetching pending approvals:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch approvals" },
      { status: 500 },
    );
  }
}
