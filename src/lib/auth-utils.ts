// ============================================================================
// CreditorFlow - Authentication Utilities
// ============================================================================
// Helper functions for authentication and authorization
// ============================================================================

import { compare, hash } from "bcryptjs";
import { UserRole, Permission } from "@/types";
import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "creditorflow-fallback-secret-min-32-chars-long-key";
const SECRET = new TextEncoder().encode(JWT_SECRET);

export interface JWTPayload {
  id: string;
  email: string;
  role: UserRole;
  department: string;
  name?: string;
  approvalLimit?: number;
  exp?: number;
  iat?: number;
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
 * Generate a JWT token using jose library
 */
export async function generateToken(
  payload: Omit<JWTPayload, "iat" | "exp">,
): Promise<string> {
  const token = await new SignJWT({
    id: payload.id,
    email: payload.email,
    role: payload.role,
    department: payload.department,
    name: payload.name,
    approvalLimit: payload.approvalLimit,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(SECRET);

  return token;
}

/**
 * Verify a JWT token using jose library
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    // Map jose payload to our JWTPayload
    return {
      id: (payload as any).id || (payload as any).userId || "",
      email: payload.email as string,
      role: (payload as any).role as UserRole,
      department: (payload as any).department as string,
      name: (payload as any).name,
      approvalLimit: (payload as any).approvalLimit,
      exp: payload.exp,
      iat: payload.iat,
    };
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
  "SUPER_ADMIN",
  "FINANCE_MANAGER",
  "APPROVER",
  "PROCUREMENT",
  "VIEWER",
  "AUDITOR",
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
    SUPER_ADMIN: [
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
    FINANCE_MANAGER: [
      "VIEW_INVOICE",
      "CREATE_INVOICE",
      "EDIT_INVOICE",
      "APPROVE_INVOICE",
      "VIEW_REPORT",
      "MANAGE_SUPPLIER",
    ],
    APPROVER: [
      "VIEW_INVOICE",
      "CREATE_INVOICE",
      "EDIT_INVOICE",
      "APPROVE_INVOICE",
      "VIEW_REPORT",
    ],
    PROCUREMENT: [
      "VIEW_INVOICE",
      "CREATE_INVOICE",
      "EDIT_INVOICE",
      "VIEW_REPORT",
      "MANAGE_SUPPLIER",
    ],
    VIEWER: ["VIEW_INVOICE", "VIEW_REPORT"],
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
