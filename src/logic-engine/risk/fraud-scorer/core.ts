/**
 * CREDITORFLOW EMS - CORE FRAUD SCORER
 * Version: 4.1.7
 * Main FraudScorer class and orchestration logic
 */

import type {
  FraudScoringInput,
  FraudScoringResult,
  FraudScoringContext,
  FraudScoringMetadata,
  FraudAuditTrail,
  FraudAlertPriority,
  FraudEscalationPath,
  FraudConfidenceInterval,
  FraudSeverityLevel,
  FraudRiskFactor,
  FraudMitigationAction,
  RiskLevel,
} from "./types";
import { FraudScoringException } from "./types";
import { MODEL_VERSION } from "./constants";
import { auditLogger } from "@/lib/utils/audit-logger";

// Import analyzers
import { calculateAmountRisk } from "./analyzers/amount-analyzer";
import {
  calculateSupplierAgeRisk,
  calculateSupplierRiskProfile,
} from "./analyzers/supplier-analyzer";
import { calculatePaymentPatternRisk } from "./analyzers/payment-analyzer";
import { calculateTemporalAnomalyRisk } from "./analyzers/temporal-analyzer";
import { calculateGeographicRisk } from "./analyzers/geographic-analyzer";
import { calculateBehavioralRisk } from "./analyzers/behavioral-analyzer";
import { calculateNetworkRisk } from "./analyzers/network-analyzer";
import { calculateVATComplianceRisk } from "./analyzers/vat-analyzer";
import { calculateRegulatoryRisk } from "./analyzers/regulatory-analyzer";

// Import scoring functions
import {
  aggregateRiskScores,
  determineRiskLevel,
  determineSeverityLevel,
  generateRiskFactors,
  generateMitigationActions,
  calculateConfidenceInterval,
  determineAlertPriority,
  determineEscalationPath,
} from "./scoring";

import { SA_COMPLIANCE_RULES } from "./constants";

