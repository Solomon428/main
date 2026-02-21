/**
 * CREDITORFLOW EMS - FRAUD SCORING ALGORITHMS
 * Version: 4.1.7
 * Scoring aggregation, normalization, and calculations
 */

import type {
  FraudScoringInput,
  FraudScoringContext,
  FraudRiskFactor,
  AggregatedRiskAnalysis,
  AmountRiskAnalysis,
  SupplierAgeRiskAnalysis,
  SupplierRiskProfileAnalysis,
  PaymentPatternRiskAnalysis,
  TemporalAnomalyRiskAnalysis,
  GeographicRiskAnalysis,
  BehavioralRiskAnalysis,
  NetworkRiskAnalysis,
  VATComplianceRiskAnalysis,
  RegulatoryRiskAnalysis,
  RiskLevel,
  FraudSeverityLevel,
  FraudAlertPriority,
  FraudEscalationPath,
  FraudConfidenceInterval,
  FraudMitigationAction,
} from "./types";
import {
  RISK_WEIGHTS,
  RISK_THRESHOLDS,
  CONFIDENCE_INTERVALS,
  ALERT_PRIORITIES,
  MITIGATION_ACTIONS,
} from "./constants";

/**
 * Aggregate weighted risk scores from all dimensions
 */
export function aggregateRiskScores(
  amountRisk: AmountRiskAnalysis,
  supplierAgeRisk: SupplierAgeRiskAnalysis,
  supplierRiskProfile: SupplierRiskProfileAnalysis,
  paymentPatternRisk: PaymentPatternRiskAnalysis,
  temporalAnomalyRisk: TemporalAnomalyRiskAnalysis,
  geographicRisk: GeographicRiskAnalysis,
  behavioralRisk: BehavioralRiskAnalysis,
  networkRisk: NetworkRiskAnalysis,
  vatComplianceRisk: VATComplianceRiskAnalysis,
  regulatoryRisk: RegulatoryRiskAnalysis,
  context?: FraudScoringContext,
  scoringId?: string,
): AggregatedRiskAnalysis {
  // Calculate weighted score
  const weightedScore =
    amountRisk.score * RISK_WEIGHTS.AMOUNT_RISK +
    supplierAgeRisk.score * RISK_WEIGHTS.SUPPLIER_AGE_RISK +
    supplierRiskProfile.score * RISK_WEIGHTS.SUPPLIER_RISK_PROFILE +
    paymentPatternRisk.score * RISK_WEIGHTS.PAYMENT_PATTERN_RISK +
    temporalAnomalyRisk.score * RISK_WEIGHTS.TEMPORAL_ANOMALY_RISK +
    geographicRisk.score * RISK_WEIGHTS.GEOGRAPHIC_RISK +
    behavioralRisk.score * RISK_WEIGHTS.BEHAVIORAL_RISK +
    networkRisk.score * RISK_WEIGHTS.NETWORK_RISK +
    vatComplianceRisk.score * RISK_WEIGHTS.VAT_COMPLIANCE_RISK +
    regulatoryRisk.score * RISK_WEIGHTS.REGULATORY_RISK;

  // Apply context-based adjustments
  let adjustedScore = weightedScore;

  if (context?.businessUnitRiskAppetite === "LOW") {
    adjustedScore *= 1.2; // Increase score for low-risk appetite business units
  } else if (context?.businessUnitRiskAppetite === "HIGH") {
    adjustedScore *= 0.9; // Decrease score for high-risk appetite business units
  }

  // Ensure score is within bounds
  adjustedScore = Math.min(100, Math.max(0, adjustedScore));

  return {
    overallScore: Math.round(adjustedScore),
    normalizedScore: adjustedScore / 100,
    componentScores: {
      amountRisk: amountRisk.score,
      supplierAgeRisk: supplierAgeRisk.score,
      supplierRiskProfile: supplierRiskProfile.score,
      paymentPatternRisk: paymentPatternRisk.score,
      temporalAnomalyRisk: temporalAnomalyRisk.score,
      geographicRisk: geographicRisk.score,
      behavioralRisk: behavioralRisk.score,
      networkRisk: networkRisk.score,
      vatComplianceRisk: vatComplianceRisk.score,
      regulatoryRisk: regulatoryRisk.score,
    },
    riskFactors: [
      ...amountRisk.riskFactors,
      ...supplierAgeRisk.riskFactors,
      ...supplierRiskProfile.riskFactors,
      ...paymentPatternRisk.riskFactors,
      ...temporalAnomalyRisk.riskFactors,
      ...geographicRisk.riskFactors,
      ...behavioralRisk.riskFactors,
      ...networkRisk.riskFactors,
      ...vatComplianceRisk.riskFactors,
      ...regulatoryRisk.riskFactors,
    ],
    detectionMethods: Array.from(
      new Set([
        ...amountRisk.detectionMethods,
        ...supplierAgeRisk.detectionMethods,
        ...supplierRiskProfile.detectionMethods,
        ...paymentPatternRisk.detectionMethods,
        ...temporalAnomalyRisk.detectionMethods,
        ...geographicRisk.detectionMethods,
        ...behavioralRisk.detectionMethods,
        ...networkRisk.detectionMethods,
        ...vatComplianceRisk.detectionMethods,
        ...regulatoryRisk.detectionMethods,
      ]),
    ),
    confidence:
      amountRisk.confidence * RISK_WEIGHTS.AMOUNT_RISK +
      supplierAgeRisk.confidence * RISK_WEIGHTS.SUPPLIER_AGE_RISK +
      supplierRiskProfile.confidence * RISK_WEIGHTS.SUPPLIER_RISK_PROFILE +
      paymentPatternRisk.confidence * RISK_WEIGHTS.PAYMENT_PATTERN_RISK +
      temporalAnomalyRisk.confidence * RISK_WEIGHTS.TEMPORAL_ANOMALY_RISK +
      geographicRisk.confidence * RISK_WEIGHTS.GEOGRAPHIC_RISK +
      behavioralRisk.confidence * RISK_WEIGHTS.BEHAVIORAL_RISK +
      networkRisk.confidence * RISK_WEIGHTS.NETWORK_RISK +
      vatComplianceRisk.confidence * RISK_WEIGHTS.VAT_COMPLIANCE_RISK +
      regulatoryRisk.confidence * RISK_WEIGHTS.REGULATORY_RISK,
    metadata: { scoringId },
  };
}

