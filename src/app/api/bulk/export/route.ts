/**
 * Bulk Export API Route
 */

import { NextRequest, NextResponse } from "next/server";
import { BulkOperationsService } from "@/services/bulk-operations-service";
import { z } from "zod";

const bulkExportSchema = z.object({
  invoiceIds: z.array(z.string()).min(1).max(500),
  format: z.enum(["csv", "xlsx", "pdf"]),
  includeLineItems: z.boolean().optional().default(true),
  includeApprovals: z.boolean().optional().default(false),
  columns: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = bulkExportSchema.parse(body);

    const result = await BulkOperationsService.bulkExport(data);

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

    console.error("Bulk export error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to export" },
      { status: 500 },
    );
  }
}
