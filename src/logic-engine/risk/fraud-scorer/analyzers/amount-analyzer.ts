/**
 * CREDITORFLOW EMS - AMOUNT RISK ANALYZER
 * Version: 4.1.7
 * Invoice amount analysis and anomaly detection
 */

import type {
  FraudScoringInput,
  FraudScoringContext,
  FraudRiskFactor,
  AmountRiskAnalysis,
} from "../types";
import { FraudDetectionMethod, FraudRiskCategory, FraudSeverityLevel } from "../types";
import { SA_COMPLIANCE_RULES } from "../constants";

/**
 * Calculate risk score based on invoice amount analysis
 */
export function calculateAmountRisk(
  input: FraudScoringInput,
  context?: FraudScoringContext,
  scoringId?: string,
): AmountRiskAnalysis {
  let baseScore = 0;
  const riskFactors: FraudRiskFactor[] = [];

  // SARS high-value threshold (R50,000)
  if (input.totalAmount >= SA_COMPLIANCE_RULES.HIGH_VALUE_THRESHOLD) {
    const deduction = Math.min(
      30,
      (input.totalAmount - SA_COMPLIANCE_RULES.HIGH_VALUE_THRESHOLD) / 10000,
    );
    baseScore += deduction;
    riskFactors.push({
      category: FraudRiskCategory.AMOUNT_ANOMALY,
      factor: "HIGH_VALUE_INVOICE",
      description: `Invoice amount R${input.totalAmount.toLocaleString()} exceeds SARS threshold of R${SA_COMPLIANCE_RULES.HIGH_VALUE_THRESHOLD.toLocaleString()}`,
      severity: FraudSeverityLevel.HIGH,
      scoreImpact: deduction,
      evidence: `totalAmount=${input.totalAmount}`,
      detectionMethod: FraudDetectionMethod.RULE_BASED,
      confidence: 0.95,
      timestamp: new Date(),
    });
  }

  // Round amount detection (fraud pattern)
  const fractionalPart = input.totalAmount % 1;
  if (
    fractionalPart === 0 ||
    fractionalPart > SA_COMPLIANCE_RULES.ROUND_AMOUNT_THRESHOLD
  ) {
    baseScore += 15;
    riskFactors.push({
      category: FraudRiskCategory.AMOUNT_ANOMALY,
      factor: "ROUND_AMOUNT_DETECTED",
      description: `Suspicious round amount detected: R${input.totalAmount.toLocaleString()}`,
      severity: FraudSeverityLevel.MEDIUM,
      scoreImpact: 15,
      evidence: `fractionalPart=${fractionalPart}`,
      detectionMethod: FraudDetectionMethod.STATISTICAL,
      confidence: 0.85,
      timestamp: new Date(),
    });
  }

  // Amount velocity analysis (if context available)
  if (context?.historicalAmounts && context.historicalAmounts.length > 5) {
    const avgAmount =
      context.historicalAmounts.reduce((sum, amt) => sum + amt, 0) /
      context.historicalAmounts.length;
    const stdDev = Math.sqrt(
      context.historicalAmounts.reduce(
        (sum, amt) => sum + Math.pow(amt - avgAmount, 2),
        0,
      ) / context.historicalAmounts.length,
    );

    if (input.totalAmount > avgAmount + 3 * stdDev) {
      baseScore += 20;
      riskFactors.push({
        category: FraudRiskCategory.AMOUNT_ANOMALY,
        factor: "AMOUNT_VELOCITY_SPIKE",
        description: `Invoice amount significantly exceeds historical average (3+ standard deviations)`,
        severity: FraudSeverityLevel.HIGH,
        scoreImpact: 20,
        evidence: `avgAmount=${avgAmount}, stdDev=${stdDev}, currentAmount=${input.totalAmount}`,
        detectionMethod: FraudDetectionMethod.STATISTICAL,
        confidence: 0.9,
        timestamp: new Date(),
      });
    }
  }

  return {
    score: Math.min(100, Math.max(0, baseScore)),
    normalizedScore: baseScore / 100,
    riskFactors,
    detectionMethods: [
      FraudDetectionMethod.RULE_BASED,
      FraudDetectionMethod.STATISTICAL,
    ],
    confidence: riskFactors.length > 0 ? 0.9 : 0.5,
    metadata: { scoringId },
  };
}
