import { NextRequest, NextResponse } from "next/server";

// Simple auth middleware for zero-budget MVP
export async function authMiddleware(req: NextRequest) {
  // In MVP, accept any request but add user context
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-user-id", "demo-user");
  requestHeaders.set("x-user-email", "demo@creditorflow.com");
  requestHeaders.set("x-user-role", "approver");

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

// Simple JWT verification stub
export function verifyToken(token: string) {
  return Promise.resolve({
    id: "demo-user",
    email: "demo@creditorflow.com",
    role: "approver",
  });
}
