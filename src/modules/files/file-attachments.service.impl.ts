import { prisma } from "../../lib/prisma";
import { generateId, generateShortId } from "../../utils/ids";
import { logAuditEvent } from "../../observability/audit";
import { AuditAction } from "../../domain/enums/AuditAction";
import { EntityType } from "../../domain/enums/EntityType";
import { StorageProvider } from "../../domain/enums/StorageProvider";
import { Currency } from "../../domain/enums/Currency";
import OcrService from "./ocr/core";
import ExtractionService from "./ocr/extraction/core";
import * as InvoiceService from "../invoices/invoices.service";
import crypto from "crypto";
import path from "path";

export interface UploadFileInput {
  fileName: string;
  originalName: string;
  fileType: string;
  fileExtension: string;
  fileSize: number;
  content: Buffer;
  entityType: EntityType;
  entityId: string;
  storageProvider?: StorageProvider;
  metadata?: Record<string, unknown>;
  retentionDays?: number;
}

export interface FileUploadResult {
  id: string;
  url: string;
  thumbnailUrl?: string;
  previewUrl?: string;
}

// Upload file
export async function uploadFile(
  organizationId: string,
  uploaderId: string,
  data: UploadFileInput,
): Promise<FileUploadResult> {
  // Calculate checksum
  const checksum = crypto
    .createHash("sha256")
    .update(data.content)
    .digest("hex");

  // Generate storage path
  const date = new Date();
  const yearMonth = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}`;
  const uniqueId = generateShortId();
  const storagePath = `organizations/${organizationId}/${data.entityType.toLowerCase()}/${data.entityId}/${yearMonth}/${uniqueId}-${data.fileName}`;

  // Upload to storage (in production, integrate with S3, Azure Blob, etc.)
  const url = await storeFile(data.content, storagePath, data.storageProvider);

  // Generate thumbnails for images and PDFs
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
    previewUrl = url; // For now, use same URL for preview
  }

  // Calculate delete after date if retention specified
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
      entityId: file.entityId,
    },
  });

  return {
    id: file.id,
    url: file.url,
    thumbnailUrl: file.thumbnailUrl || undefined,
    previewUrl: file.previewUrl || undefined,
  };
}

async function storeFile(
  content: Buffer,
  storagePath: string,
  provider?: StorageProvider,
): Promise<string> {
  // In production, implement actual storage logic
  // For now, return a mock URL
  const providerName = (provider || StorageProvider.LOCAL).toLowerCase();

  if (providerName === "local") {
    // Save to local uploads directory
    const fs = await import("fs");
    const uploadDir = process.env.UPLOAD_DIR || "./uploads";
    const fullPath = path.join(uploadDir, storagePath);

    // Ensure directory exists
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);

    return `/api/files/${storagePath}`;
  }

  // For cloud providers, return mock URL
  return `https://${providerName}.example.com/${storagePath}`;
}

async function generateThumbnail(
  content: Buffer,
  storagePath: string,
  fileType: string,
): Promise<string | undefined> {
  // In production, use ImageMagick, Sharp, or similar for image processing
  // For now, return undefined
  console.log(
    `[THUMBNAIL] Would generate thumbnail for ${storagePath} (${fileType})`,
  );
  return undefined;
}

// Download file
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

  // Record access
  await prisma.fileAttachment.update({
    where: { id: fileId },
    data: {
      accessCount: { increment: 1 },
      lastAccessedAt: new Date(),
    },
  });

  // Retrieve file content based on storage provider
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

async function retrieveFile(
  storagePath: string,
  provider: StorageProvider,
): Promise<Buffer> {
  // In production, implement actual retrieval logic
  const providerName = provider.toLowerCase();

  if (providerName === "local") {
    const fs = await import("fs");
    const uploadDir = process.env.UPLOAD_DIR || "./uploads";
    const fullPath = path.join(uploadDir, storagePath);
    return fs.readFileSync(fullPath);
  }

  // For cloud providers, would use their SDK
  throw new Error(`Retrieval from ${provider} not implemented`);
}

