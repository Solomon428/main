import { prisma } from "@/lib/prisma";

export interface BaseServiceOptions {
  userId?: string;
  organizationId?: string;
}

export class BaseService {
  protected prisma = prisma;
  protected userId?: string;
  protected organizationId?: string;

  constructor(options: BaseServiceOptions = {}) {
    this.userId = options.userId;
    this.organizationId = options.organizationId;
  }

  protected async audit(
    action: string,
    entity: string,
    entityId: string,
    details?: Record<string, unknown>,
  ) {
    // TODO: Implement audit logging
    console.log(`[AUDIT] ${action} on ${entity}:${entityId}`, details);
  }

  protected checkPermission(requiredRole: string): boolean {
    // TODO: Implement permission checking
    return true;
  }

  protected requireOrg() {
    if (!this.organizationId) {
      throw new Error("Organization ID is required");
    }
    return this.organizationId;
  }

  protected requireUser() {
    if (!this.userId) {
      throw new Error("User ID is required");
    }
    return this.userId;
  }
}
