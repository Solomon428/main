import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export type AuthenticatedRequest = NextRequest & {
  user?: {
    id: string;
    email: string;
    name?: string;
    organizationId: string;
    role?: string;
  };
};

/**
 * JWT authentication middleware for Next.js API routes
 * Usage: export async function GET(req: AuthenticatedRequest) { ... }
 * Wrap your handler with this function.
 */
export async function authenticate(
  req: AuthenticatedRequest
): Promise<{ user: NonNullable<AuthenticatedRequest['user']> } | NextResponse> {
  try {
    const authHeader = req.headers.get('authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    if (!token) {
      return NextResponse.json(
        { error: 'Token not provided' },
        { status: 401 }
      );
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('JWT_SECRET not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const decoded = verify(token, jwtSecret) as {
      userId: string;
      email: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        primaryOrganizationId: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      );
    }

    // Attach user to request object
    (req as AuthenticatedRequest).user = {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
      organizationId: user.primaryOrganizationId || '',
      role: user.role || undefined,
    };

    // Return user data for convenience
    return { user: req.user! };
  } catch (error) {
    logger.error({ error }, 'Authentication failed');
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }
}

/**
 * Higher-order function to protect API routes with authentication.
 * Example: export const GET = withAuth(async (req) => { ... })
 */
export function withAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse> | NextResponse
) {
  return async (req: AuthenticatedRequest): Promise<NextResponse> => {
    const authResult = await authenticate(req);
    if (authResult instanceof NextResponse) {
      return authResult; // error response
    }
    // authentication succeeded, call handler
    return handler(req);
  };
}

/**
 * Require specific role middleware (to be used inside handler after authenticate)
 */
export function requireRole(allowedRoles: string[], user?: AuthenticatedRequest['user']) {
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }
  if (!allowedRoles.includes(user.role || '')) {
    return NextResponse.json(
      { error: 'Insufficient permissions' },
      { status: 403 }
    );
  }
  return null; // success
}

export const requireAuth = withAuth;

/**
 * Optional authentication for API routes (does not fail if no token)
 */
export async function optionalAuth(
  req: AuthenticatedRequest
): Promise<{ user?: AuthenticatedRequest['user'] }> {
  try {
    const authHeader = req.headers.get('authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return {};
    }

    const token = authHeader.substring(7);

    if (!token) {
      return {};
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return {};
    }

    const decoded = verify(token, jwtSecret) as {
      userId: string;
      email: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        primaryOrganizationId: true,
        role: true,
      },
    });

    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        organizationId: user.primaryOrganizationId || '',
        role: user.role || undefined,
      };
    }

    return { user: req.user };
  } catch {
    // Silently fail for optional auth
    return {};
  }
}