import { z } from "zod";
import { Decimal } from "decimal.js";
import { isAfter } from "date-fns";
import { prisma } from "@/db/prisma";
import { systemLogger } from "../../../observability/logger";
import { metrics } from "../../../observability/metrics";
import { generateId } from "../../../utils/ids";
import { validateCurrency } from "../../../utils/money";
import { validateEmail, validateVAT } from "../../../utils/validation";
import { Currency } from "../../../domain/enums/Currency";

import type {
  ExtractedInvoiceData,
  ExtractionConfig,
  ExtractionResult,
  ExtractionProgress,
  ExtractedLineItem,
} from "./types";
import {
  ExtractionServiceError,
  ExtractionValidationError,
  ExtractionParsingError,
  ExtractionEnrichmentError,
} from "./types";

import { createDefaultConfig } from "./constants";
import { createValidationSchemas } from "./parsers";
import { validateExtractedData } from "./extractors/invoice-extractor";
import { extractWithRegexInternal as extractWithRegex } from "./extractors/table-extractor";
import {
  parseDateString,
  parseAmountString,
  extractSupplierName,
  calculateMissingAmounts,
} from "./extractors/field-extractor";
import { calculateOverallConfidence } from "./confidence";

export class ExtractionService {
  private readonly logger: typeof systemLogger;
  private readonly metrics: typeof metrics;
  private readonly config: ExtractionConfig;
  private readonly schemas: ReturnType<typeof createValidationSchemas>;

  constructor(
    config?: Partial<ExtractionConfig>,
    logger?: typeof systemLogger,
    metricsInstance?: typeof metrics,
  ) {
    this.logger = logger || systemLogger;
    this.metrics = metricsInstance || metrics;
    this.config = createDefaultConfig(config);
    this.schemas = createValidationSchemas();
  }

