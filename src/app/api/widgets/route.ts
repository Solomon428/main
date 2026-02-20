/**
 * Dashboard Widgets API Route
 */

import { NextRequest, NextResponse } from "next/server";
import { WidgetService } from "@/services/widget-service";

// GET: Get all dashboard widgets data
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const widgetId = searchParams.get("widgetId");

    if (widgetId) {
      // Get single widget update
      const widget = await WidgetService.getWidgetUpdate(
        widgetId as never,
        userId || undefined,
      );

      return NextResponse.json({
        success: true,
        data: widget,
      });
    }

    // Get all widgets
    const widgets = await WidgetService.getDashboardWidgets(
      userId || undefined,
    );

    return NextResponse.json({
      success: true,
      data: widgets,
    });
  } catch (error) {
    console.error("Widgets error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get widgets" },
      { status: 500 },
    );
  }
}

// PATCH: Update widget layout (not implemented yet)
export async function PATCH(req: NextRequest) {
  return NextResponse.json(
    { success: false, error: "Widget layout saving not implemented yet" },
    { status: 501 },
  );
}
