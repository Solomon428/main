// ============================================================================
// CreditorFlow - Authentication Utilities
// ============================================================================
// Helper functions for authentication and authorization
// ============================================================================

import { compare, hash } from "bcryptjs";
import { UserRole, Permission } from "@/types";

// Simple JWT implementation without jsonwebtoken package
// In production, use a proper JWT library

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "creditorflow-fallback-secret-min-32-chars-long-key";

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  department: string;
  exp?: number;
}

/**
 * Hash a password
 */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

/**
 * Verify a password
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  return compare(password, hashedPassword);
}

/**
 * Simple base64 encoding for JWT-like tokens
 * NOTE: This is a simplified implementation for demo purposes.
 * In production, use a proper JWT library like jsonwebtoken
 */
function base64UrlEncode(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64UrlDecode(str: string): string {
  const padding = "=".repeat((4 - (str.length % 4)) % 4);
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/") + padding;
  return atob(base64);
}

/**
 * Generate a simple token (JWT-like)
 * NOTE: For production, install jsonwebtoken: npm install jsonwebtoken
 */
export function generateToken(payload: JWTPayload): string {
  const header = { alg: "none", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, exp: now + 24 * 60 * 60 }; // 24 hours

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedBody = base64UrlEncode(JSON.stringify(body));
  const signature = base64UrlEncode(
    `${encodedHeader}.${encodedBody}.${JWT_SECRET}`,
  );

  return `${encodedHeader}.${encodedBody}.${signature}`;
}

/**
 * Verify a token
 * NOTE: For production, install jsonwebtoken: npm install jsonwebtoken
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const body = JSON.parse(base64UrlDecode(parts[1]));

    // Check expiration
    if (body.exp && body.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return body as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Role hierarchy for permission checking
 */
const ROLE_HIERARCHY: UserRole[] = [
  "CREDIT_CLERK",
  "BRANCH_MANAGER",
  "FINANCIAL_MANAGER",
  "EXECUTIVE",
  "GROUP_FINANCIAL_MANAGER",
  "ADMIN",
  "AUDITOR",
  "SYSTEM",
];

/**
 * Check if user has required role (or higher in hierarchy)
 */
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const userIndex = ROLE_HIERARCHY.indexOf(userRole);
  const requiredIndex = ROLE_HIERARCHY.indexOf(requiredRole);

  if (userIndex === -1 || requiredIndex === -1) return false;

  return userIndex >= requiredIndex;
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(
  userRole: UserRole,
  permission: Permission,
): boolean {
  const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
    CREDIT_CLERK: ["VIEW_INVOICE", "CREATE_INVOICE", "VIEW_REPORT"],
    BRANCH_MANAGER: [
      "VIEW_INVOICE",
      "CREATE_INVOICE",
      "EDIT_INVOICE",
      "APPROVE_INVOICE",
      "VIEW_REPORT",
    ],
    FINANCIAL_MANAGER: [
      "VIEW_INVOICE",
      "CREATE_INVOICE",
      "EDIT_INVOICE",
      "APPROVE_INVOICE",
      "VIEW_REPORT",
      "MANAGE_SUPPLIER",
    ],
    EXECUTIVE: [
      "VIEW_INVOICE",
      "CREATE_INVOICE",
      "EDIT_INVOICE",
      "APPROVE_INVOICE",
      "VIEW_REPORT",
      "MANAGE_SUPPLIER",
      "MANAGE_USER",
    ],
    GROUP_FINANCIAL_MANAGER: [
      "VIEW_INVOICE",
      "CREATE_INVOICE",
      "EDIT_INVOICE",
      "APPROVE_INVOICE",
      "VIEW_REPORT",
      "MANAGE_SUPPLIER",
      "MANAGE_USER",
      "MANAGE_SETTINGS",
    ],
    ADMIN: [
      "VIEW_INVOICE",
      "CREATE_INVOICE",
      "EDIT_INVOICE",
      "DELETE_INVOICE",
      "APPROVE_INVOICE",
      "VIEW_REPORT",
      "MANAGE_SUPPLIER",
      "MANAGE_USER",
      "MANAGE_SETTINGS",
    ],
    AUDITOR: ["VIEW_INVOICE", "VIEW_REPORT", "VIEW_AUDIT_LOG"],
    SYSTEM: [
      "VIEW_INVOICE",
      "CREATE_INVOICE",
      "EDIT_INVOICE",
      "DELETE_INVOICE",
      "APPROVE_INVOICE",
      "VIEW_REPORT",
      "MANAGE_SUPPLIER",
      "MANAGE_USER",
      "MANAGE_SETTINGS",
      "VIEW_AUDIT_LOG",
    ],
  };

  const userPermissions = ROLE_PERMISSIONS[userRole] || [];
  return userPermissions.includes(permission);
}

/**
 * Generate a random password reset token
 */
export function generateResetToken(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push(
      "Password must contain at least one special character (!@#$%^&*)",
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * AuthUtils namespace for backward compatibility
 * Usage: import { AuthUtils } from './auth-utils';
 */
export const AuthUtils = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  hasRole,
  hasPermission,
  generateResetToken,
  isValidEmail,
  validatePasswordStrength,
};