export class FraudScorer {
  /**
   * Calculate comprehensive fraud risk score with multi-dimensional analysis
   * @param input - Normalized invoice data after PDF parsing
   * @param context - Optional business context for adaptive scoring
   * @returns Deterministic risk assessment with audit trail and confidence intervals
   */
  static calculateScore(
    input: FraudScoringInput,
    context?: FraudScoringContext,
  ): FraudScoringResult {
    const scoringId = `score_${Date.now()}_${this.generateRandomString(12)}`;
    const scoringStartTime = Date.now();
    const auditTrail: FraudAuditTrail[] = [];

    try {
      // Initialize scoring components
      auditTrail.push(
        this.createAuditEntry("SCORING_INITIALIZED", scoringId, {
          input,
          context,
        }),
      );

      // Step 1: Validate input data quality
      auditTrail.push(
        this.createAuditEntry("INPUT_VALIDATION_STARTED", scoringId),
      );
      this.validateInput(input, scoringId);
      auditTrail.push(
        this.createAuditEntry("INPUT_VALIDATION_COMPLETED", scoringId),
      );

      // Step 2: Calculate base risk score from amount analysis
      auditTrail.push(
        this.createAuditEntry("AMOUNT_RISK_ANALYSIS_STARTED", scoringId),
      );
      const amountRisk = calculateAmountRisk(input, context, scoringId);
      auditTrail.push(
        this.createAuditEntry("AMOUNT_RISK_ANALYSIS_COMPLETED", scoringId, {
          amountRisk,
        }),
      );

      // Step 3: Calculate supplier age risk
      auditTrail.push(
        this.createAuditEntry("SUPPLIER_AGE_RISK_ANALYSIS_STARTED", scoringId),
      );
      const supplierAgeRisk = calculateSupplierAgeRisk(
        input,
        context,
        scoringId,
      );
      auditTrail.push(
        this.createAuditEntry(
          "SUPPLIER_AGE_RISK_ANALYSIS_COMPLETED",
          scoringId,
          { supplierAgeRisk },
        ),
      );

      // Step 4: Calculate supplier risk profile
      auditTrail.push(
        this.createAuditEntry(
          "SUPPLIER_RISK_PROFILE_ANALYSIS_STARTED",
          scoringId,
        ),
      );
      const supplierRiskProfile = calculateSupplierRiskProfile(
        input,
        context,
        scoringId,
      );
      auditTrail.push(
        this.createAuditEntry(
          "SUPPLIER_RISK_PROFILE_ANALYSIS_COMPLETED",
          scoringId,
          { supplierRiskProfile },
        ),
      );

      // Step 5: Calculate payment pattern risk
      auditTrail.push(
        this.createAuditEntry(
          "PAYMENT_PATTERN_RISK_ANALYSIS_STARTED",
          scoringId,
        ),
      );
      const paymentPatternRisk = calculatePaymentPatternRisk(
        input,
        context,
        scoringId,
      );
      auditTrail.push(
        this.createAuditEntry(
          "PAYMENT_PATTERN_RISK_ANALYSIS_COMPLETED",
          scoringId,
          { paymentPatternRisk },
        ),
      );

      // Step 6: Calculate temporal anomaly risk
      auditTrail.push(
        this.createAuditEntry(
          "TEMPORAL_ANOMALY_RISK_ANALYSIS_STARTED",
          scoringId,
        ),
      );
      const temporalAnomalyRisk = calculateTemporalAnomalyRisk(
        input,
        context,
        scoringId,
      );
      auditTrail.push(
        this.createAuditEntry(
          "TEMPORAL_ANOMALY_RISK_ANALYSIS_COMPLETED",
          scoringId,
          { temporalAnomalyRisk },
        ),
      );

      // Step 7: Calculate geographic risk
      auditTrail.push(
        this.createAuditEntry("GEOGRAPHIC_RISK_ANALYSIS_STARTED", scoringId),
      );
      const geographicRisk = calculateGeographicRisk(input, context, scoringId);
      auditTrail.push(
        this.createAuditEntry("GEOGRAPHIC_RISK_ANALYSIS_COMPLETED", scoringId, {
          geographicRisk,
        }),
      );

      // Step 8: Calculate behavioral risk
      auditTrail.push(
        this.createAuditEntry("BEHAVIORAL_RISK_ANALYSIS_STARTED", scoringId),
      );
      const behavioralRisk = calculateBehavioralRisk(input, context, scoringId);
      auditTrail.push(
        this.createAuditEntry("BEHAVIORAL_RISK_ANALYSIS_COMPLETED", scoringId, {
          behavioralRisk,
        }),
      );

      // Step 9: Calculate network risk
      auditTrail.push(
        this.createAuditEntry("NETWORK_RISK_ANALYSIS_STARTED", scoringId),
      );
      const networkRisk = calculateNetworkRisk(input, context, scoringId);
      auditTrail.push(
        this.createAuditEntry("NETWORK_RISK_ANALYSIS_COMPLETED", scoringId, {
          networkRisk,
        }),
      );

      // Step 10: Calculate VAT compliance risk
      auditTrail.push(
        this.createAuditEntry(
          "VAT_COMPLIANCE_RISK_ANALYSIS_STARTED",
          scoringId,
        ),
      );
      const vatComplianceRisk = calculateVATComplianceRisk(
        input,
        context,
        scoringId,
      );
      auditTrail.push(
        this.createAuditEntry(
          "VAT_COMPLIANCE_RISK_ANALYSIS_COMPLETED",
          scoringId,
          { vatComplianceRisk },
        ),
      );

      // Step 11: Calculate regulatory risk
      auditTrail.push(
        this.createAuditEntry("REGULATORY_RISK_ANALYSIS_STARTED", scoringId),
      );
      const regulatoryRisk = calculateRegulatoryRisk(input, context, scoringId);
      auditTrail.push(
        this.createAuditEntry("REGULATORY_RISK_ANALYSIS_COMPLETED", scoringId, {
          regulatoryRisk,
        }),
      );

      // Step 12: Aggregate weighted risk score
      auditTrail.push(
        this.createAuditEntry("RISK_AGGREGATION_STARTED", scoringId),
      );
      const aggregatedRisk = aggregateRiskScores(
        amountRisk,
        supplierAgeRisk,
        supplierRiskProfile,
        paymentPatternRisk,
        temporalAnomalyRisk,
        geographicRisk,
        behavioralRisk,
        networkRisk,
        vatComplianceRisk,
        regulatoryRisk,
        context,
        scoringId,
      );
      auditTrail.push(
        this.createAuditEntry("RISK_AGGREGATION_COMPLETED", scoringId, {
          aggregatedRisk,
        }),
      );

      // Step 13: Determine risk level and severity
      auditTrail.push(
        this.createAuditEntry("RISK_LEVEL_DETERMINATION_STARTED", scoringId),
      );
      const riskLevel = determineRiskLevel(
        aggregatedRisk.overallScore,
        scoringId,
      );
      const severityLevel = determineSeverityLevel(
        riskLevel,
        aggregatedRisk.riskFactors,
        scoringId,
      );
      auditTrail.push(
        this.createAuditEntry("RISK_LEVEL_DETERMINATION_COMPLETED", scoringId, {
          riskLevel,
          severityLevel,
        }),
      );

      // Step 14: Generate risk factors and mitigation actions
      auditTrail.push(
        this.createAuditEntry("RISK_FACTOR_GENERATION_STARTED", scoringId),
      );
      const riskFactors = generateRiskFactors(
        amountRisk,
        supplierAgeRisk,
        supplierRiskProfile,
        paymentPatternRisk,
        temporalAnomalyRisk,
        geographicRisk,
        behavioralRisk,
        networkRisk,
        vatComplianceRisk,
        regulatoryRisk,
        scoringId,
      );
      const mitigationActions = generateMitigationActions(
        riskFactors,
        severityLevel,
        scoringId,
      );
      auditTrail.push(
        this.createAuditEntry("RISK_FACTOR_GENERATION_COMPLETED", scoringId, {
          riskFactors,
          mitigationActions,
        }),
      );

      // Step 15: Calculate confidence intervals
      auditTrail.push(
        this.createAuditEntry(
          "CONFIDENCE_INTERVAL_CALCULATION_STARTED",
          scoringId,
        ),
      );
      const confidenceInterval = calculateConfidenceInterval(
        aggregatedRisk.overallScore,
        riskLevel,
        scoringId,
      );
      auditTrail.push(
        this.createAuditEntry(
          "CONFIDENCE_INTERVAL_CALCULATION_COMPLETED",
          scoringId,
          { confidenceInterval },
        ),
      );

      // Step 16: Determine alert priority and escalation path
      auditTrail.push(
        this.createAuditEntry(
          "ALERT_PRIORITY_DETERMINATION_STARTED",
          scoringId,
        ),
      );
      const alertPriority = determineAlertPriority(severityLevel, scoringId);
      const escalationPath = determineEscalationPath(
        severityLevel,
        riskLevel,
        scoringId,
      );
      auditTrail.push(
        this.createAuditEntry(
          "ALERT_PRIORITY_DETERMINATION_COMPLETED",
          scoringId,
          { alertPriority, escalationPath },
        ),
      );

      // Step 17: Generate comprehensive scoring metadata
      auditTrail.push(
        this.createAuditEntry("METADATA_GENERATION_STARTED", scoringId),
      );
      const metadata = this.generateScoringMetadata(
        input,
        context,
        aggregatedRisk,
        riskFactors,
        confidenceInterval,
        scoringStartTime,
        scoringId,
      );
      auditTrail.push(
        this.createAuditEntry("METADATA_GENERATION_COMPLETED", scoringId, {
          metadata,
        }),
      );

      // Step 18: Create audit trail entry for scoring completion
      auditTrail.push(
        this.createAuditEntry("SCORING_COMPLETED", scoringId, {
          overallScore: aggregatedRisk.overallScore,
          riskLevel,
          severityLevel,
          riskFactors: riskFactors.length,
          confidenceInterval,
        }),
      );

      // Step 19: Log successful scoring operation
      this.logScoringOperation(
        scoringId,
        input,
        aggregatedRisk.overallScore,
        riskLevel,
        severityLevel,
        riskFactors,
        confidenceInterval,
        alertPriority,
        escalationPath,
        scoringStartTime,
        Date.now(),
      );

      // Step 20: Return comprehensive scoring result
      return {
        scoringId,
        modelVersion: MODEL_VERSION,
        inputHash: this.generateInputHash(input),
        overallScore: aggregatedRisk.overallScore,
        normalizedScore: aggregatedRisk.normalizedScore,
        riskLevel,
        severityLevel,
        requiresAttention:
          severityLevel !== "LOW" && severityLevel !== "MEDIUM",
        riskFactors,
        mitigationActions,
        confidenceInterval,
        alertPriority,
        escalationPath,
        investigationRequired:
          severityLevel === "HIGH" ||
          severityLevel === "CRITICAL" ||
          severityLevel === "SEVERE" ||
          severityLevel === "BLACKLISTED",
        regulatoryReportingRequired:
          severityLevel === "CRITICAL" ||
          severityLevel === "SEVERE" ||
          severityLevel === "BLACKLISTED",
        calculationTimestamp: new Date(),
        scoringDurationMs: Date.now() - scoringStartTime,
        auditTrail,
        metadata,
      };
    } catch (error) {
      // Log scoring failure
      this.logScoringFailure(
        scoringId,
        input,
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error.stack : undefined,
        scoringStartTime,
        Date.now(),
      );

      // Return fallback scoring result with maximum risk
      return this.createFallbackResult(
        scoringId,
        input,
        error instanceof Error ? error.message : "Unknown scoring error",
        Date.now() - scoringStartTime,
        auditTrail,
      );
    }
  }

