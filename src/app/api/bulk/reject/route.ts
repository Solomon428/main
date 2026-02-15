/**
 * Bulk Reject API Route
 */

import { NextRequest, NextResponse } from 'next/server';
import { BulkOperationsService } from '@/services/bulk-operations-service';
import { z } from 'zod';

const bulkRejectSchema = z.object({
  invoiceIds: z.array(z.string()).min(1).max(100),
  approverId: z.string(),
  reason: z.string().min(1).max(1000),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { invoiceIds, approverId, reason } = bulkRejectSchema.parse(body);

    const result = await BulkOperationsService.bulkReject({
      invoiceIds,
      approverId,
      reason,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Bulk reject error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to bulk reject' },
      { status: 500 }
    );
  }
}
