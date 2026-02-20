import { NextRequest, NextResponse } from "next/server";
import { ApprovalService } from "@/services/approval-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: userId" },
        { status: 400 },
      );
    }

    const result = await ApprovalService.getApprovalHistory(
      userId,
      page,
      pageSize,
    );

    return NextResponse.json({
      success: true,
      data: result.approvals,
      total: result.total,
      page,
      pageSize,
      totalPages: Math.ceil(result.total / pageSize),
    });
  } catch (error) {
    console.error("Error fetching approval history:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch approval history" },
      { status: 500 },
    );
  }
}
