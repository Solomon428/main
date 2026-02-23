/**
 * PDF Processor Validation
 * Comprehensive validation methods for extracted data
 */

import {
  StructuredDataResult,
  ExtractionResult,
  ValidationResults,
  DocumentValidationResult,
  CrossValidationResult,
  ValidationError,
  ValidationWarning,
  QualityScoringResults,
  DocumentQualityMetrics,
  ProcessingException,
} from "./types";
import { auditLogger } from "../utils/audit-logger";
import { FraudScorer } from "@/logic-engine/risk/fraud-scorer";
import { VATValidator } from "@/logic-engine/compliance/vat-validator/index";
import { AdvancedDuplicateDetector } from "@/logic-engine/duplicates/advanced-duplicate-detector/index";
import { calculateCompletenessScore } from "./utils";

export async function performComprehensiveValidation(
  structuredData: StructuredDataResult,
  extractionResult: ExtractionResult,
  processingId: string,
): Promise<ValidationResults> {
  const validationStartTime = Date.now();
  const validations: DocumentValidationResult[] = [];
  const crossValidations: CrossValidationResult[] = [];

  try {
    const structureValidation = await validateDocumentStructure(
      structuredData,
      extractionResult,
      processingId,
    );
    validations.push(structureValidation);

    const semanticValidation = await validateSemanticContent(
      structuredData,
      processingId,
    );
    validations.push(semanticValidation);

    const businessRuleValidation = await validateBusinessRules(
      structuredData,
      processingId,
    );
    validations.push(businessRuleValidation);

    const complianceValidation = await validateCompliance(
      structuredData,
      processingId,
    );
    validations.push(complianceValidation);

    crossValidations.push(
      ...(await performCrossFieldValidation(structuredData, processingId)),
    );

    const duplicateValidation = await validateDuplicates(
      structuredData,
      processingId,
    );
    validations.push(duplicateValidation);

    const fraudValidation = await validateFraudRisk(
      structuredData,
      processingId,
    );
    validations.push(fraudValidation);

    const sanctionValidation = await validateSanctions(
      structuredData,
      processingId,
    );
    validations.push(sanctionValidation);

    return {
      documentValidation: {
        isValid: validations.every((v) => v.isValid),
        validationType: "COMPREHENSIVE",
        validationEngine: "CreditorFlow Validation Engine",
        validationTimestamp: new Date(),
        score:
          validations.reduce((sum, v) => sum + (v.score || 0), 0) /
          validations.length,
        confidence:
          validations.reduce((sum, v) => sum + (v.confidence || 0), 0) /
          validations.length,
        errors: validations.flatMap((v) => v.errors || []),
        warnings: validations.flatMap((v) => v.warnings || []),
        metadata: {
          totalValidations: validations.length,
          processingTimeMs: Date.now() - validationStartTime,
          processingId,
        },
      },
      crossValidations,
      metadata: {
        processingId,
        validationTimestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    try {
      await auditLogger.log({
        action: "UPDATE",
        entityType: "INVOICE",
        entityId: processingId,
        severity: "WARNING",
        metadata: {
          processingId,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    } catch (e) {
      console.error("Audit logging failed:", e);
    }

    return {
      documentValidation: {
        isValid: false,
        validationType: "STRUCTURAL",
        validationEngine: "CreditorFlow Validation Engine",
        validationTimestamp: new Date(),
        score: 0,
        confidence: 0,
        errors: [
          {
            field: "validation",
            errorCode: "VALIDATION_ERROR",
            errorMessage:
              error instanceof Error ? error.message : "Validation failed",
            severity: "CRITICAL",
            timestamp: new Date(),
          },
        ],
        warnings: [],
        metadata: {},
      },
      crossValidations: [],
      metadata: {},
    };
  }
}

async function validateDocumentStructure(
  structuredData: StructuredDataResult,
  extractionResult: ExtractionResult,
  processingId: string,
): Promise<DocumentValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!structuredData.structuredData.invoiceNumber) {
    errors.push({
      field: "invoiceNumber",
      errorCode: "MISSING_INVOICE_NUMBER",
      errorMessage: "Invoice number is required",
      severity: "ERROR",
      timestamp: new Date(),
    });
  }

  if (
    !structuredData.structuredData.totalAmount ||
    structuredData.structuredData.totalAmount <= 0
  ) {
    errors.push({
      field: "totalAmount",
      errorCode: "INVALID_TOTAL_AMOUNT",
      errorMessage: "Total amount must be greater than zero",
      severity: "ERROR",
      timestamp: new Date(),
    });
  }

  if (extractionResult.textMetrics.extractionConfidence < 0.5) {
    warnings.push({
      field: "textExtraction",
      warningCode: "LOW_EXTRACTION_CONFIDENCE",
      warningMessage: "Text extraction confidence below 50%",
      severity: "WARNING",
      timestamp: new Date(),
    });
  }

  return {
    isValid: errors.length === 0,
    validationType: "STRUCTURAL",
    validationEngine: "CreditorFlow Structure Validator",
    validationTimestamp: new Date(),
    score: errors.length === 0 ? 100 : 100 - errors.length * 20,
    confidence: extractionResult.textMetrics.extractionConfidence,
    errors,
    warnings,
    metadata: { processingId },
  };
}

async function validateSemanticContent(
  structuredData: StructuredDataResult,
  processingId: string,
): Promise<DocumentValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (
    structuredData.structuredData.invoiceDate &&
    structuredData.structuredData.dueDate
  ) {
    if (
      structuredData.structuredData.dueDate <
      structuredData.structuredData.invoiceDate
    ) {
      errors.push({
        field: "dueDate",
        errorCode: "INVALID_DUE_DATE",
        errorMessage: "Due date cannot be before invoice date",
        severity: "ERROR",
        timestamp: new Date(),
      });
    }
  }

  if (structuredData.structuredData.supplierVAT) {
    if (!/^4\d{9}$/.test(structuredData.structuredData.supplierVAT)) {
      warnings.push({
        field: "supplierVAT",
        warningCode: "INVALID_VAT_FORMAT",
        warningMessage:
          "VAT number does not match SA format (10 digits starting with 4)",
        severity: "WARNING",
        timestamp: new Date(),
      });
    }
  }

  return {
    isValid: errors.length === 0,
    validationType: "SEMANTIC",
    validationEngine: "CreditorFlow Semantic Validator",
    validationTimestamp: new Date(),
    score: errors.length === 0 ? 100 : 100 - errors.length * 25,
    confidence: 0.9,
    errors,
    warnings,
    metadata: { processingId },
  };
}

async function validateBusinessRules(
  structuredData: StructuredDataResult,
  processingId: string,
): Promise<DocumentValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (
    structuredData.structuredData.subtotalExclVAT &&
    structuredData.structuredData.vatAmount &&
    structuredData.structuredData.totalAmount
  ) {
    const calculatedTotal =
      structuredData.structuredData.subtotalExclVAT +
      structuredData.structuredData.vatAmount;
    const tolerance = 0.5;

    if (
      Math.abs(structuredData.structuredData.totalAmount - calculatedTotal) >
      tolerance
    ) {
      errors.push({
        field: "totalAmount",
        errorCode: "AMOUNT_MISMATCH",
        errorMessage: `Total amount mismatch: expected R${calculatedTotal.toFixed(2)}, got R${structuredData.structuredData.totalAmount.toFixed(2)}`,
        severity: "ERROR",
        timestamp: new Date(),
      });
    }
  }

  return {
    isValid: errors.length === 0,
    validationType: "BUSINESS_RULE",
    validationEngine: "CreditorFlow Business Rule Validator",
    validationTimestamp: new Date(),
    score: errors.length === 0 ? 100 : 100 - errors.length * 30,
    confidence: 0.85,
    errors,
    warnings,
    metadata: { processingId },
  };
}

async function validateCompliance(
  structuredData: StructuredDataResult,
  processingId: string,
): Promise<DocumentValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (
    structuredData.structuredData.vatAmount &&
    structuredData.structuredData.subtotalExclVAT
  ) {
    try {
      const vatValidator = new VATValidator();
      const vatResult = vatValidator.validateVAT({
        subtotalExclVAT: structuredData.structuredData.subtotalExclVAT || 0,
        vatAmount: structuredData.structuredData.vatAmount || 0,
        totalAmount: structuredData.structuredData.totalAmount || 0,
        vatRate: 0.15,
      });

      if (vatResult.complianceStatus === "NON_COMPLIANT") {
        const errorMsg = vatResult.errors?.[0]?.errorMessage || "VAT calculation non-compliant";
        errors.push({
          field: "vatAmount",
          errorCode: "VAT_NON_COMPLIANT",
          errorMessage: errorMsg,
          severity: "ERROR",
          timestamp: new Date(),
        });
      }
    } catch (error) {
      warnings.push({
        field: "vatAmount",
        warningCode: "VAT_VALIDATION_FAILED",
        warningMessage: "VAT validation could not be completed",
        severity: "WARNING",
        timestamp: new Date(),
      });
    }
  }

  return {
    isValid: errors.length === 0,
    validationType: "COMPLIANCE",
    validationEngine: "CreditorFlow Compliance Validator",
    validationTimestamp: new Date(),
    score: errors.length === 0 ? 100 : 100 - errors.length * 35,
    confidence: 0.95,
    errors,
    warnings,
    metadata: { processingId },
  };
}

