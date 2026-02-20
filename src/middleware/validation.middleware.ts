import { Request, Response, NextFunction } from "express";
import { z, ZodError, ZodSchema } from "zod";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * Middleware to validate request body against a Zod schema
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.body);

      if (!result.success) {
        const formattedErrors = formatZodError(result.error);
        logger.warn(
          { errors: formattedErrors, body: req.body },
          "Body validation failed",
        );

        return next(
          new AppError(
            `Validation error: ${formattedErrors.join(", ")}`,
            "VALIDATION_ERROR",
            400,
            formattedErrors,
          ),
        );
      }

      // Replace req.body with validated data
      req.body = result.data;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware to validate query parameters against a Zod schema
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.query);

      if (!result.success) {
        const formattedErrors = formatZodError(result.error);
        logger.warn(
          { errors: formattedErrors, query: req.query },
          "Query validation failed",
        );

        return next(
          new AppError(
            `Query validation error: ${formattedErrors.join(", ")}`,
            "VALIDATION_ERROR",
            400,
            formattedErrors,
          ),
        );
      }

      // Replace req.query with validated data
      req.query = result.data as Record<string, unknown>;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware to validate route parameters against a Zod schema
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.params);

      if (!result.success) {
        const formattedErrors = formatZodError(result.error);
        logger.warn(
          { errors: formattedErrors, params: req.params },
          "Params validation failed",
        );

        return next(
          new AppError(
            `Parameter validation error: ${formattedErrors.join(", ")}`,
            "VALIDATION_ERROR",
            400,
            formattedErrors,
          ),
        );
      }

      // Replace req.params with validated data
      req.params = result.data as Record<string, string>;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Format Zod errors into readable strings
 */
function formatZodError(error: ZodError): string[] {
  return error.errors.map((err) => {
    const path = err.path.length > 0 ? err.path.join(".") : "root";
    return `${path}: ${err.message}`;
  });
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  // UUID string
  uuid: z.string().uuid("Invalid UUID format"),

  // Email string
  email: z.string().email("Invalid email format"),

  // Pagination params
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),

  // Date range
  dateRange: z.object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  }),

  // Sort params
  sortParams: z.object({
    sortBy: z.string().optional(),
    sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  }),
};

/**
 * Sanitize string inputs
 */
export function sanitizeString(value: string): string {
  return value
    .trim()
    .replace(/[<>]/g, "") // Remove < and > to prevent XSS
    .replace(/\s+/g, " "); // Normalize whitespace
}

/**
 * Middleware to sanitize common fields
 */
export function sanitizeCommonFields(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const sanitizeObject = (obj: Record<string, unknown>) => {
    for (const key in obj) {
      if (typeof obj[key] === "string") {
        obj[key] = sanitizeString(obj[key] as string);
      } else if (typeof obj[key] === "object" && obj[key] !== null) {
        sanitizeObject(obj[key] as Record<string, unknown>);
      }
    }
  };

  if (req.body && typeof req.body === "object") {
    sanitizeObject(req.body);
  }

  next();
}
