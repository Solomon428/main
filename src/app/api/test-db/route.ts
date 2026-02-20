import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Check what properties are available
    const properties = Object.keys(prisma).filter(
      (k) => !k.startsWith("_") && !k.startsWith("$"),
    );

    // Try to count invoices
    const count = await prisma.invoices.count();

    return NextResponse.json({
      success: true,
      availableModels: properties.slice(0, 10),
      invoiceCount: count,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
