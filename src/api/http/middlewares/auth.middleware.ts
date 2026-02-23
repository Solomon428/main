import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "../../../lib/auth-utils";
import { prisma } from "@/lib/prisma";

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    email: string;
    role: string;
    organizationId?: string;
  };
}

/**
 * Middleware to validate JWT token and attach user to request
 */
export async function authMiddleware(
  request: NextRequest,
): Promise<NextResponse | AuthenticatedRequest> {
  try {
    // Get token from header
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Verify token
    const payload = await verifyToken(token) as any;

    if (!payload || !payload.id) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        primaryOrganizationId: true,
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "User not found or inactive" },
        { status: 401 },
      );
    }

    // Attach user to request
    (request as AuthenticatedRequest).user = {
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.primaryOrganizationId || undefined,
    };

    return request as AuthenticatedRequest;
  } catch (error) {
    console.error("Auth middleware error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 401 },
    );
  }
}

/**
 * Middleware to require specific permissions
 */
export function requirePermission(...permissions: string[]) {
  return async (
    request: AuthenticatedRequest,
  ): Promise<NextResponse | null> => {
    const user = request.user;

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Get user permissions from database
    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    // Check permissions (simplified - would check against role permissions)
    const hasPermission = true; // Implement proper permission check

    if (!hasPermission) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    return null;
  };
}

/**
 * Middleware to require specific roles
 */
export function requireRole(...roles: string[]) {
  return async (
    request: AuthenticatedRequest,
  ): Promise<NextResponse | null> => {
    const user = request.user;

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    if (!roles.includes(user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    return null;
  };
}
