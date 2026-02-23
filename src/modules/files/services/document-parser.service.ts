import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";
import { AppError } from "@/lib/errors";
import { FileAttachmentWithRelations } from "../types/file-types";
import { auditService } from "@/lib/audit/audit.service";
import { AuditAction, EntityType } from "@/domain/enums";
import { OcrService } from "../ocr/ocr.service";
import {
  ExtractionService,
  ExtractedInvoiceData,
} from "../ocr/extraction.service";

export interface ParseDocumentInput {
  fileId: string;
  userId: string;
  organizationId: string;
  documentType?: "invoice" | "receipt" | "purchase_order" | "unknown";
  options?: {
    autoProcess?: boolean;
    extractionMode?: "standard" | "aggressive";
    preferredLanguage?: string;
  };
}

export interface ParseDocumentResult {
  success: boolean;
  fileId: string;
  documentType: string;
  extractedData: ExtractedInvoiceData | null;
  confidence: number;
  processingTime: number;
  text: string;
  warnings: string[];
}

export interface ReprocessDocumentInput {
  fileId: string;
  userId: string;
  organizationId: string;
  options?: {
    useAdvancedOCR?: boolean;
    extractionMode?: "standard" | "aggressive";
  };
}

export class DocumentParserService {
  private ocrService: OcrService;
  private extractionService: ExtractionService;

  constructor() {
    this.ocrService = new OcrService();
    this.extractionService = new ExtractionService({
      confidenceThreshold: 0.6,
      enablePatternLearning: true,
    });
  }

  async parseDocument(input: ParseDocumentInput): Promise<ParseDocumentResult> {
    const startTime = Date.now();
    const warnings: string[] = [];

    try {
      // Get file from database
      const file = await prisma.fileAttachment.findUnique({
        where: { id: input.fileId },
      });

      if (!file) {
        throw new AppError("File not found", "FILE_NOT_FOUND", 404);
      }

      if (file.organizationId !== input.organizationId) {
        throw new AppError("Access denied to file", "ACCESS_DENIED", 403);
      }

      // Update file status to processing
      await prisma.fileAttachment.update({
        where: { id: input.fileId },
        data: { processingStatus: "PROCESSING" },
      });

      // Get file buffer (from storage)
      const fileBuffer = await this.getFileBuffer(file);

      // Perform OCR
      const ocrResult = await this.ocrService.extractTextFromFile(
        fileBuffer,
        file.fileName,
        file.mimeType,
        input.fileId,
      );

      if (!ocrResult.success) {
        await this.updateFileStatus(input.fileId, FileStatus.ERROR, {
          error: "OCR extraction failed",
        });
        throw new AppError("OCR extraction failed", "OCR_FAILED", 422);
      }

      // Extract structured data
      const extractionResult = await this.extractionService.parseInvoice(
        ocrResult.text,
        input.fileId,
        input.organizationId,
      );

      // Determine document type
      const documentType =
        input.documentType || this.detectDocumentType(ocrResult.text);

      // Update file with extraction results
      await prisma.fileAttachment.update({
        where: { id: input.fileId },
        data: {
          processingStatus: extractionResult.success ? "COMPLETED" : "ERROR",
          metadata: {
            ...((file.metadata as Record<string, unknown>) || {}),
            ocrResult: {
              text: ocrResult.text,
              confidence: ocrResult.confidence,
              pages: ocrResult.pages,
              processingTime: ocrResult.processingTime,
            },
            extractionResult: extractionResult.success
              ? {
                  data: extractionResult.data,
                  validation: extractionResult.validation,
                }
              : undefined,
          },
        },
      });

      // Create audit log
      await auditService.createLog({
        action: AuditAction.DOCUMENT_PROCESSED,
        entityType: EntityType.FILE_ATTACHMENT,
        entityId: input.fileId,
        userId: input.userId,
        organizationId: input.organizationId,
        metadata: {
          documentType,
          confidence: extractionResult.data?.confidence,
          extractionSuccess: extractionResult.success,
        },
      });

      const processingTime = Date.now() - startTime;

      return {
        success: extractionResult.success,
        fileId: input.fileId,
        documentType,
        extractedData: extractionResult.data,
        confidence: extractionResult.data?.confidence || 0,
        processingTime,
        text: ocrResult.text,
        warnings,
      };
    } catch (error) {
      logger.error({ error, fileId: input.fileId }, "Document parsing failed");

      await this.updateFileStatus(input.fileId, FileStatus.ERROR, {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw error;
    }
  }

  async reprocessDocument(
    input: ReprocessDocumentInput,
  ): Promise<ParseDocumentResult> {
    // Get existing file
    const file = await prisma.fileAttachment.findUnique({
      where: { id: input.fileId },
    });

    if (!file) {
      throw new AppError("File not found", "FILE_NOT_FOUND", 404);
    }

    // Reset status and reprocess
    await prisma.fileAttachment.update({
      where: { id: input.fileId },
      data: { processingStatus: "PENDING" },
    });

    return this.parseDocument({
      fileId: input.fileId,
      userId: input.userId,
      organizationId: input.organizationId,
      options: {
        extractionMode: input.options?.extractionMode || "aggressive",
      },
    });
  }

  async getExtractionResult(
    fileId: string,
    organizationId: string,
  ): Promise<{
    file: FileAttachmentWithRelations;
    extraction: ParseDocumentResult | null;
  }> {
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
      throw new AppError("Access denied", "ACCESS_DENIED", 403);
    }

    const metadata =
      (file.metadata as {
        ocrResult?: {
          text: string;
          confidence: number;
          pages: number;
          processingTime: number;
        };
        extractionResult?: { data: ExtractedInvoiceData; validation: unknown };
      }) || {};

    const extraction = metadata.ocrResult
      ? {
          success: file.processingStatus === "COMPLETED",
          fileId: file.id,
          documentType: this.detectDocumentType(metadata.ocrResult.text),
          extractedData: metadata.extractionResult?.data || null,
          confidence: metadata.ocrResult.confidence,
          processingTime: metadata.ocrResult.processingTime,
          text: metadata.ocrResult.text,
          warnings: [],
        }
      : null;

    return { file, extraction };
  }

  async bulkReprocess(
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
        await this.reprocessDocument({
          fileId,
          userId,
          organizationId,
        });
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

  private async getFileBuffer(
    file: FileAttachmentWithRelations,
  ): Promise<Buffer> {
    // This would typically fetch from S3, local storage, etc.
    // For now, throw an error as this needs implementation based on storage solution
    throw new AppError(
      "File storage retrieval not implemented",
      "STORAGE_NOT_IMPLEMENTED",
      501,
    );
  }

  private async updateFileStatus(
    fileId: string,
    status: FileStatus,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await prisma.fileAttachment.update({
      where: { id: fileId },
      data: {
        status,
        ...(metadata && {
          metadata: {
            ...metadata,
          },
        }),
      },
    });
  }

  private detectDocumentType(text: string): string {
    const lowerText = text.toLowerCase();

    if (
      lowerText.includes("invoice") ||
      lowerText.includes("factuur") ||
      lowerText.includes("rechnung")
    ) {
      return "invoice";
    }

    if (
      lowerText.includes("purchase order") ||
      lowerText.includes("po #") ||
      lowerText.includes("bestelling")
    ) {
      return "purchase_order";
    }

    if (
      lowerText.includes("receipt") ||
      lowerText.includes("bon") ||
      lowerText.includes("quittung")
    ) {
      return "receipt";
    }

    return "unknown";
  }
}

// Export singleton instance
export const documentParserService = new DocumentParserService();
