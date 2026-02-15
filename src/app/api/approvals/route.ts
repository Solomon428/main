import { NextRequest, NextResponse } from "next/server";
import { ApprovalService } from "@/lib/services";

const DEFAULT_ORG_ID = "default-org-id";
const DEFAULT_USER_ID = "default-user-id";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 20;

    const service = new ApprovalService({
      userId: DEFAULT_USER_ID,
      organizationId: DEFAULT_ORG_ID,
    });

    if (status === "PENDING") {
      const result = await service.findPendingApprovals(page, limit);
      return NextResponse.json({
        success: true,
        data: result.approvals,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    }

    const stats = await service.getStats();
    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching approvals:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch approvals" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const service = new ApprovalService({
      userId: DEFAULT_USER_ID,
      organizationId: DEFAULT_ORG_ID,
    });

    if (body.decision) {
      const approval = await service.processApproval({
        approvalId: body.approvalId,
        decision: body.decision,
        notes: body.notes,
      });
      return NextResponse.json({
        success: true,
        data: approval,
        message: `Approval ${body.decision.toLowerCase()}ed successfully`,
      });
    }

    const approval = await service.submitForApproval({
      invoiceId: body.invoiceId,
      notes: body.notes,
    });

    return NextResponse.json({
      success: true,
      data: approval,
      message: "Invoice submitted for approval",
    }, { status: 201 });
  } catch (error) {
    console.error("Error processing approval:", error);
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to process approval" },
      { status: 500 }
    );
  }
}
