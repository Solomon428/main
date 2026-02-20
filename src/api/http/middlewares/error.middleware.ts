import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

interface ErrorResponse {
  error: string;
  message: string;
  code?: string;
  details?: unknown;
  stack?: string;
}

/**
 * Format error for API response
 */
export function formatError(error: unknown): NextResponse<ErrorResponse> {
  console.error("API Error:", error);

  // Zod validation error
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Validation Error",
        message: "Request validation failed",
        code: "VALIDATION_ERROR",
        details: error.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        })),
      },
      { status: 400 },
    );
  }

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(error);
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return NextResponse.json(
      {
        error: "Database Error",
        message: "Invalid data provided",
        code: "DATABASE_VALIDATION_ERROR",
      },
      { status: 400 },
    );
  }

  // Standard Error
  if (error instanceof Error) {
    const statusCode = getStatusCode(error);

    return NextResponse.json(
      {
        error: error.name || "Error",
        message: error.message,
        code: getErrorCode(error),
        ...(process.env.NODE_ENV === "development" && {
          stack: error.stack,
        }),
      },
      { status: statusCode },
    );
  }

  // Unknown error
  return NextResponse.json(
    {
      error: "Internal Server Error",
      message: "An unexpected error occurred",
      code: "INTERNAL_ERROR",
    },
    { status: 500 },
  );
}

/**
 * Handle Prisma-specific errors
 */
function handlePrismaError(
  error: Prisma.PrismaClientKnownRequestError,
): NextResponse<ErrorResponse> {
  switch (error.code) {
    case "P2002":
      return NextResponse.json(
        {
          error: "Conflict",
          message: "A record with this value already exists",
          code: "UNIQUE_CONSTRAINT_VIOLATION",
          details: error.meta,
        },
        { status: 409 },
      );

    case "P2003":
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "Related record not found",
          code: "FOREIGN_KEY_CONSTRAINT_VIOLATION",
        },
        { status: 400 },
      );

    case "P2025":
      return NextResponse.json(
        {
          error: "Not Found",
          message: "Record not found",
          code: "RECORD_NOT_FOUND",
        },
        { status: 404 },
      );

    case "P2014":
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "Invalid relation data",
          code: "RELATION_VIOLATION",
        },
        { status: 400 },
      );

    default:
      return NextResponse.json(
        {
          error: "Database Error",
          message: "A database error occurred",
          code: `PRISMA_${error.code}`,
        },
        { status: 500 },
      );
  }
}

/**
 * Get HTTP status code from error
 */
function getStatusCode(error: Error): number {
  const statusCodes: Record<string, number> = {
    UnauthorizedError: 401,
    ForbiddenError: 403,
    NotFoundError: 404,
    ConflictError: 409,
    ValidationError: 400,
    BadRequestError: 400,
  };

  return statusCodes[error.name] || 500;
}

/**
 * Get error code from error
 */
function getErrorCode(error: Error): string {
  return error.name?.toUpperCase().replace(/ERROR$/, "") || "UNKNOWN";
}

// Custom error classes
export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends Error {
  constructor(message = "Conflict") {
    super(message);
    this.name = "ConflictError";
  }
}

export class ValidationError extends Error {
  constructor(message = "Validation failed") {
    super(message);
    this.name = "ValidationError";
  }
}