/**
 * Determine risk level based on aggregated score
 */
export function determineRiskLevel(
  score: number,
  scoringId?: string,
): RiskLevel {
  if (score >= RISK_THRESHOLDS.BLACKLISTED) return "BLACKLISTED";
  if (score >= RISK_THRESHOLDS.SEVERE) return "SEVERE";
  if (score >= RISK_THRESHOLDS.CRITICAL) return "CRITICAL";
  if (score >= RISK_THRESHOLDS.VERY_HIGH) return "VERY_HIGH";
  if (score >= RISK_THRESHOLDS.HIGH) return "HIGH";
  if (score >= RISK_THRESHOLDS.MEDIUM_HIGH) return "MEDIUM_HIGH";
  if (score >= RISK_THRESHOLDS.MEDIUM) return "MEDIUM";
  if (score >= RISK_THRESHOLDS.LOW_MEDIUM) return "LOW_MEDIUM";
  if (score >= RISK_THRESHOLDS.LOW) return "LOW";
  if (score >= RISK_THRESHOLDS.VERY_LOW) return "VERY_LOW";
  return "NO_RISK";
}

/**
 * Determine severity level based on risk level and factors
 */
export function determineSeverityLevel(
  riskLevel: RiskLevel,
  riskFactors: FraudRiskFactor[],
  scoringId?: string,
): FraudSeverityLevel {
  switch (riskLevel) {
    case "BLACKLISTED":
    case "SEVERE":
      return "SEVERE";
    case "CRITICAL":
      return "CRITICAL";
    case "VERY_HIGH":
    case "HIGH":
      return "HIGH";
    case "MEDIUM_HIGH":
    case "MEDIUM":
      return "MEDIUM";
    case "LOW_MEDIUM":
    case "LOW":
    case "VERY_LOW":
    case "NO_RISK":
      return "LOW";
    default:
      return "MEDIUM";
  }
}

/**
 * Generate comprehensive risk factors from component analyses
 */
