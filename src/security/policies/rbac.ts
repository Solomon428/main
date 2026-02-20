// ============================================================================
// Role-Based Access Control (RBAC) Policies
// ============================================================================

import { prisma } from "../../lib/prisma";
import { UserRole } from "../../domain/enums/UserRole";

// Permission definitions
export const PERMISSIONS = {
  // Invoice permissions
  INVOICE_CREATE: "invoice:create",
  INVOICE_READ: "invoice:read",
  INVOICE_UPDATE: "invoice:update",
  INVOICE_DELETE: "invoice:delete",
  INVOICE_APPROVE: "invoice:approve",
  INVOICE_EXPORT: "invoice:export",

  // Supplier permissions
  SUPPLIER_CREATE: "supplier:create",
  SUPPLIER_READ: "supplier:read",
  SUPPLIER_UPDATE: "supplier:update",
  SUPPLIER_DELETE: "supplier:delete",

  // Payment permissions
  PAYMENT_CREATE: "payment:create",
  PAYMENT_READ: "payment:read",
  PAYMENT_PROCESS: "payment:process",

  // User management
  USER_CREATE: "user:create",
  USER_READ: "user:read",
  USER_UPDATE: "user:update",
  USER_DELETE: "user:delete",

  // Organization
  ORG_MANAGE: "org:manage",
  ORG_SETTINGS: "org:settings",

  // Reports & Audit
  REPORT_VIEW: "report:view",
  AUDIT_VIEW: "audit:view",

  // System
  SYSTEM_SETTINGS: "system:settings",
  INTEGRATION_MANAGE: "integration:manage",
} as const;

