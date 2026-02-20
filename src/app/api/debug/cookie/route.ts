import { NextRequest, NextResponse } from "next/server";
import { AuthUtils } from "@/lib/auth-utils";

export async function GET(request: NextRequest) {
  try {
    const cookie = request.cookies.get("auth-token")?.value ?? null;
    const verified = cookie ? !!(await AuthUtils.verifyToken(cookie)) : false;

    return NextResponse.json({
      success: true,
      cookie,
      verified,
    });
  } catch (err) {
    console.error("Debug cookie error:", err);
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 },
    );
  }
}
