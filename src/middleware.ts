import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AuthUtils } from "./lib/auth-utils";

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/session",
  "/api/auth/logout",
  "/api/health",
  "/api/healthcheck",
  "/api/debug/cookie",
  "/uploads",
  "/.well-known",
];

// API routes that require authentication
const PROTECTED_API_ROUTES = [
  "/api/invoices",
  "/api/suppliers",
  "/api/payments",
  "/api/approvals",
  "/api/reconciliations",
  "/api/reports",
  "/api/dashboard",
  "/api/users",
  "/api/settings",
  "/api/integrations",
  "/api/system",
];

// Protected page routes
const PROTECTED_PAGE_ROUTES = [
  "/dashboard",
  "/invoices",
  "/suppliers",
  "/payments",
  "/approvals",
  "/reconciliations",
  "/reports",
  "/settings",
  "/users",
  "/integrations",
];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }
  
  // Check if route is public (no auth required)
  const isPublicRoute = PUBLIC_ROUTES.some(route => 
    pathname === route || pathname.startsWith(route + "/")
  );
  
  // Get token from cookies or authorization header
  const cookieToken = request.cookies.get("auth-token")?.value;
  const headerToken = request.headers
    .get("authorization")
    ?.replace("Bearer ", "");
  const token = cookieToken || headerToken;
  
  // Debug logging (only in development)
  if (process.env.NODE_ENV === "development") {
    const routeType = isPublicRoute ? "Public Route" : "Protected";
    console.log(`[Middleware] ${request.method} ${pathname} - Token: ${token ? "Present" : "Missing"} (${routeType})`);
  }
  
  // Allow access to public routes
  if (isPublicRoute) {
    // If user is already authenticated, redirect from login/register to dashboard
    if (token && (pathname === "/login" || pathname === "/register")) {
      const dashboardUrl = new URL("/dashboard", request.url);
      return NextResponse.redirect(dashboardUrl);
    }
    return NextResponse.next();
  }
  
  // Check if route is a protected API or page route
  const isProtectedApiRoute = PROTECTED_API_ROUTES.some(route => 
    pathname.startsWith(route)
  );
  const isProtectedPageRoute = PROTECTED_PAGE_ROUTES.some(route => 
    pathname === route || pathname.startsWith(route + "/")
  );
  
  // Require authentication for protected routes
  if (isProtectedApiRoute || isProtectedPageRoute) {
    if (!token) {
      // For API routes, return 401 JSON response
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { success: false, error: "Authentication required" },
          { status: 401 },
        );
      }
      
      // For page routes, redirect to login
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    // Verify token
    const user = await AuthUtils.verifyToken(token);
    
    if (!user) {
      // Clear invalid token and redirect to login
      const response = pathname.startsWith("/api/")
        ? NextResponse.json(
            { success: false, error: "Invalid or expired token" },
            { status: 401 },
          )
        : NextResponse.redirect(new URL("/login", request.url));
      
      if (!pathname.startsWith("/api/")) {
        response.cookies.delete("auth-token");
      }
      return response;
    }
    
    // Add user info to request headers for downstream use
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", user.id);
    requestHeaders.set("x-user-role", user.role);
    requestHeaders.set("x-user-department", user.department);
    requestHeaders.set("x-user-org", user.organizationId || "default-org");
    
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }
  
  // All other routes pass through
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
