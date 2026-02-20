/**
 * PDF Processor Insights
 * Processing insights and flag generation
 */

import {
  DocumentQualityMetrics,
  ExtractionResult,
  ValidationResults,
  QualityScoringResults,
  ProcessingInsights,
  ProcessingFlag,
  ProcessingWarning,
  ProcessingError,
  ProcessingSuggestion,
  AdvancedPDFProcessingResult,
  ProcessingStatus,
  DocumentType,
  ExtractionMethod,
} from "./types";
import { auditLogger } from "../utils/audit-logger";
import { QUALITY_THRESHOLDS } from "./constants";

export function generateProcessingInsights(
  qualityMetrics: DocumentQualityMetrics,
  extractionResult: ExtractionResult,
  validationResults: ValidationResults,
  scoringResults: QualityScoringResults,
  processingId: string,
): ProcessingInsights {
  const flags: ProcessingFlag[] = [];
  const warnings: ProcessingWarning[] = [];
  const errors: ProcessingError[] = [];
  const suggestions: ProcessingSuggestion[] = [];

  try {
    if (qualityMetrics.clarityScore < QUALITY_THRESHOLDS.MIN_CLARITY) {
      flags.push({
        flagType: "LOW_CLARITY",
        flagMessage: "Document clarity below threshold",
        severity: "HIGH",
        timestamp: new Date(),
      });
    }

    if (qualityMetrics.noiseLevel > QUALITY_THRESHOLDS.MAX_NOISE_LEVEL) {
      warnings.push({
        warningCode: "HIGH_NOISE",
        warningMessage: "Document contains high noise levels",
        severity: "MEDIUM",
        timestamp: new Date(),
      });
    }

    if (qualityMetrics.skewAngle > QUALITY_THRESHOLDS.MAX_SKEW_ANGLE) {
      suggestions.push({
        suggestionCode: "SKEW_CORRECTION",
        suggestionMessage:
          "Document skew detected - rotation correction recommended",
        suggestionType: "IMPROVEMENT",
        impact: "MEDIUM",
        timestamp: new Date(),
      });
    }

    if (extractionResult.textMetrics.extractionConfidence < 0.7) {
      warnings.push({
        warningCode: "LOW_TEXT_CONFIDENCE",
        warningMessage: "Text extraction confidence below 70%",
        severity: "MEDIUM",
        timestamp: new Date(),
      });
    }

    if (extractionResult.tableMetrics.totalTables === 0) {
      suggestions.push({
        suggestionCode: "TABLE_DETECTION",
        suggestionMessage: "No tables detected - manual review recommended",
        suggestionType: "IMPROVEMENT",
        impact: "HIGH",
        timestamp: new Date(),
      });
    }

    if (validationResults.documentValidation.errors.length > 0) {
      errors.push(
        ...validationResults.documentValidation.errors.map((err: any) => ({
          errorCode: err.errorCode,
          errorMessage: err.errorMessage,
          severity: "ERROR" as const,
          timestamp: new Date(),
          stackTrace: undefined,
          metadata: {},
        })),
      );
    }

    if (validationResults.documentValidation.warnings.length > 0) {
      warnings.push(
        ...validationResults.documentValidation.warnings.map((warn: any) => ({
          warningCode: warn.warningCode,
          warningMessage: warn.warningMessage,
          severity: "MEDIUM" as const,
          timestamp: new Date(),
          metadata: {},
        })),
      );
    }

    if (scoringResults.overallConfidence < 60) {
      suggestions.push({
        suggestionCode: "MANUAL_REVIEW",
        suggestionMessage:
          "Overall confidence below 60% - manual review required",
        suggestionType: "IMPROVEMENT",
        impact: "HIGH",
        timestamp: new Date(),
      });
    }

    if (scoringResults.completenessScore < 70) {
      suggestions.push({
        suggestionCode: "DATA_COMPLETION",
        suggestionMessage:
          "Data completeness below 70% - additional information needed",
        suggestionType: "IMPROVEMENT",
        impact: "MEDIUM",
        timestamp: new Date(),
      });
    }

    return { flags, warnings, errors, suggestions };
  } catch (error) {
    auditLogger.log(
      "INSIGHT_GENERATION_FAILED",
      "invoice",
      processingId,
      "WARNING",
      {
        processingId,
        error: error instanceof Error ? error.message : String(error),
      },
    );

    return { flags: [], warnings: [], errors: [], suggestions: [] };
  }
}

