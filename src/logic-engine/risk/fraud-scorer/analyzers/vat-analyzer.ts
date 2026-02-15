/**
 * CREDITORFLOW EMS - VAT COMPLIANCE ANALYZER
 * Version: 4.1.7
 * VAT compliance and tax number validation
 */

import type {
  FraudScoringInput,
  FraudScoringContext,
  FraudRiskFactor,
  VATComplianceRiskAnalysis
} from '../types';
import { FraudDetectionMethod } from '../types';
import { SA_COMPLIANCE_RULES } from '../constants';

/**
 * Calculate risk score based on VAT compliance analysis
 */
export function calculateVATComplianceRisk(
  input: FraudScoringInput,
  context?: FraudScoringContext,
  scoringId?: string
): VATComplianceRiskAnalysis {
  let baseScore = 0;
  const riskFactors: FraudRiskFactor[] = [];

  // VAT number validation (SA format: 10 digits starting with 4)
  if (input.supplierVatNumber && !/^4\d{9}$/.test(input.supplierVatNumber)) {
    baseScore += 30;
    riskFactors.push({
      category: 'VAT_NON_COMPLIANCE',
      factor: 'INVALID_VAT_NUMBER_FORMAT',
      description: `VAT number does not match SA format (10 digits starting with 4): ${input.supplierVatNumber}`,
      severity: 'HIGH',
      scoreImpact: 30,
      evidence: `supplierVatNumber=${input.supplierVatNumber}`,
      detectionMethod: FraudDetectionMethod.RULE_BASED,
      confidence: 0.98,
      timestamp: new Date()
    });
  }

  // VAT calculation validation
  if (input.vatAmount && input.subtotal) {
    const expectedVat = input.subtotal * 0.15;
    const tolerance = SA_COMPLIANCE_RULES.VAT_ROUNDING_TOLERANCE;

    if (Math.abs(input.vatAmount - expectedVat) > tolerance) {
      baseScore += 40;
      riskFactors.push({
        category: 'VAT_NON_COMPLIANCE',
        factor: 'VAT_CALCULATION_MISMATCH',
        description: `VAT amount mismatch: expected R${expectedVat.toFixed(2)}, actual R${input.vatAmount.toFixed(2)} (tolerance: R${tolerance})`,
        severity: 'CRITICAL',
        scoreImpact: 40,
        evidence: `subtotal=${input.subtotal}, vatAmount=${input.vatAmount}, expectedVat=${expectedVat}`,
        detectionMethod: FraudDetectionMethod.RULE_BASED,
        confidence: 0.95,
        timestamp: new Date()
      });
    }
  }

  return {
    score: Math.min(100, Math.max(0, baseScore)),
    normalizedScore: baseScore / 100,
    riskFactors,
    detectionMethods: [FraudDetectionMethod.RULE_BASED],
    confidence: riskFactors.length > 0 ? 0.95 : 0.80,
    metadata: { scoringId }
  };
}
