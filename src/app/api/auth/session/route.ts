import { NextRequest, NextResponse } from "next/server";
import { AuthUtils } from "@/lib/auth-utils";

export async function GET(request: NextRequest) {
  try {
    const cookieToken = request.cookies.get("auth-token")?.value;
    const headerToken = request.headers
      .get("authorization")
      ?.replace("Bearer ", "");
    const token = cookieToken || headerToken;

    if (!token) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const user = await AuthUtils.verifyToken(token);

    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          department: user.department,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[Session API] Error:", error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