export function createFailureResult(
  processingId: string,
  batchId: string | undefined,
  correlationId: string | undefined,
  error: any,
  processingDurationMs: number,
  auditTrail: any[],
): AdvancedPDFProcessingResult {
  return {
    success: false,
    status: ProcessingStatus.FAILED,
    processingId,
    batchId,
    correlationId,

    extractionMethod: "native-pdf" as ExtractionMethod,
    extractionEngine: "error",
    extractionEngineVersion: "0.0.0",
    extractionConfidence: 0,
    extractionCompleteness: 0,

    documentType: DocumentType.STANDARD_INVOICE,
    documentSubType: undefined,
    documentCategory: "error",
    documentLanguage: "en",
    documentCountry: "ZA",
    documentCurrency: "ZAR",

    qualityScore: 0,
    clarityScore: 0,
    resolutionScore: 0,
    skewAngle: 0,
    rotationCorrectionApplied: false,
    noiseLevel: 1,
    contrastLevel: 0,
    brightnessLevel: 0,

    textExtractionMetrics: {
      totalCharacters: 0,
      totalWords: 0,
      totalLines: 0,
      totalParagraphs: 0,
      averageWordLength: 0,
      averageLineLength: 0,
      extractionConfidence: 0,
      languageConfidence: 0,
      encodingConfidence: 0,
    },
    tableExtractionMetrics: {
      totalTables: 0,
      totalRows: 0,
      totalColumns: 0,
      totalCells: 0,
      extractionConfidence: 0,
      structureConfidence: 0,
      dataConfidence: 0,
    },
    formExtractionMetrics: {
      totalForms: 0,
      totalFields: 0,
      totalValues: 0,
      extractionConfidence: 0,
      fieldDetectionConfidence: 0,
      valueExtractionConfidence: 0,
    },
    imageExtractionMetrics: {
      totalImages: 0,
      totalGraphics: 0,
      totalSignatures: 0,
      extractionConfidence: 0,
      qualityScore: 0,
    },

    structuredData: {
      invoiceNumber: `FAILED_${processingId}`,
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 86400000),
      supplierName: "Processing Failed",
      supplierVAT: undefined,
      subtotalExclVAT: 0,
      vatAmount: 0,
      totalAmount: 0,
      lineItems: [],
      metadata: {},
    },
    semiStructuredData: {
      rawKeyValuePairs: {},
      detectedSections: [],
      detectedTables: [],
      detectedForms: [],
      metadata: {},
    },
    rawText: "",
    normalizedText: "",
    cleanedText: "",

    extractedTables: [],
    tableConfidenceScores: [],

    extractedFields: [],
    fieldConfidenceScores: [],

    validationResults: {
      isValid: false,
      validationType: "ERROR",
      validationEngine: "error",
      validationTimestamp: new Date(),
      score: 0,
      confidence: 0,
      errors: [
        {
          field: "processing",
          errorCode: error.code || "PROCESSING_ERROR",
          errorMessage: error.message || "Unknown error",
          severity: "CRITICAL",
          timestamp: new Date(),
        },
      ],
      warnings: [],
      metadata: {},
    },
    crossValidationResults: [],

    flags: [
      {
        flagType: "PROCESSING_FAILED",
        flagMessage: error.message || "Processing failed",
        severity: "CRITICAL",
        timestamp: new Date(),
      },
    ],
    warnings: [],
    errors: [
      {
        errorCode: error.code || "PROCESSING_ERROR",
        errorMessage: error.message || "Unknown error",
        severity: "CRITICAL",
        timestamp: new Date(),
        stackTrace: error.stack,
        metadata: {},
      },
    ],
    suggestions: [],

    metadata: {
      processingStartTime: new Date(Date.now() - processingDurationMs),
      processingEndTime: new Date(),
      processingEngine: "CreditorFlow PDF Processor",
      processingEngineVersion: "4.3.2",
      inputFileSize: 0,
      outputFileSize: 0,
      checksum: "",
      mimeType: "application/pdf",
      fileName: "failed.pdf",
      processingOptions: {} as any,
    },

    auditTrail,

    processingDurationMs,
    cpuTimeMs: 0,
    memoryPeakBytes: 0,
    diskUsageBytes: 0,

    systemInfo: {
      os: process.platform,
      osVersion: process.version,
      architecture: process.arch,
      processor: "unknown",
      cores: 1,
      memoryTotal: 0,
      memoryUsed: 0,
      diskTotal: 0,
      diskUsed: 0,
    },
    environmentInfo: {
      environment: (process.env.NODE_ENV || "development") as
        | "DEVELOPMENT"
        | "STAGING"
        | "PRODUCTION",
      region: process.env.REGION || "unknown",
      instanceId: process.env.INSTANCE_ID || "unknown",
      deploymentId: process.env.DEPLOYMENT_ID || "unknown",
      version: "4.3.2",
      buildNumber: "unknown",
      buildDate: new Date(),
    },

    securityInfo: {
      encryptionAlgorithm: "none",
      encryptionKeyLength: 0,
      hashingAlgorithm: "none",
      digitalSignature: undefined,
      certificateInfo: undefined,
    },
    integrityCheck: {
      checksum: "",
      hash: "",
      digitalSignature: undefined,
      verified: false,
      verifiedAt: new Date(),
      verifier: "system",
    },

    version: "4.3.2",
    apiVersion: "1.0.0",
    schemaVersion: "3.2.1",

    customData: {},
  };
}