  /**
   * Validate input data quality and completeness
   */
  private static validateInput(
    input: FraudScoringInput,
    scoringId: string,
  ): void {
    if (!input.totalAmount || input.totalAmount <= 0) {
      throw new FraudScoringException(
        "INVALID_AMOUNT",
        "Total amount must be greater than zero",
        scoringId,
      );
    }

    if (input.totalAmount > 100000000) {
      // R100 million threshold
      throw new FraudScoringException(
        "EXCESSIVE_AMOUNT",
        "Total amount exceeds system limits",
        scoringId,
      );
    }

    if (input.supplierVatNumber && !/^4\d{9}$/.test(input.supplierVatNumber)) {
      throw new FraudScoringException(
        "INVALID_VAT_NUMBER",
        "VAT number must be 10 digits starting with 4",
        scoringId,
      );
    }

    if (
      input.invoiceDate &&
      new Date(input.invoiceDate) > new Date(Date.now() + 86400000)
    ) {
      // Future date check
      throw new FraudScoringException(
        "FUTURE_INVOICE_DATE",
        "Invoice date cannot be in the future",
        scoringId,
      );
    }

    if (
      input.vatAmount &&
      input.subtotal &&
      Math.abs(input.vatAmount - input.subtotal * 0.15) >
        SA_COMPLIANCE_RULES.VAT_ROUNDING_TOLERANCE
    ) {
      throw new FraudScoringException(
        "VAT_CALCULATION_MISMATCH",
        "VAT amount does not match 15% calculation within tolerance",
        scoringId,
      );
    }
  }

