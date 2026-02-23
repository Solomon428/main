import { NextRequest, NextResponse } from "next/server";
import { AuthUtils } from "../auth-utils";

export async function authMiddleware(request: NextRequest) {
  const cookieToken = request.cookies.get("auth-token")?.value;
  const headerToken = request.headers
    .get("authorization")
    ?.replace("Bearer ", "");
  const token = cookieToken || headerToken;

  if (!token) {
    return NextResponse.json(
      { error: "Unauthorized: No token provided" },
      { status: 401 }
    );
  }

  try {
    const payload = await AuthUtils.verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid token" },
        { status: 401 }
      );
    }
    return null;
  } catch {
    return NextResponse.json(
      { error: "Unauthorized: Token verification failed" },
      { status: 401 }
    );
  }
}
