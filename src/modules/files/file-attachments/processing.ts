import { OcrService } from "../ocr/ocr.service";
import { ExtractionService } from "../ocr/extraction.service";
import { InvoiceService } from "../../invoices/invoices.service";
import { Currency } from "../../../domain/enums/Currency";
import { EntityType } from "../../../domain/enums/EntityType";
import { StorageProvider } from "../../../domain/enums/StorageProvider";
import { prisma } from "@/db/prisma";
import { generateShortId } from "../../../utils/ids";
import {
  InvoiceUploadInput,
  InvoiceUploadResult,
  ProcessingProgress,
} from "./types";
import { uploadFile, downloadFile } from "./core";

function validateInvoiceFile(
  file: Buffer,
  mimeType: string,
  size: number,
): void {
  const maxSize = 50 * 1024 * 1024;
  const allowedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/tiff",
    "image/bmp",
    "image/webp",
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

  if (mimeType === "application/pdf") {
    const header = file.slice(0, 5).toString();
    if (!header.startsWith("%PDF-")) {
      throw new Error(
        "File does not appear to be a valid PDF (missing PDF header)",
      );
    }
  }
}

export async function uploadAndProcessInvoice(
  input: InvoiceUploadInput,
  progressCallback?: (progress: ProcessingProgress) => void,
): Promise<InvoiceUploadResult> {
  const startTime = Date.now();
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    progressCallback?.({
      stage: "uploading",
      progress: 10,
      message: "Uploading file to storage",
    });

    validateInvoiceFile(input.file, input.mimeType, input.size);

    const fileExtension = require("path")
      .extname(input.originalName)
      .toLowerCase()
      .slice(1);
    const fileName = `${generateShortId()}-${input.originalName}`;
    const fileType = input.mimeType;

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
        entityId: "pending",
        storageProvider: StorageProvider.S3,
        metadata: {
          uploadedFor: "invoice_processing",
          extractionMethod: input.extractionMethod || "ocr",
          uploadTimestamp: new Date().toISOString(),
        },
        retentionDays: 2555,
      },
    );

    if (input.autoProcess === false) {
      return {
        fileAttachmentId: uploadResult.id,
        status: "pending",
        message: "File uploaded successfully. OCR processing pending.",
        warnings,
        errors,
      };
    }

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

    const extractionId = await extractionService.saveExtractionResult(
      extractionResult,
      uploadResult.id,
      input.uploadedById,
      input.organizationId,
    );

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
          lineItems: extractionResult.data.lineItems.map(
            (item: any, index: number) => ({
              lineNumber: index + 1,
              description: item.description,
              quantity: item.quantity.toString(),
              unitPrice: item.unitPrice.toString(),
              vatRate: item.taxRate?.toString() || "15",
              totalAmount: item.totalAmount.toString(),
            }),
          ),
          createdById: input.uploadedById,
          source: "OCR",
        };

        const invoiceResult = await invoiceService.createInvoice(invoiceData);
        invoiceId = invoiceResult.invoice.id;

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

  const { content } = await downloadFile(fileId, userId);

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

export async function getProcessingQueueStatus(organizationId: string) {
  const [
    pendingFiles,
    processingFiles,
    completedFiles,
    failedFiles,
    recentExtractions,
  ] = await Promise.all([
    prisma.fileAttachment.count({
      where: {
        organizationId,
        entityType: EntityType.INVOICE,
        processingStatus: "PENDING",
        deletedAt: null,
      },
    }),
    prisma.fileAttachment.count({
      where: {
        organizationId,
        entityType: EntityType.INVOICE,
        processingStatus: "PROCESSING",
        deletedAt: null,
      },
    }),
    prisma.fileAttachment.count({
      where: {
        organizationId,
        entityType: EntityType.INVOICE,
        processingStatus: "COMPLETED",
        deletedAt: null,
      },
    }),
    prisma.fileAttachment.count({
      where: {
        organizationId,
        entityType: EntityType.INVOICE,
        processingStatus: "FAILED",
        deletedAt: null,
      },
    }),
    prisma.invoiceExtraction.findMany({
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
            id: true,
            fileName: true,
          },
        },
      },
    }),
  ]);

  return {
    pending: pendingFiles,
    processing: processingFiles,
    completed: completedFiles,
    failed: failedFiles,
    recentExtractions,
  };
}

export async function bulkReprocessFailed(
  fileIds: string[],
  userId: string,
  options?: {
    extractionMethod?: "ocr" | "manual" | "hybrid";
    progressCallback?: (progress: ProcessingProgress) => void;
  },
): Promise<{ success: string[]; failed: { id: string; error: string }[] }> {
  const results = {
    success: [] as string[],
    failed: [] as { id: string; error: string }[],
  };

  for (let i = 0; i < fileIds.length; i++) {
    const fileId = fileIds[i];
    try {
      await retryOcrProcessing(fileId, userId, options);
      results.success.push(fileId);
      progressCallback?.({
        stage: "processing",
        progress: Math.floor(((i + 1) / fileIds.length) * 100),
        message: `Processed ${i + 1} of ${fileIds.length} files`,
      });
    } catch (error) {
      results.failed.push({
        id: fileId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}
