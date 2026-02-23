import path from "path";
import fs from "fs";
import os from "os";

import type {
  OcrConfig,
  OcrResult,
  OcrProgress,
  LanguageInfo,
  OcrServiceStatus,
  ActiveProcess,
  ExtractionLogData,
} from "./types";
import { OcrServiceError, OcrProcessingError } from "./errors";
import {
  DEFAULT_OCR_CONFIG,
  METRIC_NAMES,
  MAX_ACTIVE_JOBS_HEALTHY,
  ALLOWED_EXTENSIONS,
  TEMP_FILE_MAX_AGE_MS,
} from "./constants";
import { TesseractEngine } from "./engines/tesseract";
import { GoogleVisionEngine } from "./engines/google";
import { AwsTextractEngine } from "./engines/amazon";
import { AzureCognitiveEngine } from "./engines/azure";
import { OllamaEngine } from "./engines/ollama";
import { ImagePreprocessor } from "./preprocessing";
import { TextPostprocessor } from "./postprocessing";
import { FileProcessor } from "./processors/file-processor";

// Import dependencies from project
import { prisma } from "@/lib/prisma";
import { systemLogger } from "../../../observability/logger";
import { metrics } from "../../../observability/metrics";
import { generateId } from "../../../utils/ids";

export class OcrService {
  private readonly logger: typeof systemLogger;
  private readonly metrics: typeof metrics;
  private tesseractEngine: TesseractEngine | null = null;
  private googleVisionEngine: GoogleVisionEngine | null = null;
  private awsTextractEngine: AwsTextractEngine | null = null;
  private azureEngine: AzureCognitiveEngine | null = null;
  private ollamaEngine: OllamaEngine | null = null;
  private preprocessor: ImagePreprocessor;
  private fileProcessor: FileProcessor;
  private readonly config: OcrConfig;
  private readonly tempDir: string;
  private activeProcesses: Map<string, ActiveProcess> = new Map();

