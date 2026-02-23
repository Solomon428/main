import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json();
    const { approvalId, decision, comments } = body;

    if (!approvalId || !decision) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: approvalId, decision",
        },
        { status: 400 },
      );
    }

    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const approval = await prisma.approval.findUnique({
      where: { id: approvalId },
      include: { invoice: true },
    });

    if (!approval) {
      return NextResponse.json(
        { success: false, error: "Approval not found" },
        { status: 404 },
      );
    }

    const updatedApproval = await prisma.approval.update({
      where: { id: approvalId },
      data: {
        status: decision as any,
        decisionNotes: comments,
        decision: decision as any,
        approvedAt: decision === "APPROVED" ? new Date() : null,
        rejectedAt: decision === "REJECTED" ? new Date() : null,
      } as any,
    });

    const invoiceStatus = decision === "APPROVED" ? "APPROVED" : "REJECTED";
    await prisma.invoice.update({
      where: { id: approval.invoiceId },
      data: {
        status: invoiceStatus as any,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Invoice ${decision.toLowerCase()} successfully`,
    });
  } catch (error) {
    console.error("Error processing approval:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process approval" },
      { status: 500 },
    );
  }
}
