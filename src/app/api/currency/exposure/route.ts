/**
 * Currency Exposure API Route
 */

import { NextRequest, NextResponse } from 'next/server';
import { CurrencyService } from '@/services/currency-service';
import { InvoiceStatus } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const statusStr = searchParams.get('status');

    const filters: {
      startDate?: Date;
      endDate?: Date;
      status?: string[];
    } = {};

    if (startDateStr) {
      filters.startDate = new Date(startDateStr);
    }

    if (endDateStr) {
      filters.endDate = new Date(endDateStr);
    }

    if (statusStr) {
      filters.status = statusStr.split(',') as InvoiceStatus[];
    }

    const exposure = await CurrencyService.calculateCurrencyExposure(filters);

    return NextResponse.json({
      success: true,
      data: exposure,
    });
  } catch (error) {
    console.error('Currency exposure error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate currency exposure' },
      { status: 500 }
    );
  }
}
