// ============================================================================
// Password and API Key Hashing Service
// ============================================================================

import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";

const SALT_ROUNDS = 12;

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Hash an API key using SHA-256
 * Note: API keys are only shown once to the user
 */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}

/**
 * Verify an API key against a hash
 */
export function verifyApiKey(apiKey: string, hash: string): boolean {
  const computedHash = hashApiKey(apiKey);
  return computedHash === hash;
}

/**
 * Generate a new API key
 */
export function generateApiKey(): { key: string; prefix: string } {
  const prefix = "cf_" + crypto.randomBytes(4).toString("hex");
  const secret = crypto.randomBytes(32).toString("hex");
  const key = `${prefix}_${secret}`;

  return { key, prefix };
}

/**
 * Check if password meets strength requirements
 */
export function checkPasswordStrength(password: string): {
  valid: boolean;
  score: number;
  errors: string[];
} {
  const errors: string[] = [];
  let score = 0;

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  } else {
    score += 1;
  }

  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  return {
    valid: errors.length === 0 && score >= 3,
    score,
    errors,
  };
}