// Get file info
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

// List files for entity
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

// Update file metadata
export async function updateFile(
  fileId: string,
  data: {
    metadata?: Record<string, unknown>;
    retentionDays?: number;
  },
  updatedBy?: string,
) {
  const file = await prisma.fileAttachment.findUnique({
    where: { id: fileId },
  });

  if (!file) {
    throw new Error("File not found");
  }

  // Calculate new delete after date if retention changed
  let deleteAfter: Date | undefined = file.deleteAfter || undefined;
  if (data.retentionDays !== undefined) {
    deleteAfter = new Date();
    deleteAfter.setDate(deleteAfter.getDate() + data.retentionDays);
  }

  const updated = await prisma.fileAttachment.update({
    where: { id: fileId },
    data: {
      metadata: data.metadata
        ? { ...(file.metadata as Record<string, unknown>), ...data.metadata }
        : undefined,
      retentionDays: data.retentionDays,
      deleteAfter,
      updatedAt: new Date(),
    },
  });

  await logAuditEvent({
    userId: updatedBy,
    organizationId: file.organizationId,
    action: AuditAction.UPDATE,
    entityType: EntityType.FILE_ATTACHMENT,
    entityId: fileId,
    newValue: { retentionDays: data.retentionDays },
  });

  return updated;
}

// Soft delete file
export async function deleteFile(fileId: string, deletedBy?: string) {
  const file = await prisma.fileAttachment.update({
    where: { id: fileId },
    data: {
      deletedAt: new Date(),
      deletedBy,
    },
  });

  await logAuditEvent({
    userId: deletedBy,
    organizationId: file.organizationId,
    action: AuditAction.DELETE,
    entityType: EntityType.FILE_ATTACHMENT,
    entityId: fileId,
    oldValue: { fileName: file.originalName },
  });

  return file;
}

// Hard delete file (permanent deletion)
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

  // Delete from storage first
  await deleteFromStorage(file.storagePath, file.storageProvider);

  // Delete from database
  await prisma.fileAttachment.delete({
    where: { id: fileId },
  });

  await logAuditEvent({
    userId: deletedBy,
    organizationId: file.organizationId,
    action: AuditAction.DELETE,
    entityType: EntityType.FILE_ATTACHMENT,
    entityId: fileId,
    oldValue: { fileName: file.originalName, permanentlyDeleted: true },
  });

  return { success: true };
}

async function deleteFromStorage(
  storagePath: string,
  provider: StorageProvider,
): Promise<void> {
  const providerName = provider.toLowerCase();

  if (providerName === "local") {
    const fs = await import("fs");
    const uploadDir = process.env.UPLOAD_DIR || "./uploads";
    const fullPath = path.join(uploadDir, storagePath);

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
    return;
  }

  // For cloud providers, would use their SDK
  console.log(`[DELETE] Would delete from ${provider}: ${storagePath}`);
}

// Restore deleted file
export async function restoreFile(fileId: string, restoredBy?: string) {
  const file = await prisma.fileAttachment.update({
    where: { id: fileId },
    data: {
      deletedAt: null,
      deletedBy: null,
      updatedAt: new Date(),
    },
  });

  await logAuditEvent({
    userId: restoredBy,
    organizationId: file.organizationId,
    action: AuditAction.RESTORE,
    entityType: EntityType.FILE_ATTACHMENT,
    entityId: fileId,
    newValue: { fileName: file.originalName },
  });

  return file;
}

// Verify file integrity
export async function verifyFileIntegrity(fileId: string): Promise<boolean> {
  const file = await prisma.fileAttachment.findUnique({
    where: { id: fileId },
  });

  if (!file || file.deletedAt) {
    return false;
  }

  try {
    const content = await retrieveFile(file.storagePath, file.storageProvider);
    const currentChecksum = crypto
      .createHash("sha256")
      .update(content)
      .digest("hex");

    return currentChecksum === file.checksum;
  } catch {
    return false;
  }
}

