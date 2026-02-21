import { PrismaClient } from "@prisma/client";

export class AuditLogService {
  constructor(
    private prisma: PrismaClient,
    private logger?: any
  ) {}

  async createAuditLog(data: {
    entityType: string;
    entityId: string;
    action: string;
    userId?: string;
    organizationId?: string;
    changes?: Record<string, any>;
  }): Promise<void> {
    // Stub implementation
    console.log("Audit log:", data);
  }
}