// Role to permissions mapping
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [UserRole.SYSTEM_ADMIN]: Object.values(PERMISSIONS),

  [UserRole.ORG_ADMIN]: [
    PERMISSIONS.INVOICE_CREATE,
    PERMISSIONS.INVOICE_READ,
    PERMISSIONS.INVOICE_UPDATE,
    PERMISSIONS.INVOICE_DELETE,
    PERMISSIONS.INVOICE_APPROVE,
    PERMISSIONS.INVOICE_EXPORT,
    PERMISSIONS.SUPPLIER_CREATE,
    PERMISSIONS.SUPPLIER_READ,
    PERMISSIONS.SUPPLIER_UPDATE,
    PERMISSIONS.SUPPLIER_DELETE,
    PERMISSIONS.PAYMENT_CREATE,
    PERMISSIONS.PAYMENT_READ,
    PERMISSIONS.PAYMENT_PROCESS,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.USER_DELETE,
    PERMISSIONS.ORG_MANAGE,
    PERMISSIONS.ORG_SETTINGS,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.INTEGRATION_MANAGE,
  ],

  [UserRole.FINANCE_MANAGER]: [
    PERMISSIONS.INVOICE_CREATE,
    PERMISSIONS.INVOICE_READ,
    PERMISSIONS.INVOICE_UPDATE,
    PERMISSIONS.INVOICE_APPROVE,
    PERMISSIONS.INVOICE_EXPORT,
    PERMISSIONS.SUPPLIER_CREATE,
    PERMISSIONS.SUPPLIER_READ,
    PERMISSIONS.SUPPLIER_UPDATE,
    PERMISSIONS.PAYMENT_CREATE,
    PERMISSIONS.PAYMENT_READ,
    PERMISSIONS.PAYMENT_PROCESS,
    PERMISSIONS.USER_READ,
    PERMISSIONS.REPORT_VIEW,
  ],

  [UserRole.APPROVER]: [
    PERMISSIONS.INVOICE_READ,
    PERMISSIONS.INVOICE_APPROVE,
    PERMISSIONS.SUPPLIER_READ,
    PERMISSIONS.PAYMENT_READ,
  ],

  [UserRole.PROCUREMENT]: [
    PERMISSIONS.INVOICE_CREATE,
    PERMISSIONS.INVOICE_READ,
    PERMISSIONS.INVOICE_UPDATE,
    PERMISSIONS.SUPPLIER_CREATE,
    PERMISSIONS.SUPPLIER_READ,
    PERMISSIONS.SUPPLIER_UPDATE,
  ],

  [UserRole.VIEWER]: [
    PERMISSIONS.INVOICE_READ,
    PERMISSIONS.SUPPLIER_READ,
    PERMISSIONS.PAYMENT_READ,
  ],

  [UserRole.AUDITOR]: [
    PERMISSIONS.INVOICE_READ,
    PERMISSIONS.INVOICE_EXPORT,
    PERMISSIONS.SUPPLIER_READ,
    PERMISSIONS.PAYMENT_READ,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.AUDIT_VIEW,
  ],

  [UserRole.CREDIT_CLERK]: [
    PERMISSIONS.INVOICE_CREATE,
    PERMISSIONS.INVOICE_READ,
    PERMISSIONS.INVOICE_UPDATE,
    PERMISSIONS.SUPPLIER_READ,
  ],

  [UserRole.BRANCH_MANAGER]: [
    PERMISSIONS.INVOICE_READ,
    PERMISSIONS.INVOICE_APPROVE,
    PERMISSIONS.SUPPLIER_READ,
    PERMISSIONS.REPORT_VIEW,
  ],

  [UserRole.FINANCIAL_MANAGER]: [
    PERMISSIONS.INVOICE_READ,
    PERMISSIONS.INVOICE_APPROVE,
    PERMISSIONS.INVOICE_EXPORT,
    PERMISSIONS.SUPPLIER_READ,
    PERMISSIONS.PAYMENT_CREATE,
    PERMISSIONS.PAYMENT_READ,
    PERMISSIONS.PAYMENT_PROCESS,
    PERMISSIONS.REPORT_VIEW,
  ],

  [UserRole.EXECUTIVE]: [
    PERMISSIONS.INVOICE_READ,
    PERMISSIONS.INVOICE_EXPORT,
    PERMISSIONS.SUPPLIER_READ,
    PERMISSIONS.PAYMENT_READ,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.AUDIT_VIEW,
  ],

  [UserRole.GROUP_FINANCIAL_MANAGER]: [
    PERMISSIONS.INVOICE_CREATE,
    PERMISSIONS.INVOICE_READ,
    PERMISSIONS.INVOICE_UPDATE,
    PERMISSIONS.INVOICE_APPROVE,
    PERMISSIONS.INVOICE_EXPORT,
    PERMISSIONS.SUPPLIER_CREATE,
    PERMISSIONS.SUPPLIER_READ,
    PERMISSIONS.SUPPLIER_UPDATE,
    PERMISSIONS.SUPPLIER_DELETE,
    PERMISSIONS.PAYMENT_CREATE,
    PERMISSIONS.PAYMENT_READ,
    PERMISSIONS.PAYMENT_PROCESS,
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.AUDIT_VIEW,
  ],
};

/**
 * Check if a user has a specific permission
 */
export async function checkPermission(
  userId: string,
  permission: string,
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, isActive: true },
  });

  if (!user || !user.isActive) {
    return false;
  }

  const permissions = ROLE_PERMISSIONS[user.role as UserRole] || [];
  return permissions.includes(permission);
}

/**
 * Get all roles for a user
 */
export async function getUserRoles(userId: string): Promise<UserRole[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  return user ? [user.role as UserRole] : [];
}

/**
 * Get all permissions for a user
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, isActive: true },
  });

  if (!user || !user.isActive) {
    return [];
  }

  return ROLE_PERMISSIONS[user.role as UserRole] || [];
}

/**
 * Check if user has any of the specified permissions
 */
export async function hasAnyPermission(
  userId: string,
  permissions: string[],
): Promise<boolean> {
  const userPermissions = await getUserPermissions(userId);
  return permissions.some((p) => userPermissions.includes(p));
}

/**
 * Check if user has all specified permissions
 */
export async function hasAllPermissions(
  userId: string,
  permissions: string[],
): Promise<boolean> {
  const userPermissions = await getUserPermissions(userId);
  return permissions.every((p) => userPermissions.includes(p));
}