  /**
   * Generate comprehensive scoring metadata
   */
  private static generateScoringMetadata(
    input: FraudScoringInput,
    context: FraudScoringContext | undefined,
    aggregatedRisk: {
      overallScore: number;
      normalizedScore: number;
      componentScores: Record<string, number>;
      riskFactors: FraudRiskFactor[];
      detectionMethods: string[];
      confidence: number;
    },
    riskFactors: FraudRiskFactor[],
    confidenceInterval: FraudConfidenceInterval,
    scoringStartTime: number,
    scoringId: string,
  ): FraudScoringMetadata {
    return {
      scoringId,
      modelVersion: MODEL_VERSION,
      inputHash: this.generateInputHash(input),
      scoringStartTime: new Date(scoringStartTime),
      scoringEndTime: new Date(),
      scoringDurationMs: Date.now() - scoringStartTime,
      inputCharacteristics: {
        totalAmount: input.totalAmount,
        supplierAgeDays: input.supplierAgeDays,
        invoiceDate: input.invoiceDate,
        vatAmount: input.vatAmount,
        subtotal: input.subtotal,
        supplierVatNumber: input.supplierVatNumber,
        supplierCountry: input.supplierCountry,
        supplierIsPep: input.supplierIsPep,
      },
      contextCharacteristics: context
        ? {
            businessUnit: context.businessUnit,
            department: context.department,
            approverRole: context.approverRole,
            paymentTerms: context.paymentTerms,
            supplierCategory: context.supplierCategory,
            historicalAmounts: context.historicalAmounts?.slice(0, 10),
            businessUnitRiskAppetite: context.businessUnitRiskAppetite,
          }
        : undefined,
      riskCharacteristics: {
        overallScore: aggregatedRisk.overallScore,
        normalizedScore: aggregatedRisk.normalizedScore,
        componentScores: aggregatedRisk.componentScores,
        riskFactorCount: riskFactors.length,
        highestRiskFactorScore:
          riskFactors.length > 0
            ? Math.max(...riskFactors.map((f) => f.scoreImpact))
            : 0,
        detectionMethodCount: aggregatedRisk.detectionMethods.length,
        confidenceScore: aggregatedRisk.confidence,
        confidenceIntervalLower: confidenceInterval.lower,
        confidenceIntervalUpper: confidenceInterval.upper,
        confidenceLevel: confidenceInterval.level,
      },
      systemCharacteristics: {
        environment: process.env.NODE_ENV || "development",
        region: process.env.REGION || "za-central-1",
        instanceId: process.env.INSTANCE_ID || "local",
        version: "4.1.7",
        buildNumber: process.env.BUILD_NUMBER || "local",
        buildDate: new Date(),
      },
    };
  }

