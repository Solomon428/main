import { NextRequest, NextResponse } from "next/server";
import { ApprovalService } from "@/services/approval-service";
import { ApprovalDecision } from "@/types";

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

    // Get userId from request headers (set by middleware)
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const result = await ApprovalService.submitDecision({
      approvalId,
      decision: decision as ApprovalDecision,
      userId,
      comments,
      ipAddress:
        request.headers.get("x-forwarded-for") || request.ip || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      nextStage: result.nextStage,
      fullyApproved: result.fullyApproved,
    });
  } catch (error) {
    console.error("Error processing approval:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process approval" },
      { status: 500 },
    );
  }
}