  constructor(
    config?: Partial<OcrConfig>,
    logger?: typeof systemLogger,
    metricsInstance?: typeof metrics,
  ) {
    this.logger = logger || systemLogger;
    this.metrics = metricsInstance || metrics;

    this.config = {
      ...DEFAULT_OCR_CONFIG,
      ...config,
    } as OcrConfig;

    this.tempDir = path.join(os.tmpdir(), "creditorflow-ocr");
    this.preprocessor = new ImagePreprocessor(this.tempDir);
    this.fileProcessor = new FileProcessor({
      config: this.config,
      preprocessor: this.preprocessor,
      tesseractEngine: null,
      googleVisionEngine: null,
      awsTextractEngine: null,
      azureEngine: null,
      ollamaEngine: null,
      updateProgress: this.updateProgress.bind(this),
    });
    this.ensureTempDirectory();
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info("Initializing OCR service", { config: this.config });

      switch (this.config.provider) {
        case "tesseract":
          this.tesseractEngine = new TesseractEngine({
            language: this.config.language,
            pageSegmentationMode: Number(this.config.pageSegmentationMode),
            ocrEngineMode: Number(this.config.ocrEngineMode),
            logger: (m) =>
              this.logger.debug("Tesseract worker log", { message: m }),
            errorHandler: (err) =>
              this.logger.error("Tesseract worker error", { error: err }),
          });
          await this.tesseractEngine.initialize();
          break;
        case "google-vision":
          this.googleVisionEngine = new GoogleVisionEngine({
            language: this.config.language,
          });
          await this.googleVisionEngine.initialize();
          break;
        case "aws-textract":
          this.awsTextractEngine = new AwsTextractEngine({
            language: this.config.language,
          });
          await this.awsTextractEngine.initialize();
          break;
        case "azure":
          this.azureEngine = new AzureCognitiveEngine({
            language: this.config.language,
          });
          await this.azureEngine.initialize();
          break;
        case "ollama":
          this.ollamaEngine = new OllamaEngine({
            language: this.config.language,
          });
          await this.ollamaEngine.initialize();
          break;
        default:
          throw new OcrServiceError(
            `Unsupported OCR provider: ${this.config.provider}`,
            "INIT_ERROR",
          );
      }

      // Update file processor with initialized engines
      this.fileProcessor = new FileProcessor({
        config: this.config,
        preprocessor: this.preprocessor,
        tesseractEngine: this.tesseractEngine,
        googleVisionEngine: this.googleVisionEngine,
        awsTextractEngine: this.awsTextractEngine,
        azureEngine: this.azureEngine,
        ollamaEngine: this.ollamaEngine,
        updateProgress: this.updateProgress.bind(this),
      });

      this.logger.info("OCR service initialized successfully", {
        provider: this.config.provider,
      });
      this.metrics.setGauge(METRIC_NAMES.SERVICE_INITIALIZED, 1);
    } catch (error) {
      this.logger.error("Failed to initialize OCR service", {
        provider: this.config.provider,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new OcrServiceError(
        "Failed to initialize OCR service",
        "INIT_FAILED",
        { provider: this.config.provider },
        error instanceof Error ? error : undefined,
      );
    }
  }

  async shutdown(): Promise<void> {
    try {
      this.logger.info("Shutting down OCR service");

      // Terminate all active processes
      for (const [jobId, process] of this.activeProcesses.entries()) {
        if (process.timeout) clearTimeout(process.timeout);
        this.logger.warn("Terminating active OCR process", { jobId });
      }
      this.activeProcesses.clear();

      // Clean up engines
      await this.tesseractEngine?.shutdown();
      await this.googleVisionEngine?.shutdown();
      await this.awsTextractEngine?.shutdown();
      await this.azureEngine?.shutdown();
      await this.ollamaEngine?.shutdown();

      // Clean up temp directory
      await this.cleanupTempDirectory();

      this.logger.info("OCR service shutdown completed");
      this.metrics.setGauge(METRIC_NAMES.SERVICE_INITIALIZED, 0);
    } catch (error) {
      this.logger.error("Error during OCR service shutdown", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async extractTextFromFile(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    jobId: string = generateId(),
    progressCallback?: (progress: OcrProgress) => void,
  ): Promise<OcrResult> {
    const startTime = Date.now();
    let tempFilePath: string | null = null;

    try {
      this.logger.info("Starting text extraction from file", {
        jobId,
        fileName,
        mimeType,
        fileSize: fileBuffer.length,
        provider: this.config.provider,
      });

      this.registerProcess(jobId, progressCallback);
      await this.validateFileInput(fileBuffer, fileName, mimeType);

      this.updateProgress(jobId, {
        stage: "initializing",
        progress: 5,
        message: "Initializing OCR engine",
        timestamp: new Date(),
      });

      const result = await this.fileProcessor.processFile(
        fileBuffer,
        fileName,
        mimeType,
        jobId,
      );

      // Post-process text
      result.text = TextPostprocessor.postprocess(result.text);

      // Validate result
      if (
        !result.success ||
        result.confidence < this.config.confidenceThreshold
      ) {
        this.logger.warn("Low confidence OCR result", {
          jobId,
          confidence: result.confidence,
          threshold: this.config.confidenceThreshold,
        });
        result.warnings = result.warnings || [];
        result.warnings.push(
          `Low confidence score: ${result.confidence}% (threshold: ${this.config.confidenceThreshold}%)`,
        );
      }

      const processingTime = Date.now() - startTime;
      result.processingTime = processingTime;

      // Update metrics
      this.metrics.incrementCounter(METRIC_NAMES.EXTRACTIONS_COMPLETED, 1, {
        provider: this.config.provider,
        success: result.success,
        pages: result.pages,
        language: result.language,
      });
      this.metrics.recordHistogram(
        METRIC_NAMES.PROCESSING_TIME,
        processingTime,
        {
          provider: this.config.provider,
          pages: result.pages,
        },
      );
      this.metrics.recordHistogram(
        METRIC_NAMES.CONFIDENCE_SCORE,
        result.confidence,
        { provider: this.config.provider },
      );

      this.updateProgress(jobId, {
        stage: "completed",
        progress: 100,
        message: `Text extraction completed: ${result.pages} page(s), ${result.confidence.toFixed(2)}% confidence`,
        details: {
          pages: result.pages,
          confidence: result.confidence,
          processingTime,
          textLength: result.text.length,
        },
        timestamp: new Date(),
      });

      this.logger.info("Text extraction completed successfully", {
        jobId,
        fileName,
        pages: result.pages,
        confidence: result.confidence,
        processingTime,
      });

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error("Failed to extract text from file", {
        jobId,
        fileName,
        mimeType,
        processingTime,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      this.updateProgress(jobId, {
        stage: "failed",
        progress: 100,
        message: `Text extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        timestamp: new Date(),
      });

      this.metrics.incrementCounter(METRIC_NAMES.EXTRACTIONS_FAILED, 1, {
        provider: this.config.provider,
        errorType: error instanceof OcrServiceError ? error.code : "UNKNOWN",
      });

      if (error instanceof OcrServiceError) throw error;

      throw new OcrProcessingError(
        "Failed to extract text from file",
        "EXTRACTION_FAILED",
        { fileName, mimeType, processingTime },
        error instanceof Error ? error : undefined,
      );
    } finally {
      this.unregisterProcess(jobId);
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch {}
      }
    }
  }

  async extractTextFromUrl(
    fileUrl: string,
    jobId: string = generateId(),
    progressCallback?: (progress: OcrProgress) => void,
  ): Promise<OcrResult> {
    const startTime = Date.now();

    try {
      this.logger.info("Starting text extraction from URL", { jobId, fileUrl });
      this.registerProcess(jobId, progressCallback);

      this.updateProgress(jobId, {
        stage: "initializing",
        progress: 5,
        message: "Downloading file from URL",
        timestamp: new Date(),
      });

      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new OcrServiceError(
          `Failed to download file: ${response.statusText}`,
          "DOWNLOAD_FAILED",
          {
            url: fileUrl,
            status: response.status,
            statusText: response.statusText,
          },
        );
      }

      const fileBuffer = Buffer.from(await response.arrayBuffer());
      const contentType =
        response.headers.get("content-type") || "application/octet-stream";
      const fileName = path.basename(new URL(fileUrl).pathname) || "download";

      this.updateProgress(jobId, {
        stage: "preprocessing",
        progress: 30,
        message: "File downloaded, starting OCR processing",
        details: { fileSize: fileBuffer.length, contentType, fileName },
        timestamp: new Date(),
      });

      const result = await this.extractTextFromFile(
        fileBuffer,
        fileName,
        contentType,
        jobId,
        progressCallback,
      );

      this.logger.info("URL text extraction completed", {
        jobId,
        fileUrl,
        totalTime: Date.now() - startTime,
        confidence: result.confidence,
      });

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error("Failed to extract text from URL", {
        jobId,
        fileUrl,
        processingTime,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      this.updateProgress(jobId, {
        stage: "failed",
        progress: 100,
        message: `URL text extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: new Date(),
      });

      if (error instanceof OcrServiceError) throw error;

      throw new OcrProcessingError(
        "Failed to extract text from URL",
        "URL_EXTRACTION_FAILED",
        { fileUrl, processingTime },
        error instanceof Error ? error : undefined,
      );
    } finally {
      this.unregisterProcess(jobId);
    }
  }

  async validateExtractionQuality(
    extractedText: string,
    expectedPatterns: RegExp[] = [],
  ): Promise<ReturnType<typeof TextPostprocessor.validateExtractionQuality>> {
    return TextPostprocessor.validateExtractionQuality(
      extractedText,
      expectedPatterns,
    );
  }

  async getSupportedLanguages(): Promise<LanguageInfo[]> {
    try {
      switch (this.config.provider) {
        case "tesseract":
          return this.tesseractEngine?.getLanguages() || [];
        case "google-vision":
          return this.googleVisionEngine?.getLanguages() || [];
        case "aws-textract":
          return this.awsTextractEngine?.getLanguages() || [];
        case "azure":
          return this.azureEngine?.getLanguages() || [];
        case "ollama":
          return this.ollamaEngine?.getLanguages() || [];
        default:
          return [];
      }
    } catch (error) {
      this.logger.error("Failed to get supported languages", {
        provider: this.config.provider,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return [];
    }
  }

  async getServiceStatus(): Promise<OcrServiceStatus> {
    try {
      const extractionStats = await prisma.ocrExtractionLog.aggregate({
        _count: { id: true },
        _avg: { processingTime: true, confidence: true },
        where: {
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });

      const successfulExtractions = await prisma.ocrExtractionLog.count({
        where: {
          success: true,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });

      const failedExtractions = await prisma.ocrExtractionLog.count({
        where: {
          success: false,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });

      const initialized =
        this.tesseractEngine !== null ||
        this.googleVisionEngine !== null ||
        this.awsTextractEngine !== null ||
        this.azureEngine !== null ||
        this.ollamaEngine !== null;

      return {
        initialized,
        provider: this.config.provider,
        language: this.config.language,
        activeJobs: this.activeProcesses.size,
        health:
          this.activeProcesses.size < MAX_ACTIVE_JOBS_HEALTHY
            ? "healthy"
            : "degraded",
        metrics: {
          totalExtractions: extractionStats._count.id || 0,
          successfulExtractions,
          failedExtractions,
          averageProcessingTime: extractionStats._avg.processingTime || 0,
          averageConfidence: extractionStats._avg.confidence || 0,
        },
        limits: {
          maxFileSize: this.config.maxFileSize,
          timeout: this.config.timeout,
          allowedMimeTypes: this.config.allowedMimeTypes,
        },
      };
    } catch (error) {
      this.logger.error("Failed to get service status", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        initialized: false,
        provider: this.config.provider,
        language: this.config.language,
        activeJobs: this.activeProcesses.size,
        health: "unhealthy",
        metrics: {
          totalExtractions: 0,
          successfulExtractions: 0,
          failedExtractions: 0,
          averageProcessingTime: 0,
          averageConfidence: 0,
        },
        limits: {
          maxFileSize: this.config.maxFileSize,
          timeout: this.config.timeout,
          allowedMimeTypes: this.config.allowedMimeTypes,
        },
      };
    }
  }

  // Private methods
  private ensureTempDirectory(): void {
    try {
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
        this.logger.debug("Created OCR temp directory", { path: this.tempDir });
      }
    } catch (error) {
      this.logger.error("Failed to create temp directory", {
        path: this.tempDir,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw new OcrServiceError(
        "Failed to create temp directory",
        "TEMP_DIR_CREATION_FAILED",
        { path: this.tempDir },
        error instanceof Error ? error : undefined,
      );
    }
  }

  private async cleanupTempDirectory(): Promise<void> {
    try {
      if (fs.existsSync(this.tempDir)) {
        const files = fs.readdirSync(this.tempDir);
        const now = Date.now();
        for (const file of files) {
          const filePath = path.join(this.tempDir, file);
          try {
            const stats = fs.statSync(filePath);
            if (now - stats.mtimeMs > TEMP_FILE_MAX_AGE_MS) {
              fs.unlinkSync(filePath);
              this.logger.debug("Cleaned up old temp file", { filePath });
            }
          } catch {}
        }
      }
    } catch (error) {
      this.logger.error("Failed to clean up temp directory", {
        path: this.tempDir,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  private async validateFileInput(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<void> {
    const errors: string[] = [];

    if (fileBuffer.length > this.config.maxFileSize) {
      errors.push(
        `File size ${fileBuffer.length} bytes exceeds maximum ${this.config.maxFileSize} bytes`,
      );
    }

    if (!this.config.allowedMimeTypes.includes(mimeType.toLowerCase())) {
      errors.push(`MIME type ${mimeType} is not allowed`);
    }

    const extension = path.extname(fileName).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension as any)) {
      errors.push(`File extension ${extension} is not allowed`);
    }

    if (!Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
      errors.push("File buffer is empty or invalid");
    }

    if (mimeType === "application/pdf") {
      try {
        const header = fileBuffer.slice(0, 5).toString();
        if (!header.startsWith("%PDF-"))
          errors.push("File does not appear to be a valid PDF");
      } catch {
        errors.push("Failed to validate PDF file");
      }
    }

    if (errors.length > 0) {
      throw new OcrProcessingError(
        "File validation failed",
        "VALIDATION_ERROR",
        {
          fileName,
          mimeType,
          fileSize: fileBuffer.length,
          errors,
        },
      );
    }
  }

  private registerProcess(
    jobId: string,
    progressCallback?: (progress: OcrProgress) => void,
  ): void {
    const timeout = setTimeout(() => {
      this.logger.error("OCR process timeout", {
        jobId,
        timeout: this.config.timeout,
      });
      this.unregisterProcess(jobId);
    }, this.config.timeout);

    this.activeProcesses.set(jobId, {
      jobId,
      startTime: new Date(),
      progressCallback,
      timeout,
    });
    this.metrics.setGauge(
      METRIC_NAMES.ACTIVE_PROCESSES,
      this.activeProcesses.size,
    );
  }

  private unregisterProcess(jobId: string): void {
    const process = this.activeProcesses.get(jobId);
    if (process) {
      if (process.timeout) clearTimeout(process.timeout);
      this.activeProcesses.delete(jobId);
      this.metrics.setGauge(
        METRIC_NAMES.ACTIVE_PROCESSES,
        this.activeProcesses.size,
      );
    }
  }

  private updateProgress(jobId: string, progress: OcrProgress): void {
    const process = this.activeProcesses.get(jobId);
    if (process?.progressCallback) {
      try {
        process.progressCallback(progress);
      } catch (error) {
        this.logger.error("Failed to call progress callback", { jobId });
      }
    }
  }
}

export default OcrService;
