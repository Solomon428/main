import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AuthUtils } from './lib/auth-utils';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Get token from cookies or authorization header
  const cookieToken = request.cookies.get('auth-token')?.value;
  const headerToken = request.headers.get('authorization')?.replace('Bearer ', '');
  const token = cookieToken || headerToken;
  
  // Debug logging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Middleware] ${request.method} ${pathname}`);
    console.log(`[Middleware] Cookie token: ${cookieToken ? 'Present' : 'Missing'}`);
    console.log(`[Middleware] Header token: ${headerToken ? 'Present' : 'Missing'}`);
  }

  // Public paths that don't require authentication
  const publicPaths = [
    '/login', 
    '/api/auth/login', 
    '/api/auth/register', 
    '/api/auth/logout',
    '/api/debug/cookie',  // Required for session check on login page
    '/_next', 
    '/favicon.ico'
  ];
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  if (isPublicPath) {
    return NextResponse.next();
  }

  // Check if user is authenticated
  if (!token) {
    console.log(`[Middleware] No token found, redirecting to login`);
    
    // Redirect to login page for non-API routes
    if (!pathname.startsWith('/api/')) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Return 401 for API routes
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  // Verify token (now async)
  const user = await AuthUtils.verifyToken(token);
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Middleware] Token verification:`, user ? `Valid (${user.email})` : 'Invalid');
  }

  if (!user) {
    console.log(`[Middleware] Token invalid, clearing cookie and redirecting`);
    
    // Clear invalid token and redirect to login
    if (!pathname.startsWith('/api/')) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('auth-token');
      return response;
    }

    return NextResponse.json(
      { success: false, error: 'Invalid or expired token' },
      { status: 401 }
    );
  }

  // Add user info to request headers for downstream use
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', user.id);
  requestHeaders.set('x-user-role', user.role);
  requestHeaders.set('x-user-department', user.department);

  return NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