  async parseInvoice(
    extractedText: string,
    fileId?: string,
    organizationId?: string,
    progressCallback?: (progress: ExtractionProgress) => void,
  ): Promise<ExtractionResult> {
    const startTime = Date.now();
    const jobId = generateId();

    try {
      this.logger.info("Starting invoice parsing", {
        jobId,
        fileId,
        organizationId,
        textLength: extractedText.length,
      });

      this.updateProgress(progressCallback, {
        stage: "parsing",
        progress: 10,
        message: "Starting invoice data extraction",
        timestamp: new Date(),
      });

      const extractedData = await extractWithRegex(
        extractedText,
        this.config,
        this.logger,
      );

      this.updateProgress(progressCallback, {
        stage: "parsing",
        progress: 40,
        message: "Basic data extracted, now validating",
        details: {
          invoiceNumber: extractedData.invoiceNumber,
          totalAmount: extractedData.totalAmount?.toString(),
          lineItems: extractedData.lineItems.length,
        },
        timestamp: new Date(),
      });

      const validation = await validateExtractedData(
        extractedData,
        this.config,
        this.logger,
      );

      this.updateProgress(progressCallback, {
        stage: "validating",
        progress: 60,
        message: "Data validated, now matching with existing records",
        details: {
          validationScore: validation.score,
          issues: validation.issues.length,
        },
        timestamp: new Date(),
      });

      if (organizationId) {
        extractedData.lineItems = await this.enrichLineItems(
          extractedData.lineItems,
          organizationId,
        );
      }

      this.updateProgress(progressCallback, {
        stage: "enriching",
        progress: 80,
        message: "Data enriched, finalizing extraction",
        timestamp: new Date(),
      });

      if (extractedData.lineItems.length > 0) {
        extractedData.lineItems = calculateMissingAmounts(
          extractedData.lineItems,
        );
      }

      const overallConfidence = calculateOverallConfidence(
        { data: extractedData, validationScore: validation.score },
        this.config,
      );

      const processingTime = Date.now() - startTime;
      const result: ExtractionResult = {
        success: overallConfidence >= this.config.confidenceThreshold,
        data: {
          ...extractedData,
          confidence: overallConfidence,
        },
        processingTime,
        pagesProcessed: 1,
        textLength: extractedText.length,
        validation,
      };

      await this.logExtraction({
        jobId,
        fileId,
        organizationId,
        success: result.success,
        confidence: overallConfidence,
        processingTime,
        invoiceNumber: extractedData.invoiceNumber,
        totalAmount: extractedData.totalAmount?.toString(),
        lineItemsCount: extractedData.lineItems.length,
        validationScore: validation.score,
        issuesCount: validation.issues.length,
      });

      this.metrics.incrementCounter("invoice.extractions.completed", 1, {
        success: result.success,
        method: extractedData.extractionMethod,
        confidence: Math.floor(overallConfidence),
      });

      this.updateProgress(progressCallback, {
        stage: "completed",
        progress: 100,
        message: result.success
          ? `Invoice extraction completed with ${overallConfidence.toFixed(1)}% confidence`
          : `Invoice extraction completed with low confidence (${overallConfidence.toFixed(1)}%)`,
        details: {
          success: result.success,
          confidence: overallConfidence,
          invoiceNumber: extractedData.invoiceNumber,
          lineItems: extractedData.lineItems.length,
        },
        timestamp: new Date(),
      });

      this.logger.info("Invoice parsing completed", {
        jobId,
        success: result.success,
        confidence: overallConfidence,
        processingTime,
        invoiceNumber: extractedData.invoiceNumber,
      });

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error("Failed to parse invoice", {
        jobId,
        fileId,
        processingTime,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });

      this.updateProgress(progressCallback, {
        stage: "failed",
        progress: 100,
        message: `Invoice parsing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: new Date(),
      });

      this.metrics.incrementCounter("invoice.extractions.failed", 1, {
        errorType:
          error instanceof ExtractionServiceError ? error.code : "UNKNOWN",
      });

      if (error instanceof ExtractionServiceError) {
        throw error;
      }

      throw new ExtractionParsingError(
        "Failed to parse invoice",
        { fileId, processingTime },
        error instanceof Error ? error : undefined,
      );
    }
  }

  async saveExtractionResult(
    result: ExtractionResult,
    fileAttachmentId: string,
    userId: string,
    organizationId: string,
  ): Promise<string> {
    try {
      const extractionId = generateId();

      await prisma.invoiceExtraction.create({
        data: {
          id: extractionId,
          fileAttachmentId,
          organizationId,
          userId,
          success: result.success,
          confidence: result.data.confidence,
          processingTime: result.processingTime,
          pagesProcessed: result.pagesProcessed,
          textLength: result.textLength,
          extractionMethod: result.data.extractionMethod,
          validationScore: result.validation.score,
          extractedData: result.data as any,
          rawText: "REDACTED",
          metadata: {
            validationIssues: result.validation.issues,
            savedAt: new Date().toISOString(),
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      this.logger.info("Extraction result saved", {
        extractionId,
        fileAttachmentId,
        confidence: result.data.confidence,
        validationScore: result.validation.score,
      });

      return extractionId;
    } catch (error) {
      this.logger.error("Failed to save extraction result", {
        fileAttachmentId,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw new ExtractionServiceError(
        "Failed to save extraction result",
        "SAVE_FAILED",
        { fileAttachmentId },
        error instanceof Error ? error : undefined,
      );
    }
  }

  private async enrichLineItems(
    lineItems: ExtractedLineItem[],
    _organizationId: string,
  ): Promise<ExtractedLineItem[]> {
    return lineItems;
  }

  private updateProgress(
    callback: ((progress: ExtractionProgress) => void) | undefined,
    progress: ExtractionProgress,
  ): void {
    if (callback) {
      try {
        callback(progress);
      } catch (error) {
        this.logger.warn("Failed to call progress callback", {
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }

  private async logExtraction(logData: {
    jobId: string;
    fileId?: string;
    organizationId?: string;
    success: boolean;
    confidence: number;
    processingTime: number;
    invoiceNumber?: string;
    totalAmount?: string;
    lineItemsCount: number;
    validationScore: number;
    issuesCount: number;
  }): Promise<void> {
    try {
      await prisma.extractionAuditLog.create({
        data: {
          id: generateId(),
          jobId: logData.jobId,
          fileId: logData.fileId,
          organizationId: logData.organizationId,
          success: logData.success,
          confidence: logData.confidence,
          processingTime: logData.processingTime,
          invoiceNumber: logData.invoiceNumber,
          totalAmount: logData.totalAmount,
          lineItemsCount: logData.lineItemsCount,
          validationScore: logData.validationScore,
          issuesCount: logData.issuesCount,
          createdAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error("Failed to log extraction audit", {
        jobId: logData.jobId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}

export default ExtractionService;
