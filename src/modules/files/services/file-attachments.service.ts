import { prisma } from "@/lib/prisma";
import { FileAttachment, Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";
import { AppError } from "@/lib/errors";
import { auditService } from "@/lib/audit/audit.service";
import { AuditAction, EntityType } from "@/domain/enums";
import { FileAttachmentWithRelations } from "../types/file-types";

export interface CreateFileAttachmentInput {
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  entityType?: EntityType;
  entityId?: string;
  organizationId: string;
  uploadedById: string;
  processingStatus?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateFileAttachmentInput {
  fileName?: string;
  processingStatus?: string;
  entityType?: EntityType;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export interface FileFilterOptions {
  organizationId: string;
  entityType?: EntityType;
  entityId?: string;
  processingStatus?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface FileListResult {
  files: FileAttachmentWithRelations[];
  total: number;
  page: number;
  totalPages: number;
}

export class FileAttachmentsService {
  /**
   * Create a new file attachment record
   */
  async createFileAttachment(
    input: CreateFileAttachmentInput,
  ): Promise<FileAttachment> {
    try {
      const file = await prisma.fileAttachment.create({
        data: {
          fileName: input.fileName,
          originalName: input.originalName,
          mimeType: input.mimeType,
          size: input.size,
          path: input.path,
          entityType: input.entityType,
          entityId: input.entityId,
          organizationId: input.organizationId,
          uploadedById: input.uploadedById,
          processingStatus: input.processingStatus || "PENDING",
          metadata: input.metadata as Prisma.JsonValue,
        },
      });

      logger.info(
        { fileId: file.id, fileName: file.fileName },
        "File attachment created",
      );

      return file;
    } catch (error) {
      logger.error({ error, input }, "Failed to create file attachment");
      throw new AppError(
        "Failed to create file attachment",
        "FILE_CREATE_ERROR",
        500,
      );
    }
  }

  /**
   * Get a file attachment by ID
   */
  async getFileAttachmentById(
    fileId: string,
    organizationId: string,
  ): Promise<FileAttachmentWithRelations> {
    const file = await prisma.fileAttachment.findUnique({
      where: { id: fileId },
      include: {
        uploader: {
          select: { id: true, name: true, email: true },
        },
        organization: {
          select: { id: true, name: true },
        },
      },
    });

    if (!file) {
      throw new AppError("File not found", "FILE_NOT_FOUND", 404);
    }

    if (file.organizationId !== organizationId) {
      throw new AppError("Access denied to file", "ACCESS_DENIED", 403);
    }

    return file;
  }

  /**
   * Update a file attachment
   */
  async updateFileAttachment(
    fileId: string,
    organizationId: string,
    input: UpdateFileAttachmentInput,
    userId: string,
  ): Promise<FileAttachment> {
    const file = await this.getFileAttachmentById(fileId, organizationId);

    const updatedFile = await prisma.fileAttachment.update({
      where: { id: fileId },
      data: {
        ...(input.fileName && { fileName: input.fileName }),
        ...(input.processingStatus && {
          processingStatus: input.processingStatus,
        }),
        ...(input.entityType && { entityType: input.entityType }),
        ...(input.entityId && { entityId: input.entityId }),
        ...(input.metadata && { metadata: input.metadata as Prisma.JsonValue }),
      },
    });

    // Create audit log
    await auditService.createLog({
      action: AuditAction.FILE_UPDATED,
      entityType: EntityType.FILE_ATTACHMENT,
      entityId: fileId,
      userId,
      organizationId,
      metadata: {
        changes: input,
      },
    });

    logger.info({ fileId, changes: input }, "File attachment updated");

    return updatedFile;
  }

  /**
   * Delete a file attachment
   */
  async deleteFileAttachment(
    fileId: string,
    userId: string,
    organizationId: string,
  ): Promise<void> {
    const file = await this.getFileAttachmentById(fileId, organizationId);

    // Delete from database (storage cleanup would be done separately)
    await prisma.fileAttachment.delete({
      where: { id: fileId },
    });

    // Create audit log
    await auditService.createLog({
      action: AuditAction.FILE_DELETED,
      entityType: EntityType.FILE_ATTACHMENT,
      entityId: fileId,
      userId,
      organizationId,
      metadata: {
        fileName: file.fileName,
        mimeType: file.mimeType,
        size: file.size,
      },
    });

    logger.info({ fileId }, "File attachment deleted");
  }

  /**
   * List file attachments with filtering and pagination
   */
  async listFileAttachments(
    options: FileFilterOptions,
  ): Promise<FileListResult> {
    const {
      organizationId,
      entityType,
      entityId,
      processingStatus,
      search,
      page = 1,
      limit = 20,
    } = options;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.FileAttachmentWhereInput = {
      organizationId,
      ...(entityType && { entityType }),
      ...(entityId && { entityId }),
      ...(status && { processingStatus: status }),
      ...(search && {
        OR: [
          { fileName: { contains: search, mode: "insensitive" } },
          { originalName: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const [files, total] = await Promise.all([
      prisma.fileAttachment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          uploader: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.fileAttachment.count({ where }),
    ]);

    return {
      files,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get files by entity type and ID
   */
  async getFilesByEntity(
    entityType: EntityType,
    entityId: string,
    organizationId: string,
  ): Promise<FileAttachmentWithRelations[]> {
    return prisma.fileAttachment.findMany({
      where: {
        entityType,
        entityId,
        organizationId,
      },
      orderBy: { createdAt: "desc" },
      include: {
        uploader: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  /**
   * Update file status
   */
  async updateFileStatus(
    fileId: string,
    processingStatus: string,
    metadata?: Record<string, unknown>,
  ): Promise<FileAttachment> {
    return prisma.fileAttachment.update({
      where: { id: fileId },
      data: {
        processingStatus,
        ...(metadata && { metadata: metadata as Prisma.JsonValue }),
      },
    });
  }

  /**
   * Bulk delete files
   */
  async bulkDeleteFiles(
    fileIds: string[],
    userId: string,
    organizationId: string,
  ): Promise<{
    total: number;
    successful: number;
    failed: number;
    results: Array<{ fileId: string; success: boolean; error?: string }>;
  }> {
    const results: Array<{ fileId: string; success: boolean; error?: string }> =
      [];

    for (const fileId of fileIds) {
      try {
        await this.deleteFileAttachment(fileId, userId, organizationId);
        results.push({ fileId, success: true });
      } catch (error) {
        results.push({
          fileId,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return {
      total: fileIds.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  /**
   * Get file statistics for an organization
   */
  async getFileStatistics(organizationId: string): Promise<{
    total: number;
    byStatus: Record<FileStatus, number>;
    byEntityType: Record<string, number>;
    totalSize: number;
  }> {
    const [total, byStatus, byEntityType, sizeResult] = await Promise.all([
      prisma.fileAttachment.count({ where: { organizationId } }),
      prisma.fileAttachment.groupBy({
        by: ["processingStatus"],
        where: { organizationId },
        _count: { processingStatus: true },
      }),
      prisma.fileAttachment.groupBy({
        by: ["entityType"],
        where: { organizationId },
        _count: { entityType: true },
      }),
      prisma.fileAttachment.aggregate({
        where: { organizationId },
        _sum: { size: true },
      }),
    ]);

    const statusCounts: Record<string, number> = {
      PENDING: 0,
      PROCESSING: 0,
      COMPLETED: 0,
      ERROR: 0,
    };
    byStatus.forEach((item) => {
      statusCounts[item.processingStatus] = item._count.processingStatus;
    });

    const entityTypeCounts: Record<string, number> = {};
    byEntityType.forEach((item) => {
      entityTypeCounts[item.entityType || "UNKNOWN"] = item._count.entityType;
    });

    return {
      total,
      byStatus: statusCounts,
      byEntityType: entityTypeCounts,
      totalSize: sizeResult._sum.size || 0,
    };
  }
}

// Export singleton instance
export const fileAttachmentsService = new FileAttachmentsService();
