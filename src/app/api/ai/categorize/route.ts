/**
 * AI Categorization API Route
 * POST: Categorize single invoice
 * PATCH: Bulk categorize invoices
 * GET: Get category statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { AICategorizationService } from '@/services/ai-categorization-service';
import { prisma } from '../../../lib/prisma';
import { z } from 'zod';

const categorizeSchema = z.object({
  invoiceId: z.string().uuid(),
});

const bulkCategorizeSchema = z.object({
  invoiceIds: z.array(z.string().uuid()).min(1).max(100),
  confidenceThreshold: z.number().min(0).max(1).optional().default(0.7),
});

// POST: Categorize single invoice
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { invoiceId } = categorizeSchema.parse(body);

    const invoice = await prisma.invoices.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }

    const insights = await AICategorizationService.generateInsights(invoice);

    return NextResponse.json({
      success: true,
      data: insights,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    console.error('AI categorization error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to categorize invoice' },
      { status: 500 }
    );
  }
}

// PATCH: Bulk categorize invoices
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { invoiceIds, confidenceThreshold } =
      bulkCategorizeSchema.parse(body);

    const result = await AICategorizationService.autoCategorizeInvoices(
      invoiceIds,
      confidenceThreshold
    );

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

    console.error('Bulk categorization error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to categorize invoices' },
      { status: 500 }
    );
  }
}

// GET: Get category statistics
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    const stats = await AICategorizationService.getCategoryStats(
      startDate,
      endDate
    );

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Category stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get category statistics' },
      { status: 500 }
    );
  }
}
