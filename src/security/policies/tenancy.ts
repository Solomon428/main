// ============================================================================
// Multi-Tenancy Access Control Policies
// ============================================================================

import { prisma } from "../../lib/prisma";

/**
 * Enforce tenant access - verify user belongs to organization
 */
export async function enforceTenantAccess(
  userId: string,
  organizationId: string,
): Promise<boolean> {
  const membership = await prisma.user.findFirst({
    where: {
      id: userId,
      organizations: {
        some: {
          id: organizationId,
        },
      },
      isActive: true,
    },
  });

  return !!membership;
}

/**
 * Get user's primary organization
 */
export async function getUserPrimaryOrganization(
  userId: string,
): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { primaryOrganizationId: true },
  });

  return user?.primaryOrganizationId || null;
}

/**
 * Get all organizations for a user
 */
export async function getUserOrganizations(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      organizations: {
        select: { id: true },
      },
    },
  });

  return user?.organizations.map((o: { id: string }) => o.id) || [];
}

/**
 * Filter query by tenant (adds organizationId filter)
 */
export function filterByTenant<T extends { organizationId?: string }>(
  query: T,
  organizationId: string,
): T {
  return {
    ...query,
    organizationId,
  };
}

/**
 * Check if user can access specific entity within organization
 */
export async function canAccessEntity(
  userId: string,
  organizationId: string,
  entityType: string,
  entityId: string,
): Promise<boolean> {
  // First check tenant access
  const hasTenantAccess = await enforceTenantAccess(userId, organizationId);
  if (!hasTenantAccess) {
    return false;
  }

  // Check entity exists in organization
  // This would need to be implemented based on entity type
  switch (entityType) {
    case "INVOICE":
      const invoice = await prisma.invoice.findFirst({
        where: { id: entityId, organizationId },
      });
      return !!invoice;

    case "SUPPLIER":
      const supplier = await prisma.supplier.findFirst({
        where: { id: entityId, organizationId },
      });
      return !!supplier;

    case "PAYMENT":
      const payment = await prisma.payment.findFirst({
        where: { id: entityId, organizationId },
      });
      return !!payment;

    default:
      return true;
  }
}

/**
 * Require tenant access or throw error
 */
export async function requireTenantAccess(
  userId: string,
  organizationId: string,
): Promise<void> {
  const hasAccess = await enforceTenantAccess(userId, organizationId);
  if (!hasAccess) {
    throw new Error("Access denied: User does not belong to this organization");
  }
}

/**
 * Get organization context from request
 */
export function getOrganizationContext(headers: Headers): string | null {
  return headers.get("x-organization-id") || headers.get("x-org-id") || null;
}