  /**
   * Create audit trail entry
   */
  private static createAuditEntry(
    eventType: string,
    scoringId: string,
    metadata?: Record<string, any>,
  ): FraudAuditTrail {
    return {
      auditId: `fraud_audit_${Date.now()}_${this.generateRandomString(8)}`,
      scoringId,
      timestamp: new Date(),
      eventType,
      eventDescription: eventType.replace(/_/g, " ").toLowerCase(),
      userId: "system",
      ipAddress: "127.0.0.1",
      userAgent: "CreditorFlow Fraud Scorer/4.1.7",
      metadata: metadata || {},
    };
  }

  /**
   * Generate random string for IDs
   */
  private static generateRandomString(length: number): string {
    return Array.from({ length }, () =>
      Math.floor(Math.random() * 36).toString(36),
    ).join("");
  }

  /**
   * Generate hash for input normalization
   */
  private static generateInputHash(input: FraudScoringInput): string {
    const crypto = require("crypto");
    const hash = crypto.createHash("sha256");
    hash.update(
      JSON.stringify({
        totalAmount: input.totalAmount,
        supplierAgeDays: input.supplierAgeDays,
        invoiceDate: input.invoiceDate,
        vatAmount: input.vatAmount,
        subtotal: input.subtotal,
        supplierVatNumber: input.supplierVatNumber,
        supplierCountry: input.supplierCountry,
        supplierIsPep: input.supplierIsPep,
      }),
    );
    return hash.digest("hex").substring(0, 32);
  }

  /**
   * Log successful scoring operation
   */
  private static logScoringOperation(
    scoringId: string,
    input: FraudScoringInput,
    overallScore: number,
    riskLevel: RiskLevel,
    severityLevel: FraudSeverityLevel,
    riskFactors: FraudRiskFactor[],
    confidenceInterval: FraudConfidenceInterval,
    alertPriority: FraudAlertPriority,
    escalationPath: FraudEscalationPath[],
    startTime: number,
    endTime: number,
  ): void {
    auditLogger.log("FRAUD_SCORING_COMPLETED", "invoice", scoringId, "INFO", {
      scoringId,
      totalAmount: input.totalAmount,
      supplierName: input.supplierName,
      overallScore,
      riskLevel,
      severityLevel,
      riskFactorCount: riskFactors.length,
      confidenceLower: confidenceInterval.lower,
      confidenceUpper: confidenceInterval.upper,
      alertPriority,
      escalationPath: escalationPath.join(" → "),
      scoringDurationMs: endTime - startTime,
    });
  }