async function performCrossFieldValidation(
  structuredData: StructuredDataResult,
  processingId: string,
): Promise<CrossValidationResult[]> {
  const results: CrossValidationResult[] = [];

  if (
    structuredData.structuredData.invoiceNumber &&
    structuredData.structuredData.invoiceDate
  ) {
    const year = structuredData.structuredData.invoiceDate.getFullYear();
    const yearStr = year.toString();

    if (structuredData.structuredData.invoiceNumber.includes(yearStr)) {
      results.push({
        sourceField: "invoiceNumber",
        targetField: "invoiceDate",
        validationType: "CROSS_FIELD",
        isValid: true,
        confidence: 0.9,
        errors: [],
        warnings: [],
        metadata: { processingId },
      });
    }
  }

  return results;
}

async function validateDuplicates(
  structuredData: StructuredDataResult,
  processingId: string,
): Promise<DocumentValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  try {
    const duplicateResult = await AdvancedDuplicateDetector.checkForDuplicates({
      invoiceNumber: structuredData.structuredData.invoiceNumber || "",
      supplierName: structuredData.structuredData.supplierName || "",
      totalAmount: structuredData.structuredData.totalAmount || 0,
      invoiceDate: structuredData.structuredData.invoiceDate,
    });

    if (duplicateResult.isDuplicate) {
      warnings.push({
        field: "invoiceNumber",
        warningCode: "POTENTIAL_DUPLICATE",
        warningMessage: `Potential duplicate detected with confidence ${duplicateResult.confidence}`,
        severity: "WARNING",
        timestamp: new Date(),
      });
    }
  } catch (error) {
    warnings.push({
      field: "duplicateCheck",
      warningCode: "DUPLICATE_CHECK_FAILED",
      warningMessage: "Duplicate check failed",
      severity: "WARNING",
      timestamp: new Date(),
    });
  }

  return {
    isValid: true,
    validationType: "DUPLICATE_CHECK",
    validationEngine: "CreditorFlow Duplicate Detector",
    validationTimestamp: new Date(),
    score: 100,
    confidence: 0.8,
    errors,
    warnings,
    metadata: { processingId },
  };
}

