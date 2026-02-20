// ============================================================================
// ID Generation Utilities
// ============================================================================

import { v4 as uuidv4, validate as validateUUID } from "uuid";

// CUID-like pattern using crypto
import * as crypto from "crypto";

/**
 * Generate a unique ID (CUID format)
 */
export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(12).toString("base64url");
  return `c${timestamp}${random}`.slice(0, 25);
}

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  return uuidv4();
}

/**
 * Validate an ID (supports both CUID and UUID)
 */
export function validateId(id: string): boolean {
  // Check if it's a UUID
  if (validateUUID(id)) {
    return true;
  }

  // Check if it's a CUID (starts with 'c', 25 chars)
  if (/^c[0-9a-z]{24}$/i.test(id)) {
    return true;
  }

  return false;
}

/**
 * Parse ID to determine type
 */
export function parseId(id: string): {
  type: "uuid" | "cuid" | "unknown";
  valid: boolean;
} {
  if (validateUUID(id)) {
    return { type: "uuid", valid: true };
  }

  if (/^c[0-9a-z]{24}$/i.test(id)) {
    return { type: "cuid", valid: true };
  }

  return { type: "unknown", valid: false };
}

/**
 * Generate a short ID (8 characters)
 */
export function generateShortId(): string {
  return crypto.randomBytes(6).toString("base64url");
}

/**
 * Generate a sequential ID with prefix
 */
export function generateSequentialId(
  prefix: string,
  sequence: number,
  padding: number = 6,
): string {
  const paddedSequence = String(sequence).padStart(padding, "0");
  return `${prefix}-${paddedSequence}`;
}

/**
 * Generate an invoice number
 */
export function generateInvoiceNumber(
  prefix: string = "INV",
  sequence: number,
  date: Date = new Date(),
): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const paddedSequence = String(sequence).padStart(6, "0");
  return `${prefix}-${year}${month}-${paddedSequence}`;
}

/**
 * Generate a payment reference number
 */
export function generatePaymentReference(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `PAY-${timestamp}-${random}`;
}

/**
 * Generate a supplier code
 */
export function generateSupplierCode(name: string, sequence: number): string {
  const prefix = name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 4);
  const paddedSequence = String(sequence).padStart(4, "0");
  return `${prefix}${paddedSequence}`;
}

/**
 * Generate a batch number
 */
export function generateBatchNumber(
  type: string,
  date: Date = new Date(),
): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const random = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `${type}-${year}${month}${day}-${random}`;
}

/**
 * Generate a secure token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString("base64url");
}

/**
 * Generate a numeric OTP
 */
export function generateOTP(length: number = 6): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

/**
 * Hash an ID for public use
 */
export function hashId(id: string): string {
  return crypto.createHash("sha256").update(id).digest("hex").slice(0, 16);
}

/**
 * Extract timestamp from CUID (if generated with timestamp)
 */
export function extractTimestampFromCuid(id: string): Date | null {
  if (!id.startsWith("c") || id.length !== 25) {
    return null;
  }

  try {
    const timestampBase36 = id.slice(1, 9);
    const timestamp = parseInt(timestampBase36, 36);
    return new Date(timestamp);
  } catch {
    return null;
  }
}

/**
 * Generate slug from string
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