export function generateRiskFactors(
  amountRisk: AmountRiskAnalysis,
  supplierAgeRisk: SupplierAgeRiskAnalysis,
  supplierRiskProfile: SupplierRiskProfileAnalysis,
  paymentPatternRisk: PaymentPatternRiskAnalysis,
  temporalAnomalyRisk: TemporalAnomalyRiskAnalysis,
  geographicRisk: GeographicRiskAnalysis,
  behavioralRisk: BehavioralRiskAnalysis,
  networkRisk: NetworkRiskAnalysis,
  vatComplianceRisk: VATComplianceRiskAnalysis,
  regulatoryRisk: RegulatoryRiskAnalysis,
  scoringId?: string,
): FraudRiskFactor[] {
  return [
    ...amountRisk.riskFactors,
    ...supplierAgeRisk.riskFactors,
    ...supplierRiskProfile.riskFactors,
    ...paymentPatternRisk.riskFactors,
    ...temporalAnomalyRisk.riskFactors,
    ...geographicRisk.riskFactors,
    ...behavioralRisk.riskFactors,
    ...networkRisk.riskFactors,
    ...vatComplianceRisk.riskFactors,
    ...regulatoryRisk.riskFactors,
  ].sort((a, b) => b.scoreImpact - a.scoreImpact);
}

/**
 * Generate mitigation actions based on risk factors and severity
 */
export function generateMitigationActions(
  riskFactors: FraudRiskFactor[],
  severityLevel: FraudSeverityLevel,
  scoringId?: string,
): FraudMitigationAction[] {
  const actions = new Set<FraudMitigationAction>();

  // Add severity-based actions
  switch (severityLevel) {
    case "SEVERE":
    case "CRITICAL":
      actions.add("IMMEDIATE_ESCALATION");
      actions.add("PAYMENT_HOLD");
      actions.add("SUPPLIER_SUSPENSION");
      actions.add("REGULATORY_REPORTING");
      break;
    case "HIGH":
      actions.add("ENHANCED_SCRUTINY");
      actions.add("MANUAL_REVIEW");
      actions.add("APPROVAL_ESCALATION");
      actions.add("SUPPLIER_VERIFICATION");
      break;
    case "MEDIUM":
      actions.add("STANDARD_REVIEW");
      actions.add("APPROVAL_REQUIRED");
      break;
    case "LOW":
      actions.add("AUTOMATED_APPROVAL");
      break;
  }

  // Add factor-based actions
  riskFactors.forEach((factor) => {
    const factorActions = MITIGATION_ACTIONS[factor.category] || [];
    factorActions.forEach((action) => actions.add(action));
  });

  return Array.from(actions);
}

/**
 * Calculate confidence interval for risk score
 */
export function calculateConfidenceInterval(
  score: number,
  riskLevel: RiskLevel,
  scoringId?: string,
): FraudConfidenceInterval {
  return (
    CONFIDENCE_INTERVALS[riskLevel] || {
      lower: 0.5,
      upper: 0.7,
      level: "LOW",
    }
  );
}

/**
 * Determine alert priority based on severity level
 */
export function determineAlertPriority(
  severityLevel: FraudSeverityLevel,
  scoringId?: string,
): FraudAlertPriority {
  return ALERT_PRIORITIES[severityLevel] || "MEDIUM";
}

/**
 * Determine escalation path based on severity and risk level
 */
export function determineEscalationPath(
  severityLevel: FraudSeverityLevel,
  riskLevel: RiskLevel,
  scoringId?: string,
): FraudEscalationPath[] {
  switch (severityLevel) {
    case "SEVERE":
    case "CRITICAL":
      return [
        "FRAUD_MANAGER",
        "COMPLIANCE_OFFICER",
        "CHIEF_FINANCIAL_OFFICER",
        "CHIEF_EXECUTIVE_OFFICER",
        "BOARD_OF_DIRECTORS",
        "REGULATORY_BODY",
      ];
    case "HIGH":
      return [
        "FRAUD_MANAGER",
        "COMPLIANCE_OFFICER",
        "RISK_MANAGER",
        "CHIEF_FINANCIAL_OFFICER",
      ];
    case "MEDIUM":
      return ["FRAUD_ANALYST", "FRAUD_MANAGER", "COMPLIANCE_OFFICER"];
    case "LOW":
      return ["FRAUD_ANALYST"];
    default:
      return ["FRAUD_ANALYST"];
  }
}
