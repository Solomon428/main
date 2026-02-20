import { NextRequest } from "next/server";
import { logAuditEvent } from "../../../observability/audit";
import { AuditAction } from "../../../domain/enums/AuditAction";
import { EntityType } from "../../../domain/enums/EntityType";

/**
 * Audit middleware - logs actions to audit log
 */
export function auditMiddleware(
  action: AuditAction,
  entityType: EntityType,
  getEntityId?: (req: NextRequest) => string | undefined,
) {
  return async (request: NextRequest): Promise<void> => {
    try {
      const entityId = getEntityId?.(request) || "unknown";

      // Get user from request (set by auth middleware)
      const userId = (request as unknown as { user?: { id: string } }).user?.id;

      await logAuditEvent({
        userId,
        action,
        entityType,
        entityId,
        ipAddress: request.ip || undefined,
        userAgent: request.headers.get("user-agent") || undefined,
        requestId: (request as unknown as { requestId?: string }).requestId,
      });
    } catch (error) {
      // Fail silently - don't block requests due to audit logging failure
      console.error("Audit middleware error:", error);
    }
  };
}

/**
 * Audit specific actions
 */
export const auditCreate = (entityType: EntityType) =>
  auditMiddleware(AuditAction.CREATE, entityType);

export const auditUpdate = (entityType: EntityType) =>
  auditMiddleware(AuditAction.UPDATE, entityType);

export const auditDelete = (entityType: EntityType) =>
  auditMiddleware(AuditAction.DELETE, entityType);

export const auditView = (entityType: EntityType) =>
  auditMiddleware(AuditAction.READ, entityType);

export const auditExport = (entityType: EntityType) =>
  auditMiddleware(AuditAction.EXPORT, entityType);
