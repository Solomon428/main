/**
 * Currency Conversion API Route
 */

import { NextRequest, NextResponse } from 'next/server';
import { CurrencyService } from '@/services/currency-service';
import { z } from 'zod';

const convertSchema = z.object({
  amount: z.number().positive(),
  from: z.string().length(3),
  to: z.string().length(3),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, from, to } = convertSchema.parse(body);

    const result = await CurrencyService.convert(
      amount,
      from as never,
      to as never
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

    console.error('Currency conversion error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to convert currency' },
      { status: 500 }
    );
  }
}
