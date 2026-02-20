import { AuditAction } from "../enums/AuditAction";
import { EntityType } from "../enums/EntityType";
import { LogSeverity } from "../enums/LogSeverity";

export interface AuditLog {
  id: string;
  organizationId?: string | null;
  userId?: string | null;
  action: AuditAction;
  entityType: EntityType;
  entityId: string;
  entityDescription?: string | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  diff?: Record<string, unknown> | null;
  changesSummary?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  userDepartment?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceInfo?: string | null;
  geoLocation?: string | null;
  requestId?: string | null;
  sessionId?: string | null;
  correlationId?: string | null;
  severity: LogSeverity;
  complianceFlags: string[];
  retentionDate?: Date | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
}
