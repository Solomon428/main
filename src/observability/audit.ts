// ============================================================================
// Audit Logging Service
// ============================================================================

import { prisma } from '../lib/prisma';
import { AuditAction } from '../domain/enums/AuditAction';
import { EntityType } from '../domain/enums/EntityType';
import { LogSeverity } from '../domain/enums/LogSeverity';

interface AuditEventData {
  userId?: string;
  organizationId?: string;
  action: AuditAction;
  entityType: EntityType;
  entityId: string;
  entityDescription?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  changesSummary?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: string;
  geoLocation?: string;
  requestId?: string;
  sessionId?: string;
  correlationId?: string;
  severity?: LogSeverity;
  complianceFlags?: string[];
}

/**
 * Log an audit event to the database
 */
export async function logAuditEvent(data: AuditEventData): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        organizationId: data.organizationId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        entityDescription: data.entityDescription,
        oldValue: data.oldValue || null,
        newValue: data.newValue || null,
        diff: calculateDiff(data.oldValue, data.newValue),
        changesSummary: data.changesSummary || generateChangesSummary(data.oldValue, data.newValue),
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        deviceInfo: data.deviceInfo,
        geoLocation: data.geoLocation,
        requestId: data.requestId,
        sessionId: data.sessionId,
        correlationId: data.correlationId,
        severity: data.severity || LogSeverity.INFO,
        complianceFlags: data.complianceFlags || [],
        retentionDate: calculateRetentionDate(),
      },
    });
  } catch (error) {
    // Fail silently but log to console
    console.error('Failed to write audit log:', error);
  }
}

/**
 * Calculate diff between old and new values
 */
function calculateDiff(
  oldValue?: Record<string, unknown>,
  newValue?: Record<string, unknown>
): Record<string, { old: unknown; new: unknown }> | null {
  if (!oldValue || !newValue) return null;
  
  const diff: Record<string, { old: unknown; new: unknown }> = {};
  
  // Check for changed values
  for (const key of new Set([...Object.keys(oldValue), ...Object.keys(newValue)])) {
    if (JSON.stringify(oldValue[key]) !== JSON.stringify(newValue[key])) {
      diff[key] = {
        old: oldValue[key],
        new: newValue[key],
      };
    }
  }
  
  return Object.keys(diff).length > 0 ? diff : null;
}

/**
 * Generate a human-readable changes summary
 */
function generateChangesSummary(
  oldValue?: Record<string, unknown>,
  newValue?: Record<string, unknown>
): string | null {
  if (!oldValue || !newValue) return null;
  
  const changes: string[] = [];
  
  for (const key of Object.keys(newValue)) {
    if (JSON.stringify(oldValue[key]) !== JSON.stringify(newValue[key])) {
      changes.push(`${key} changed`);
    }
  }
  
  return changes.length > 0 ? changes.join(', ') : null;
}

/**
 * Calculate retention date (7 years default for compliance)
 */
function calculateRetentionDate(): Date {
  const days = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '2555');
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * Log entity creation
 */
export async function logCreate(
  userId: string,
  entityType: EntityType,
  entityId: string,
  newValue: Record<string, unknown>,
  meta?: Omit<AuditEventData, 'userId' | 'action' | 'entityType' | 'entityId' | 'newValue'>
): Promise<void> {
  await logAuditEvent({
    userId,
    action: AuditAction.CREATE,
    entityType,
    entityId,
    newValue,
    changesSummary: `${entityType} created`,
    ...meta,
  });
}

/**
 * Log entity update
 */
export async function logUpdate(
  userId: string,
  entityType: EntityType,
  entityId: string,
  oldValue: Record<string, unknown>,
  newValue: Record<string, unknown>,
  meta?: Omit<AuditEventData, 'userId' | 'action' | 'entityType' | 'entityId' | 'oldValue' | 'newValue'>
): Promise<void> {
  await logAuditEvent({
    userId,
    action: AuditAction.UPDATE,
    entityType,
    entityId,
    oldValue,
    newValue,
    ...meta,
  });
}

/**
 * Log entity deletion
 */
export async function logDelete(
  userId: string,
  entityType: EntityType,
  entityId: string,
  oldValue: Record<string, unknown>,
  meta?: Omit<AuditEventData, 'userId' | 'action' | 'entityType' | 'entityId' | 'oldValue'>
): Promise<void> {
  await logAuditEvent({
    userId,
    action: AuditAction.DELETE,
    entityType,
    entityId,
    oldValue,
    changesSummary: `${entityType} deleted`,
    ...meta,
  });
}

/**
 * Log entity view/access
 */
export async function logView(
  userId: string,
  entityType: EntityType,
  entityId: string,
  meta?: Omit<AuditEventData, 'userId' | 'action' | 'entityType' | 'entityId'>
): Promise<void> {
  await logAuditEvent({
    userId,
    action: AuditAction.READ,
    entityType,
    entityId,
    ...meta,
  });
}

/**
 * Log approval action
 */
export async function logApproval(
  userId: string,
  entityId: string,
  approved: boolean,
  notes?: string,
  meta?: Omit<AuditEventData, 'userId' | 'action' | 'entityType' | 'entityId'>
): Promise<void> {
  await logAuditEvent({
    userId,
    action: approved ? AuditAction.APPROVE : AuditAction.REJECT,
    entityType: EntityType.INVOICE,
    entityId,
    changesSummary: notes || (approved ? 'Approved' : 'Rejected'),
    ...meta,
  });
}