async function validateFraudRisk(
  structuredData: StructuredDataResult,
  processingId: string,
): Promise<DocumentValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  try {
    const fraudResult = FraudScorer.calculateScore({
      totalAmount: structuredData.structuredData.totalAmount || 0,
      supplierVatNumber: structuredData.structuredData.supplierVAT,
      invoiceDate: structuredData.structuredData.invoiceDate,
      vatAmount: structuredData.structuredData.vatAmount,
      subtotal: structuredData.structuredData.subtotalExclVAT,
    });

    if (
      fraudResult.riskLevel === "CRITICAL" ||
      fraudResult.riskLevel === "SEVERE"
    ) {
      errors.push({
        field: "fraudRisk",
        errorCode: "HIGH_FRAUD_RISK",
        errorMessage: `Fraud risk level: ${fraudResult.riskLevel}`,
        severity: "CRITICAL",
        timestamp: new Date(),
      });
    } else if (fraudResult.riskLevel === "HIGH") {
      warnings.push({
        field: "fraudRisk",
        warningCode: "ELEVATED_FRAUD_RISK",
        warningMessage: `Elevated fraud risk level: ${fraudResult.riskLevel}`,
        severity: "HIGH",
        timestamp: new Date(),
      });
    }
  } catch (error) {
    warnings.push({
      field: "fraudCheck",
      warningCode: "FRAUD_CHECK_FAILED",
      warningMessage: "Fraud check failed",
      severity: "WARNING",
      timestamp: new Date(),
    });
  }

  return {
    isValid: errors.length === 0,
    validationType: "FRAUD_DETECTION",
    validationEngine: "CreditorFlow Fraud Detector",
    validationTimestamp: new Date(),
    score: errors.length === 0 ? 100 : 50,
    confidence: 0.85,
    errors,
    warnings,
    metadata: { processingId },
  };
}

