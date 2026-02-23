import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export interface RequestWithOrg extends NextRequest {
  organizationId?: string;
  organization?: {
    id: string;
    name: string;
    settings?: Record<string, unknown> | null;
  };
}

/**
 * Extract organization context from request
 */
export async function orgContextMiddleware(
  request: NextRequest,
): Promise<NextResponse | RequestWithOrg> {
  try {
    // Get organization ID from header
    const orgId = request.headers.get("x-organization-id");

    if (!orgId) {
      // Organization context is optional for some routes
      return request as RequestWithOrg;
    }

    // Validate organization exists and is active
    const organization = await prisma.organization.findUnique({
      where: {
        id: orgId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        settings: true,
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found or inactive" },
        { status: 404 },
      );
    }

    // Attach organization to request
    const reqWithOrg = request as RequestWithOrg;
    reqWithOrg.organizationId = orgId;
    reqWithOrg.organization = {
      id: organization.id,
      name: organization.name,
      settings: organization.settings as Record<string, unknown> | null,
    };

    return reqWithOrg;
  } catch (error) {
    console.error("Org context middleware error:", error);
    return NextResponse.json(
      { error: "Failed to validate organization context" },
      { status: 500 },
    );
  }
}

/**
 * Require organization context
 */
export function requireOrgContext(
  request: RequestWithOrg,
): NextResponse | null {
  if (!request.organizationId) {
    return NextResponse.json(
      { error: "Organization context required" },
      { status: 400 },
    );
  }
  return null;
}
