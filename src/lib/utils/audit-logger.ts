// Simplified Audit Logger for SQLite
import { prisma } from "../database/client";
import { EntityType, LogSeverity, AuditAction } from "@/types";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface AuditLogEntry {
  action: AuditAction;
  entityType: EntityType;
  entityId: string;
  entityDescription?: string;
  oldValue?: JsonValue;
  newValue?: JsonValue;
  diff?: JsonValue;
  severity: LogSeverity;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  userDepartment?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: string;
  requestId?: string;
  sessionId?: string;
  correlationId?: string;
  browserInfo?: string;
  location?: string;
  complianceFlags?: string[];
  metadata?: Record<string, JsonValue>;
}

export class AuditLogger {
  static async log(entry: AuditLogEntry): Promise<void> {
    try {
      // Build metadata object
      const metadataObj: Record<string, JsonValue> = {
        ...(entry.metadata || {}),
      };

      if (entry.oldValue !== undefined) metadataObj.oldValue = entry.oldValue;
      if (entry.newValue !== undefined) metadataObj.newValue = entry.newValue;
      if (entry.diff !== undefined) metadataObj.diff = entry.diff;
      if (entry.deviceInfo !== undefined)
        metadataObj.deviceInfo = entry.deviceInfo;
      if (entry.requestId !== undefined)
        metadataObj.requestId = entry.requestId;
      if (entry.sessionId !== undefined)
        metadataObj.sessionId = entry.sessionId;
      if (entry.correlationId !== undefined)
        metadataObj.correlationId = entry.correlationId;
      if (entry.browserInfo !== undefined)
        metadataObj.browserInfo = entry.browserInfo;
      if (entry.location !== undefined) metadataObj.location = entry.location;
      if (entry.complianceFlags !== undefined)
        metadataObj.complianceFlags = entry.complianceFlags;

      // Prepare data for Prisma - only include defined values
      const auditData: any = {
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        severity: entry.severity,
        complianceFlags: JSON.stringify(entry.complianceFlags || []),
      };

      // Only add optional fields if they are defined
      if (entry.entityDescription !== undefined) {
        auditData.entityDescription = entry.entityDescription;
      }
      if (entry.userId !== undefined) {
        auditData.userId = entry.userId;
      }
      if (entry.userEmail !== undefined) {
        auditData.userEmail = entry.userEmail;
      }
      if (entry.userRole !== undefined) {
        auditData.userRole = entry.userRole;
      }
      if (entry.userDepartment !== undefined) {
        auditData.userDepartment = entry.userDepartment;
      }
      if (entry.ipAddress !== undefined) {
        auditData.userIp = entry.ipAddress;
      }
      if (entry.userAgent !== undefined) {
        auditData.userAgent = entry.userAgent;
      }
      if (entry.deviceInfo !== undefined) {
        auditData.deviceInfo = entry.deviceInfo;
      }
      if (Object.keys(metadataObj).length > 0) {
        auditData.metadata = JSON.stringify(metadataObj);
      }

      await prisma.auditLog.create({
        data: auditData,
      });
    } catch (error) {
      console.error("Failed to write audit log:", error);
    }
  }

  static async getAuditTrail(
    entityType: EntityType,
    entityId: string,
    limit: number = 100,
  ) {
    return prisma.auditLog.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });
  }

  static async getAuditTrailByUser(userId: string, limit: number = 100) {
    return prisma.auditLog.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });
  }

  static async getAuditTrailByAction(action: AuditAction, limit: number = 100) {
    return prisma.auditLog.findMany({
      where: {
        action,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });
  }

  static async getAuditTrailBySeverity(
    severity: LogSeverity,
    limit: number = 100,
  ) {
    return prisma.auditLog.findMany({
      where: {
        severity,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });
  }

  static async getAuditStatistics(dateRange?: { start: Date; end: Date }) {
    const whereClause = dateRange
      ? {
          createdAt: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
        }
      : {};

    const [total] = await Promise.all([
      prisma.auditLog.count({ where: whereClause }),
    ]);

    return {
      total,
      byAction: [],
      bySeverity: [],
      byEntityType: [],
    };
  }

  static async logSystemEvent(
    action: AuditAction,
    description: string,
    severity: LogSeverity = "INFO",
    metadata?: Record<string, JsonValue>,
  ): Promise<void> {
    const entry: AuditLogEntry = {
      action,
      entityType: "SYSTEM",
      entityId: "SYSTEM",
      entityDescription: description,
      severity,
    };
    if (metadata) {
      entry.metadata = metadata;
    }
    await this.log(entry);
  }

  static async logSecurityEvent(
    action: AuditAction,
    entityId: string,
    description: string,
    severity: LogSeverity = "WARNING",
    userId?: string,
    metadata?: Record<string, JsonValue>,
  ): Promise<void> {
    const entry: AuditLogEntry = {
      action,
      entityType: "USER",
      entityId,
      entityDescription: description,
      severity,
    };
    if (userId) {
      entry.userId = userId;
    }
    if (metadata) {
      entry.metadata = metadata;
    }
    await this.log(entry);
  }

  static async logComplianceViolation(
    entityType: EntityType,
    entityId: string,
    description: string,
    complianceFlags: string[],
    userId?: string,
    metadata?: Record<string, JsonValue>,
  ): Promise<void> {
    const entry: AuditLogEntry = {
      action: "COMPLIANCE_VIOLATION",
      entityType,
      entityId,
      entityDescription: description,
      severity: "WARNING",
      complianceFlags,
    };
    if (userId) {
      entry.userId = userId;
    }
    if (metadata) {
      entry.metadata = metadata;
    }
    await this.log(entry);
  }

  static async logFraudDetection(
    entityId: string,
    description: string,
    fraudScore: number,
    userId?: string,
    metadata?: Record<string, JsonValue>,
  ): Promise<void> {
    const entry: AuditLogEntry = {
      action: "FRAUD_DETECTED",
      entityType: "INVOICE",
      entityId,
      entityDescription: description,
      severity: fraudScore > 80 ? "CRITICAL" : "WARNING",
      metadata: {
        ...((metadata as object) || {}),
        fraudScore,
      },
    };
    if (userId) {
      entry.userId = userId;
    }
    await this.log(entry);
  }
}

export const auditLogger = AuditLogger;
export default AuditLogger;