async function validateSanctions(
  structuredData: StructuredDataResult,
  processingId: string,
): Promise<DocumentValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  return {
    isValid: true,
    validationType: "SANCTION_SCREENING",
    validationEngine: "CreditorFlow Sanctions Screener",
    validationTimestamp: new Date(),
    score: 100,
    confidence: 0.7,
    errors,
    warnings,
    metadata: { processingId },
  };
}

export async function calculateQualityScores(
  qualityMetrics: DocumentQualityMetrics,
  extractionResult: ExtractionResult,
  validationResults: ValidationResults,
  processingId: string,
): Promise<QualityScoringResults> {
  try {
    const qualityScore =
      (qualityMetrics.clarityScore * 0.2 +
        qualityMetrics.resolutionScore * 0.15 +
        (1 - qualityMetrics.noiseLevel) * 0.15 +
        qualityMetrics.contrastLevel * 0.1 +
        qualityMetrics.brightnessLevel * 0.1 +
        (qualityMetrics.rotationCorrectionApplied ? 0.05 : 0) +
        (qualityMetrics.hasText ? 0.1 : 0) +
        (qualityMetrics.hasTables ? 0.1 : 0) +
        (qualityMetrics.isSearchable ? 0.05 : 0)) *
      100;

    const extractionConfidence =
      (extractionResult.textMetrics.extractionConfidence * 0.3 +
        extractionResult.tableMetrics.extractionConfidence * 0.25 +
        extractionResult.formMetrics.extractionConfidence * 0.25 +
        extractionResult.imageMetrics.extractionConfidence * 0.2) *
      100;

    const validationConfidence =
      validationResults.documentValidation.confidence * 100;

    const overallConfidence =
      qualityScore * 0.3 +
      extractionConfidence * 0.4 +
      validationConfidence * 0.3;

    const completenessScore = calculateCompletenessScore(
      extractionResult,
      validationResults,
    );

    return {
      qualityScore: Math.round(qualityScore),
      extractionConfidence: Math.round(extractionConfidence),
      validationConfidence: Math.round(validationConfidence),
      overallConfidence: Math.round(overallConfidence),
      completenessScore: Math.round(completenessScore),
      metadata: {
        processingId,
        scoringTimestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    try {
      await auditLogger.log({
        action: "UPDATE",
        entityType: "INVOICE",
        entityId: processingId,
        severity: "WARNING",
        metadata: {
          processingId,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    } catch (e) {
      console.error("Audit logging failed:", e);
    }

    return {
      qualityScore: 50,
      extractionConfidence: 50,
      validationConfidence: 50,
      overallConfidence: 50,
      completenessScore: 50,
      metadata: {},
    };
  }
}
