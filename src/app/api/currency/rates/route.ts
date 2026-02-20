/**
 * Exchange Rates API Route
 */

import { NextRequest, NextResponse } from "next/server";
import { CurrencyService } from "@/services/currency-service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") || "USD";
    const to = searchParams.get("to") || "ZAR";

    const rate = await CurrencyService.getExchangeRate(
      from as never,
      to as never,
    );

    return NextResponse.json({
      success: true,
      data: {
        from,
        to,
        rate,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Exchange rate error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch exchange rate" },
      { status: 500 },
    );
  }
}
