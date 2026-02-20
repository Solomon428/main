import { Request, Response, NextFunction } from "express";
import { verify } from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name?: string;
        organizationId: string;
        role?: string;
      };
    }
  }
}

/**
 * JWT authentication middleware
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return next(new AppError("Authentication required", "UNAUTHORIZED", 401));
    }

    const token = authHeader.substring(7);

    if (!token) {
      return next(new AppError("Token not provided", "UNAUTHORIZED", 401));
    }

    // Verify JWT
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error("JWT_SECRET not configured");
      return next(
        new AppError("Server configuration error", "CONFIG_ERROR", 500),
      );
    }

    const decoded = verify(token, jwtSecret) as {
      userId: string;
      email: string;
    };

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        organizationId: true,
        role: true,
      },
    });

    if (!user) {
      return next(new AppError("User not found", "UNAUTHORIZED", 401));
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
      organizationId: user.organizationId,
      role: user.role || undefined,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }

    logger.error({ error }, "Authentication failed");
    return next(new AppError("Invalid or expired token", "UNAUTHORIZED", 401));
  }
}

/**
 * Require authentication middleware
 * Ensures req.user is set (must be used after authenticate)
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    return next(new AppError("Authentication required", "UNAUTHORIZED", 401));
  }
  next();
}

/**
 * Require specific role middleware
 */
export function requireRole(allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("Authentication required", "UNAUTHORIZED", 401));
    }

    if (!allowedRoles.includes(req.user.role || "")) {
      return next(new AppError("Insufficient permissions", "FORBIDDEN", 403));
    }

    next();
  };
}

/**
 * Optional authentication middleware
 * Sets req.user if token is valid, but doesn't require it
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.substring(7);

    if (!token) {
      return next();
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return next();
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
        organizationId: true,
        role: true,
      },
    });

    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        organizationId: user.organizationId,
        role: user.role || undefined,
      };
    }

    next();
  } catch {
    // Silently fail for optional auth
    next();
  }
}