  /**
   * Log scoring failure
   */
  private static logScoringFailure(
    scoringId: string,
    input: FraudScoringInput,
    errorMessage: string,
    errorStack: string | undefined,
    startTime: number,
    endTime: number,
  ): void {
    auditLogger.log("FRAUD_SCORING_FAILED", "invoice", scoringId, "ERROR", {
      scoringId,
      totalAmount: input.totalAmount,
      supplierName: input.supplierName,
      errorMessage,
      errorStack,
      scoringDurationMs: endTime - startTime,
    });
  }

  /**
   * Create fallback result for error handling
   */
  private static createFallbackResult(
    scoringId: string,
    input: FraudScoringInput,
    errorMessage: string,
    durationMs: number,
    auditTrail: FraudAuditTrail[],
  ): FraudScoringResult {
    const { FraudDetectionMethod } = require("./types");

    return {
      scoringId,
      modelVersion: MODEL_VERSION,
      inputHash: this.generateInputHash(input),
      overallScore: 100, // Maximum risk on failure
      normalizedScore: 1.0,
      riskLevel: "BLACKLISTED",
      severityLevel: "SEVERE",
      requiresAttention: true,
      riskFactors: [
        {
          category: "SYSTEM_ERROR",
          factor: "SCORING_FAILURE",
          description: `Fraud scoring failed: ${errorMessage}`,
          severity: "SEVERE",
          scoreImpact: 100,
          evidence: errorMessage,
          detectionMethod: "SYSTEM" as any,
          confidence: 0.0,
          timestamp: new Date(),
        },
      ],
      mitigationActions: [
        "IMMEDIATE_ESCALATION",
        "PAYMENT_HOLD",
        "MANUAL_REVIEW",
      ],
      confidenceInterval: { lower: 0.0, upper: 0.1, level: "NONE" },
      alertPriority: "IMMEDIATE",
      escalationPath: [
        "FRAUD_MANAGER",
        "COMPLIANCE_OFFICER",
        "CHIEF_FINANCIAL_OFFICER",
        "CHIEF_EXECUTIVE_OFFICER",
      ],
      investigationRequired: true,
      regulatoryReportingRequired: true,
      calculationTimestamp: new Date(),
      scoringDurationMs: durationMs,
      auditTrail,
      metadata: {
        scoringId,
        modelVersion: MODEL_VERSION,
        inputHash: this.generateInputHash(input),
        scoringStartTime: new Date(Date.now() - durationMs),
        scoringEndTime: new Date(),
        scoringDurationMs: durationMs,
        inputCharacteristics: {
          totalAmount: input.totalAmount,
          supplierAgeDays: input.supplierAgeDays,
          invoiceDate: input.invoiceDate,
          vatAmount: input.vatAmount,
          subtotal: input.subtotal,
          supplierVatNumber: input.supplierVatNumber,
          supplierCountry: input.supplierCountry,
          supplierIsPep: input.supplierIsPep,
        },
        contextCharacteristics: undefined,
        riskCharacteristics: {
          overallScore: 100,
          normalizedScore: 1.0,
          componentScores: {},
          riskFactorCount: 1,
          highestRiskFactorScore: 100,
          detectionMethodCount: 1,
          confidenceScore: 0.0,
          confidenceIntervalLower: 0.0,
          confidenceIntervalUpper: 0.1,
          confidenceLevel: "NONE",
        },
        systemCharacteristics: {
          environment: process.env.NODE_ENV || "development",
          region: process.env.REGION || "za-central-1",
          instanceId: process.env.INSTANCE_ID || "local",
          version: "4.1.7",
          buildNumber: process.env.BUILD_NUMBER || "local",
          buildDate: new Date(),
        },
      },
    };
  }
}

export default FraudScorer;
