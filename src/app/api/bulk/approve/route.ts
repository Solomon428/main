/**
 * Bulk Approve API Route
 */

import { NextRequest, NextResponse } from "next/server";
import { BulkOperationsService } from "@/services/bulk-operations-service";
import { z } from "zod";

const bulkApproveSchema = z.object({
  invoiceIds: z.array(z.string()).min(1).max(100),
  approverId: z.string(),
  comments: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { invoiceIds, approverId, comments } = bulkApproveSchema.parse(body);

    const result = await BulkOperationsService.bulkApprove({
      invoiceIds,
      approverId,
      comments,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid request", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Bulk approve error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to bulk approve" },
      { status: 500 },
    );
  }
}
