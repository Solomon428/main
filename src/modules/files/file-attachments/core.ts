import { prisma } from "@/db/prisma";
import { generateId, generateShortId } from "../../../utils/ids";
import { logAuditEvent } from "../../../observability/audit";
import { AuditAction } from "../../../domain/enums/AuditAction";
import { EntityType } from "../../../domain/enums/EntityType";
import { StorageProvider } from "../../../domain/enums/StorageProvider";
import crypto from "crypto";
import path from "path";
import { UploadFileInput, FileUploadResult, StorageStatistics } from "./types";

async function storeFile(
  content: Buffer,
  storagePath: string,
  provider?: StorageProvider,
): Promise<string> {
  const providerName = (provider || StorageProvider.LOCAL).toLowerCase();

  if (providerName === "local") {
    const fs = await import("fs");
    const uploadDir = process.env.UPLOAD_DIR || "./uploads";
    const fullPath = path.join(uploadDir, storagePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
    return `/api/files/${storagePath}`;
  }
  return `https://${providerName}.example.com/${storagePath}`;
}

async function generateThumbnail(
  content: Buffer,
  storagePath: string,
  fileType: string,
): Promise<string | undefined> {
  console.log(
    `[THUMBNAIL] Would generate thumbnail for ${storagePath} (${fileType})`,
  );
  return undefined;
}

async function retrieveFile(
  storagePath: string,
  provider: StorageProvider,
): Promise<Buffer> {
  const providerName = provider.toLowerCase();

  if (providerName === "local") {
    const fs = await import("fs");
    const uploadDir = process.env.UPLOAD_DIR || "./uploads";
    const fullPath = path.join(uploadDir, storagePath);
    return fs.readFileSync(fullPath);
  }
  throw new Error(`Retrieval from ${provider} not implemented`);
}

export async function uploadFile(
  organizationId: string,
  uploaderId: string,
  data: UploadFileInput,
): Promise<FileUploadResult> {
  const checksum = crypto
    .createHash("sha256")
    .update(data.content)
    .digest("hex");
  const date = new Date();
  const yearMonth = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}`;
  const uniqueId = generateShortId();
  const storagePath = `organizations/${organizationId}/${data.entityType.toLowerCase()}/${data.entityId}/${yearMonth}/${uniqueId}-${data.fileName}`;
  const url = await storeFile(data.content, storagePath, data.storageProvider);

  let thumbnailUrl: string | undefined;
  let previewUrl: string | undefined;

  if (
    data.fileType.startsWith("image/") ||
    data.fileType === "application/pdf"
  ) {
    thumbnailUrl = await generateThumbnail(
      data.content,
      storagePath,
      data.fileType,
    );
    previewUrl = url;
  }

  let deleteAfter: Date | undefined;
  if (data.retentionDays) {
    deleteAfter = new Date();
    deleteAfter.setDate(deleteAfter.getDate() + data.retentionDays);
  }

  const file = await prisma.fileAttachment.create({
    data: {
      id: generateId(),
      organizationId,
      entityType: data.entityType,
      entityId: data.entityId,
      uploaderId,
      fileName: data.fileName,
      originalName: data.originalName,
      fileType: data.fileType,
      fileExtension: data.fileExtension,
      fileSize: data.fileSize,
      checksum,
      storageProvider: data.storageProvider || StorageProvider.S3,
      storagePath,
      url,
      thumbnailUrl,
      previewUrl,
      processingStatus: "COMPLETED",
      retentionDays: data.retentionDays,
      deleteAfter,
      metadata: data.metadata || {},
    },
  });

  await logAuditEvent({
    userId: uploaderId,
    organizationId,
    action: AuditAction.CREATE,
    entityType: EntityType.FILE_ATTACHMENT,
    entityId: file.id,
    newValue: {
      fileName: file.originalName,
      fileSize: file.fileSize,
      entityType: file.entityType,
    },
  });

  return {
    id: file.id,
    url: file.url,
    thumbnailUrl: file.thumbnailUrl || undefined,
    previewUrl: file.previewUrl || undefined,
  };
}

export async function downloadFile(
  fileId: string,
  userId: string,
): Promise<{ content: Buffer; fileName: string; fileType: string }> {
  const file = await prisma.fileAttachment.findUnique({
    where: { id: fileId },
  });

  if (!file) {
    throw new Error("File not found");
  }

  if (file.deletedAt) {
    throw new Error("File has been deleted");
  }

  await prisma.fileAttachment.update({
    where: { id: fileId },
    data: {
      accessCount: { increment: 1 },
      lastAccessedAt: new Date(),
    },
  });

  const content = await retrieveFile(file.storagePath, file.storageProvider);

  await logAuditEvent({
    userId,
    organizationId: file.organizationId,
    action: AuditAction.DOWNLOAD,
    entityType: EntityType.FILE_ATTACHMENT,
    entityId: file.id,
    newValue: { fileName: file.originalName },
  });

  return {
    content,
    fileName: file.originalName,
    fileType: file.fileType,
  };
}

export async function getFile(fileId: string) {
  return prisma.fileAttachment.findUnique({
    where: { id: fileId },
    include: {
      uploader: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

export async function listFiles(
  entityType: EntityType,
  entityId: string,
  options?: {
    fileType?: string;
    page?: number;
    limit?: number;
    includeDeleted?: boolean;
  },
) {
  const page = options?.page || 1;
  const limit = options?.limit || 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    entityType,
    entityId,
  };

  if (options?.fileType) {
    where.fileType = { startsWith: options.fileType };
  }

  if (!options?.includeDeleted) {
    where.deletedAt = null;
  }

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
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function updateFile(
  fileId: string,
  data: {
    fileName?: string;
    metadata?: Record<string, unknown>;
    retentionDays?: number;
  },
  updatedBy: string,
) {
  const file = await prisma.fileAttachment.findUnique({
    where: { id: fileId },
  });

  if (!file) {
    throw new Error("File not found");
  }

  if (file.deletedAt) {
    throw new Error("Cannot update a deleted file");
  }

  const updated = await prisma.fileAttachment.update({
    where: { id: fileId },
    data: {
      fileName: data.fileName,
      metadata: data.metadata
        ? { ...file.metadata, ...data.metadata }
        : file.metadata,
      retentionDays: data.retentionDays,
      updatedAt: new Date(),
    },
  });

  await logAuditEvent({
    userId: updatedBy,
    organizationId: file.organizationId,
    action: AuditAction.UPDATE,
    entityType: EntityType.FILE_ATTACHMENT,
    entityId: file.id,
    newValue: { fileName: data.fileName },
  });

  return updated;
}

export async function deleteFile(fileId: string, deletedBy?: string) {
  const file = await prisma.fileAttachment.findUnique({
    where: { id: fileId },
  });

  if (!file) {
    throw new Error("File not found");
  }

  if (file.deletedAt) {
    return file;
  }

  const deleted = await prisma.fileAttachment.update({
    where: { id: fileId },
    data: {
      deletedAt: new Date(),
      deletedBy,
    },
  });

  if (deletedBy) {
    await logAuditEvent({
      userId: deletedBy,
      organizationId: file.organizationId,
      action: AuditAction.DELETE,
      entityType: EntityType.FILE_ATTACHMENT,
      entityId: file.id,
    });
  }

  return deleted;
}

export async function permanentlyDeleteFile(
  fileId: string,
  deletedBy?: string,
) {
  const file = await prisma.fileAttachment.findUnique({
    where: { id: fileId },
  });

  if (!file) {
    throw new Error("File not found");
  }

  await prisma.fileAttachment.delete({
    where: { id: fileId },
  });

  await logAuditEvent({
    userId: deletedBy || "system",
    organizationId: file.organizationId,
    action: AuditAction.DELETE,
    entityType: EntityType.FILE_ATTACHMENT,
    entityId: file.id,
    newValue: { action: "permanent_delete", fileName: file.originalName },
  });
}

export async function restoreFile(fileId: string, restoredBy: string) {
  const file = await prisma.fileAttachment.findUnique({
    where: { id: fileId },
  });

  if (!file) {
    throw new Error("File not found");
  }

  if (!file.deletedAt) {
    return file;
  }

  const restored = await prisma.fileAttachment.update({
    where: { id: fileId },
    data: {
      deletedAt: null,
      deletedBy: null,
    },
  });

  await logAuditEvent({
    userId: restoredBy,
    organizationId: file.organizationId,
    action: AuditAction.RESTORE,
    entityType: EntityType.FILE_ATTACHMENT,
    entityId: file.id,
  });

  return restored;
}

export async function verifyFileIntegrity(fileId: string): Promise<boolean> {
  const file = await prisma.fileAttachment.findUnique({
    where: { id: fileId },
  });

  if (!file) {
    throw new Error("File not found");
  }

  try {
    const content = await retrieveFile(file.storagePath, file.storageProvider);
    const checksum = crypto.createHash("sha256").update(content).digest("hex");
    return checksum === file.checksum;
  } catch {
    return false;
  }
}

export async function bulkDeleteFiles(
  fileIds: string[],
  deletedBy?: string,
): Promise<{ success: string[]; failed: { id: string; error: string }[] }> {
  const results: {
    success: string[];
    failed: { id: string; error: string }[];
  } = {
    success: [],
    failed: [],
  };

  for (const fileId of fileIds) {
    try {
      await deleteFile(fileId, deletedBy);
      results.success.push(fileId);
    } catch (error) {
      results.failed.push({
        id: fileId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}

export async function copyFile(
  sourceFileId: string,
  targetEntityType: EntityType,
  targetEntityId: string,
  copiedBy: string,
) {
  const sourceFile = await prisma.fileAttachment.findUnique({
    where: { id: sourceFileId },
  });

  if (!sourceFile) {
    throw new Error("Source file not found");
  }

  const newFile = await prisma.fileAttachment.create({
    data: {
      id: generateId(),
      organizationId: sourceFile.organizationId,
      entityType: targetEntityType,
      entityId: targetEntityId,
      uploaderId: copiedBy,
      fileName: sourceFile.fileName,
      originalName: sourceFile.originalName,
      fileType: sourceFile.fileType,
      fileExtension: sourceFile.fileExtension,
      fileSize: sourceFile.fileSize,
      checksum: sourceFile.checksum,
      storageProvider: sourceFile.storageProvider,
      storagePath: sourceFile.storagePath,
      url: sourceFile.url,
      metadata: sourceFile.metadata,
    },
  });

  await logAuditEvent({
    userId: copiedBy,
    organizationId: sourceFile.organizationId,
    action: AuditAction.CREATE,
    entityType: EntityType.FILE_ATTACHMENT,
    entityId: newFile.id,
    newValue: { action: "copy", sourceFileId },
  });

  return newFile;
}

export async function getStorageStatistics(
  organizationId: string,
): Promise<StorageStatistics> {
  const files = await prisma.fileAttachment.findMany({
    where: { organizationId, deletedAt: null },
  });

  const byType: Record<string, { count: number; size: number }> = {};
  const byOrganization: Record<string, { count: number; size: number }> = {};

  let totalSize = 0;

  for (const file of files) {
    totalSize += file.fileSize;

    const typeCategory = file.fileType.split("/")[0] || "other";
    if (!byType[typeCategory]) {
      byType[typeCategory] = { count: 0, size: 0 };
    }
    byType[typeCategory].count++;
    byType[typeCategory].size += file.fileSize;

    if (!byOrganization[file.organizationId]) {
      byOrganization[file.organizationId] = { count: 0, size: 0 };
    }
    byOrganization[file.organizationId].count++;
    byOrganization[file.organizationId].size += file.fileSize;
  }

  return {
    totalFiles: files.length,
    totalSize,
    byType,
    byOrganization,
  };
}

export async function cleanupExpiredFiles() {
  const expiredFiles = await prisma.fileAttachment.findMany({
    where: {
      deleteAfter: { lte: new Date() },
      deletedAt: null,
    },
  });

  const results = { deleted: 0, failed: 0 };

  for (const file of expiredFiles) {
    try {
      await permanentlyDeleteFile(file.id, "system-cleanup");
      results.deleted++;
    } catch {
      results.failed++;
    }
  }

  return results;
}