// Bulk operations
export async function bulkDeleteFiles(
  fileIds: string[],
  deletedBy?: string,
  permanent = false,
) {
  const results = [];

  for (const fileId of fileIds) {
    try {
      const result = permanent
        ? await permanentlyDeleteFile(fileId, deletedBy)
        : await deleteFile(fileId, deletedBy);
      results.push({ fileId, success: true, result });
    } catch (error) {
      results.push({
        fileId,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return {
    results,
    summary: {
      total: results.length,
      success: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    },
  };
}

// Copy file to another entity
export async function copyFile(
  fileId: string,
  targetEntityType: EntityType,
  targetEntityId: string,
  copiedBy: string,
): Promise<FileUploadResult> {
  const sourceFile = await prisma.fileAttachment.findUnique({
    where: { id: fileId },
  });

  if (!sourceFile || sourceFile.deletedAt) {
    throw new Error("Source file not found");
  }

  // Retrieve source content
  const content = await retrieveFile(
    sourceFile.storagePath,
    sourceFile.storageProvider,
  );

  // Upload as new file
  return uploadFile(sourceFile.organizationId, copiedBy, {
    fileName: sourceFile.fileName,
    originalName: sourceFile.originalName,
    fileType: sourceFile.fileType,
    fileExtension: sourceFile.fileExtension,
    fileSize: sourceFile.fileSize,
    content,
    entityType: targetEntityType,
    entityId: targetEntityId,
    storageProvider: sourceFile.storageProvider,
    metadata: {
      ...((sourceFile.metadata as Record<string, unknown>) || {}),
      copiedFrom: fileId,
      copiedAt: new Date().toISOString(),
    },
    retentionDays: sourceFile.retentionDays || undefined,
  });
}

// Get storage statistics
export async function getStorageStatistics(organizationId: string) {
  const stats = await prisma.fileAttachment.groupBy({
    by: ["fileType"],
    where: {
      organizationId,
      deletedAt: null,
    },
    _sum: { fileSize: true },
    _count: { id: true },
  });

  const totalSize = await prisma.fileAttachment.aggregate({
    where: {
      organizationId,
      deletedAt: null,
    },
    _sum: { fileSize: true },
  });

  const totalCount = await prisma.fileAttachment.count({
    where: {
      organizationId,
      deletedAt: null,
    },
  });

  return {
    byType: stats,
    totalSize: totalSize._sum.fileSize || 0,
    totalCount,
  };
}

// Cleanup expired files
export async function cleanupExpiredFiles() {
  const now = new Date();

  const expiredFiles = await prisma.fileAttachment.findMany({
    where: {
      deleteAfter: { lt: now },
      deletedAt: null,
    },
  });

  const results = [];
  for (const file of expiredFiles) {
    try {
      await permanentlyDeleteFile(file.id, "system");
      results.push({ fileId: file.id, success: true });
    } catch (error) {
      results.push({
        fileId: file.id,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return {
    results,
    summary: {
      total: results.length,
      success: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    },
  };
}

// ============================================================================
// PDF Processing and OCR Integration Methods
// ============================================================================

export interface InvoiceUploadInput {
  file: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
  organizationId: string;
  uploadedById: string;
  supplierId?: string;
  autoProcess?: boolean;
  extractionMethod?: "ocr" | "manual" | "hybrid";
}

export interface InvoiceUploadResult {
  fileAttachmentId: string;
  extractionId?: string;
  invoiceId?: string;
  status: "pending" | "processing" | "completed" | "failed";
  extractedData?: any;
  confidence?: number;
  message: string;
  warnings: string[];
  errors: string[];
}

export interface ProcessingProgress {
  stage:
    | "uploading"
    | "ocr"
    | "extracting"
    | "validating"
    | "creating"
    | "completed"
    | "failed";
  progress: number;
  message: string;
  details?: Record<string, any>;
}

// Upload and process invoice file with OCR
export async function uploadAndProcessInvoice(
  input: InvoiceUploadInput,
  progressCallback?: (progress: ProcessingProgress) => void,
): Promise<InvoiceUploadResult> {
  const startTime = Date.now();
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    // Update progress
    progressCallback?.({
      stage: "uploading",
      progress: 10,
      message: "Uploading file to storage",
    });

    // Validate file
    validateInvoiceFile(input.file, input.mimeType, input.size);

    // Generate file metadata
    const fileExtension = path
      .extname(input.originalName)
      .toLowerCase()
      .slice(1);
    const fileName = `${generateShortId()}-${input.originalName}`;
    const fileType = input.mimeType;

    // Upload file first
    const uploadResult = await uploadFile(
      input.organizationId,
      input.uploadedById,
      {
        fileName,
        originalName: input.originalName,
        fileType,
        fileExtension,
        fileSize: input.size,
        content: input.file,
        entityType: EntityType.INVOICE,
        entityId: "pending", // Will be updated after invoice creation
        storageProvider: StorageProvider.S3,
        metadata: {
          uploadedFor: "invoice_processing",
          extractionMethod: input.extractionMethod || "ocr",
          uploadTimestamp: new Date().toISOString(),
        },
        retentionDays: 2555, // 7 years for compliance
      },
    );

    // If auto-process is disabled, return pending status
    if (input.autoProcess === false) {
      return {
        fileAttachmentId: uploadResult.id,
        status: "pending",
        message: "File uploaded successfully. OCR processing pending.",
        warnings,
        errors,
      };
    }

    // Process with OCR
    progressCallback?.({
      stage: "ocr",
      progress: 30,
      message: "Running OCR to extract text from document",
    });

    const ocrService = new OcrService({
      provider: "tesseract",
      language: "eng",
      confidenceThreshold: 70,
    });

    await ocrService.initialize();

    const ocrResult = await ocrService.extractTextFromFile(
      input.file,
      input.originalName,
      input.mimeType,
      undefined,
      (ocrProgress) => {
        progressCallback?.({
          stage: "ocr",
          progress: 30 + Math.floor(ocrProgress.progress * 0.3),
          message: ocrProgress.message,
          details: ocrProgress.details,
        });
      },
    );

    await ocrService.shutdown();

    if (!ocrResult.success || !ocrResult.text) {
      errors.push("OCR extraction failed or produced no text");
      return {
        fileAttachmentId: uploadResult.id,
        status: "failed",
        message: "OCR extraction failed",
        warnings,
        errors,
      };
    }

    // Validate OCR quality
    const validation = await ocrService.validateExtractionQuality(
      ocrResult.text,
      [
        /invoice/i,
        /total.*\d+[\.,]\d{2}/i,
        /date.*\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/i,
      ],
    );

    if (!validation.isValid) {
      warnings.push(...validation.suggestions);
      warnings.push(
        "OCR extraction quality is low - manual review recommended",
      );
    }

    // Extract invoice data
    progressCallback?.({
      stage: "extracting",
      progress: 60,
      message: "Parsing extracted text for invoice data",
    });

    const extractionService = new ExtractionService({
      confidenceThreshold: 70,
      defaultCurrency: Currency.ZAR,
    });

    const extractionResult = await extractionService.parseInvoice(
      ocrResult.text,
      uploadResult.id,
      input.organizationId,
      (extractProgress) => {
        progressCallback?.({
          stage: "extracting",
          progress: 60 + Math.floor(extractProgress.progress * 0.1),
          message: extractProgress.message,
          details: extractProgress.details,
        });
      },
    );

    // Save extraction result
    const extractionId = await extractionService.saveExtractionResult(
      extractionResult,
      uploadResult.id,
      input.uploadedById,
      input.organizationId,
    );

    // Validate extraction
    progressCallback?.({
      stage: "validating",
      progress: 75,
      message: "Validating extracted invoice data",
    });

    if (!extractionResult.success) {
      warnings.push("Invoice extraction validation failed");
      warnings.push(
        ...extractionResult.validation.issues.map((i) => i.message),
      );
    }

    // Create invoice if extraction was successful enough
    let invoiceId: string | undefined;

    if (extractionResult.success && extractionResult.data.confidence >= 60) {
      progressCallback?.({
        stage: "creating",
        progress: 85,
        message: "Creating invoice from extracted data",
      });

      try {
        const invoiceService = new InvoiceService();
        const invoiceData = {
          organizationId: input.organizationId,
          supplierId:
            input.supplierId || extractionResult.data.supplierVatNumber || "",
          invoiceNumber:
            extractionResult.data.invoiceNumber || `AUTO-${generateShortId()}`,
          referenceNumber: extractionResult.data.referenceNumber,
          invoiceDate: extractionResult.data.issueDate || new Date(),
          dueDate:
            extractionResult.data.dueDate ||
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          currency: extractionResult.data.currency || Currency.ZAR,
          totalAmount: extractionResult.data.totalAmount?.toString() || "0",
          subtotalExclVAT:
            extractionResult.data.subtotalAmount?.toString() || "0",
          vatAmount: extractionResult.data.taxAmount?.toString() || "0",
          notes: extractionResult.data.notes,
          lineItems: extractionResult.data.lineItems.map((item, index) => ({
            lineNumber: index + 1,
            description: item.description,
            quantity: item.quantity.toString(),
            unitPrice: item.unitPrice.toString(),
            vatRate: item.taxRate?.toString() || "15",
            totalAmount: item.totalAmount.toString(),
          })),
          createdById: input.uploadedById,
          source: "OCR",
        };

        const invoiceResult = await invoiceService.createInvoice(invoiceData);
        invoiceId = invoiceResult.invoice.id;

        // Update file attachment with invoice ID
        await prisma.fileAttachment.update({
          where: { id: uploadResult.id },
          data: {
            entityId: invoiceId,
            processingStatus: "COMPLETED",
          },
        });
      } catch (invoiceError) {
        errors.push(
          `Failed to create invoice: ${invoiceError instanceof Error ? invoiceError.message : "Unknown error"}`,
        );
        warnings.push(
          "Invoice extraction completed but invoice creation failed - manual review required",
        );
      }
    } else {
      warnings.push(
        `Extraction confidence too low (${extractionResult.data.confidence.toFixed(1)}%) - manual review required`,
      );
    }

    const processingTime = Date.now() - startTime;

    progressCallback?.({
      stage: "completed",
      progress: 100,
      message: invoiceId
        ? "Invoice processed and created successfully"
        : "File processed but invoice creation requires manual review",
      details: {
        extractionId,
        invoiceId,
        confidence: extractionResult.data.confidence,
        processingTime,
      },
    });

    return {
      fileAttachmentId: uploadResult.id,
      extractionId,
      invoiceId,
      status: invoiceId ? "completed" : "failed",
      extractedData: extractionResult.data,
      confidence: extractionResult.data.confidence,
      message: invoiceId
        ? "Invoice processed and created successfully"
        : "File processed but invoice creation requires manual review",
      warnings,
      errors,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    errors.push(errorMessage);

    progressCallback?.({
      stage: "failed",
      progress: 100,
      message: `Processing failed: ${errorMessage}`,
    });

    return {
      fileAttachmentId: "",
      status: "failed",
      message: `Processing failed: ${errorMessage}`,
      warnings,
      errors,
    };
  }
}

// Validate invoice file
function validateInvoiceFile(
  file: Buffer,
  mimeType: string,
  size: number,
): void {
  const maxSize = 50 * 1024 * 1024; // 50MB
  const allowedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/tiff",
    "image/bmp",
    "image/webp",
  ];
  const allowedExtensions = [
    "pdf",
    "jpg",
    "jpeg",
    "png",
    "tiff",
    "tif",
    "bmp",
    "webp",
  ];

  if (size > maxSize) {
    throw new Error(`File size ${size} bytes exceeds maximum ${maxSize} bytes`);
  }

  if (!allowedTypes.includes(mimeType.toLowerCase())) {
    throw new Error(
      `File type ${mimeType} is not supported. Allowed types: ${allowedTypes.join(", ")}`,
    );
  }

  if (!Buffer.isBuffer(file) || file.length === 0) {
    throw new Error("File buffer is empty or invalid");
  }

  // Basic magic number check for PDF
  if (mimeType === "application/pdf") {
    const header = file.slice(0, 5).toString();
    if (!header.startsWith("%PDF-")) {
      throw new Error(
        "File does not appear to be a valid PDF (missing PDF header)",
      );
    }
  }
}

// Get file with OCR text
export async function getFileWithOcrText(fileId: string) {
  const file = await prisma.fileAttachment.findUnique({
    where: { id: fileId },
    include: {
      uploader: {
        select: { id: true, name: true, email: true },
      },
      invoiceExtraction: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!file) {
    throw new Error("File not found");
  }

  return file;
}

// Retry OCR processing for a file
export async function retryOcrProcessing(
  fileId: string,
  userId: string,
  options?: {
    extractionMethod?: "ocr" | "manual" | "hybrid";
    progressCallback?: (progress: ProcessingProgress) => void;
  },
): Promise<InvoiceUploadResult> {
  const file = await prisma.fileAttachment.findUnique({
    where: { id: fileId },
  });

  if (!file) {
    throw new Error("File not found");
  }

  if (file.deletedAt) {
    throw new Error("File has been deleted");
  }

  // Download file content
  const { content } = await downloadFile(fileId, userId);

  // Re-process
  return uploadAndProcessInvoice(
    {
      file: content,
      originalName: file.originalName,
      mimeType: file.fileType,
      size: file.fileSize,
      organizationId: file.organizationId,
      uploadedById: userId,
      autoProcess: true,
      extractionMethod: options?.extractionMethod || "ocr",
    },
    options?.progressCallback,
  );
}

// Get processing queue status
export async function getProcessingQueueStatus(organizationId: string) {
  const pendingFiles = await prisma.fileAttachment.count({
    where: {
      organizationId,
      entityType: EntityType.INVOICE,
      processingStatus: "PENDING",
      deletedAt: null,
    },
  });

  const processingFiles = await prisma.fileAttachment.count({
    where: {
      organizationId,
      entityType: EntityType.INVOICE,
      processingStatus: "PROCESSING",
      deletedAt: null,
    },
  });

  const completedFiles = await prisma.fileAttachment.count({
    where: {
      organizationId,
      entityType: EntityType.INVOICE,
      processingStatus: "COMPLETED",
      deletedAt: null,
    },
  });

  const failedFiles = await prisma.fileAttachment.count({
    where: {
      organizationId,
      entityType: EntityType.INVOICE,
      processingStatus: "FAILED",
      deletedAt: null,
    },
  });

  const recentExtractions = await prisma.invoiceExtraction.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      success: true,
      confidence: true,
      processingTime: true,
      createdAt: true,
      fileAttachment: {
        select: {
          originalName: true,
        },
      },
    },
  });

  return {
    queue: {
      pending: pendingFiles,
      processing: processingFiles,
      completed: completedFiles,
      failed: failedFiles,
    },
    recentExtractions,
  };
}

// Bulk reprocess failed extractions
export async function bulkReprocessFailed(
  organizationId: string,
  userId: string,
  fileIds?: string[],
): Promise<{
  results: Array<{ fileId: string; success: boolean; message: string }>;
  summary: { total: number; success: number; failed: number };
}> {
  const where: any = {
    organizationId,
    entityType: EntityType.INVOICE,
    processingStatus: "FAILED",
    deletedAt: null,
  };

  if (fileIds && fileIds.length > 0) {
    where.id = { in: fileIds };
  }

  const failedFiles = await prisma.fileAttachment.findMany({
    where,
    take: 50, // Limit to prevent overwhelming the system
  });

  const results = [];

  for (const file of failedFiles) {
    try {
      const result = await retryOcrProcessing(file.id, userId);
      results.push({
        fileId: file.id,
        success: result.status === "completed",
        message: result.message,
      });
    } catch (error) {
      results.push({
        fileId: file.id,
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return {
    results,
    summary: {
      total: results.length,
      success: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    },
  };
}
