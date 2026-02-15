import { z } from 'zod';

export const schemas = {
  uuid: z.string().uuid(),
  email: z.string().email().max(255),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password too long')
    .regex(/[A-Z]/, 'Password must contain uppercase')
    .regex(/[a-z]/, 'Password must contain lowercase')
    .regex(/[0-9]/, 'Password must contain number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain special char'),
  amount: z.number().positive().max(999999999.99),
  invoiceNumber: z.string().min(1).max(50).regex(/^[a-zA-Z0-9-_]+$/),
  supplierName: z.string().min(1).max(255),
  vatNumber: z.string().regex(/^4\d{9}$/),
  date: z.string().datetime(),
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20)
  })
};

export class InputValidator {
  static sanitizeString(input: string): string {
    return input
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
  }

  static sanitizePath(input: string): string {
    return input.replace(/\.\./g, '').replace(/[\\]/g, '/').trim();
  }

  static isValidFileType(mimeType: string, allowedTypes: string[]): boolean {
    return allowedTypes.includes(mimeType);
  }

  static isValidFileSize(size: number, maxSize: number): boolean {
    return size <= maxSize;
  }

  static validate<T>(schema: z.ZodType<T>, data: unknown): { success: true; data: T } | { success: false; errors: z.ZodError } {
    const result = schema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    }
    return { success: false, errors: result.error };
  }
}

export const fileValidation = {
  allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  maxFileSize: 10 * 1024 * 1024,
  validate(mimeType: string, size: number): { valid: boolean; error?: string } {
    if (!this.allowedMimeTypes.includes(mimeType)) {
      return { valid: false, error: `Invalid file type` };
    }
    if (size > this.maxFileSize) {
      return { valid: false, error: `File too large. Max: 10MB` };
    }
    return { valid: true };
  }
};
