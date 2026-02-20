/**
 * CREDITORFLOW EMS - SUPPLIER RISK ANALYZER
 * Version: 4.1.7
 * Supplier risk profile and age analysis
 */

import type {
  FraudScoringInput,
  FraudScoringContext,
  FraudRiskFactor,
  SupplierAgeRiskAnalysis,
  SupplierRiskProfileAnalysis,
} from "../types";
import { FraudDetectionMethod } from "../types";
import { SA_COMPLIANCE_RULES } from "../constants";

/**
 * Calculate risk score based on supplier age analysis
 */
export function calculateSupplierAgeRisk(
  input: FraudScoringInput,
  context?: FraudScoringContext,
  scoringId?: string,
): SupplierAgeRiskAnalysis {
  let baseScore = 0;
  const riskFactors: FraudRiskFactor[] = [];
  const supplierAgeDays = input.supplierAgeDays ?? 0;

  // SARS 90-day supplier probation rule
  if (supplierAgeDays < SA_COMPLIANCE_RULES.SUPPLIER_PROBATION_DAYS) {
    baseScore += 25;
    riskFactors.push({
      category: "SUPPLIER_RISK",
      factor: "NEW_SUPPLIER_PROBATION",
      description: `Supplier is within SARS 90-day probation period (${supplierAgeDays} days old)`,
      severity: "HIGH",
      scoreImpact: 25,
      evidence: `supplierAgeDays=${supplierAgeDays}`,
      detectionMethod: FraudDetectionMethod.RULE_BASED,
      confidence: 0.95,
      timestamp: new Date(),
    });
  } else if (supplierAgeDays < 365) {
    baseScore += 10;
    riskFactors.push({
      category: "SUPPLIER_RISK",
      factor: "YOUNG_SUPPLIER",
      description: `Supplier is less than 1 year old (${supplierAgeDays} days)`,
      severity: "MEDIUM",
      scoreImpact: 10,
      evidence: `supplierAgeDays=${supplierAgeDays}`,
      detectionMethod: FraudDetectionMethod.RULE_BASED,
      confidence: 0.85,
      timestamp: new Date(),
    });
  }

  return {
    score: Math.min(100, Math.max(0, baseScore)),
    normalizedScore: baseScore / 100,
    riskFactors,
    detectionMethods: [FraudDetectionMethod.RULE_BASED],
    confidence: riskFactors.length > 0 ? 0.9 : 0.7,
    metadata: { scoringId },
  };
}

/**
 * Calculate comprehensive supplier risk profile
 */
export function calculateSupplierRiskProfile(
  input: FraudScoringInput,
  context?: FraudScoringContext,
  scoringId?: string,
): SupplierRiskProfileAnalysis {
  // Placeholder for integration with SupplierRiskProfile service
  // In production, this would call external risk data providers

  const riskScore = input.supplierRiskScore ?? 50;
  const riskLevel = riskScore > 75 ? "HIGH" : riskScore > 50 ? "MEDIUM" : "LOW";

  return {
    score: riskScore,
    normalizedScore: riskScore / 100,
    riskLevel: riskLevel as import("../types").RiskLevel,
    riskFactors: input.supplierRiskFactors ?? [],
    detectionMethods: [FraudDetectionMethod.EXTERNAL_DATA],
    confidence: 0.75,
    metadata: {
      scoringId,
      supplierId: input.supplierId,
      supplierName: input.supplierName,
    },
  };
}
