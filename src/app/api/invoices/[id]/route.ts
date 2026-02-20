import { NextRequest, NextResponse } from "next/server";
import { InvoiceService } from "@/services/invoice-service";
import { prisma } from "../../../../lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const invoice = await InvoiceService.getInvoiceById(params.id);

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: "Invoice not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch invoice" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json();
    const { status, userId, reason } = body;

    if (!status || !userId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: status, userId" },
        { status: 400 },
      );
    }

    const success = await InvoiceService.updateInvoiceStatus(
      params.id,
      status,
      userId,
      reason,
    );

    if (!success) {
      return NextResponse.json(
        { success: false, error: "Failed to update invoice status" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Invoice status updated successfully",
    });
  } catch (error) {
    console.error("Error updating invoice:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update invoice" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: userId" },
        { status: 400 },
      );
    }

    await prisma.invoices.update({
      where: { id: params.id },
      data: {
        status: "CANCELLED",
        archivedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Invoice cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling invoice:", error);
    return NextResponse.json(
      { success: false, error: "Failed to cancel invoice" },
      { status: 500 },
    );
  }
}
