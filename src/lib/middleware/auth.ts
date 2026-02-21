import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  const { pathname } = req.nextUrl;

  // Define public paths that don't require authentication
  const isPublicPath = pathname === "/login" || pathname.startsWith("/api/auth");

  // Protected paths require a valid token
  const isProtectedPath = pathname.startsWith("/dashboard") || pathname.startsWith("/api/");

  // If the path is protected and no token, redirect to login
  if (isProtectedPath && !isPublicPath && !token) {
    const loginUrl = new URL("/login", req.url);
    // Preserve the original destination to redirect back after login
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If user is already authenticated and tries to access login page, redirect to dashboard
  if (token && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Attach user info to headers for downstream API routes / server components
  const requestHeaders = new Headers(req.headers);
  if (token) {
    requestHeaders.set("x-user-id", token.sub as string);
    requestHeaders.set("x-user-email", token.email as string);
    requestHeaders.set("x-user-role", token.role as string);
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const authMiddleware = middleware;

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * Also exclude NextAuth API routes (they handle their own auth)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
