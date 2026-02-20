/**
 * Search Suggestions API Route
 */

import { NextRequest, NextResponse } from "next/server";
import { AdvancedSearchService } from "@/services/advanced-search-service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const limit = parseInt(searchParams.get("limit") || "10");

    if (query.length < 2) {
      return NextResponse.json({
        success: true,
        data: { suggestions: [], recentSearches: [], popularSearches: [] },
      });
    }

    const suggestions = await AdvancedSearchService.getSuggestions(
      query,
      limit,
    );

    return NextResponse.json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    console.error("Suggestions error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get suggestions" },
      { status: 500 },
    );
  }
}
