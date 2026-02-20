/**
 * CREDITORFLOW EMS - ANALYSIS TYPES
 * Version: 4.1.7
 * Risk analysis result interfaces
 */

import { FraudDetectionMethod, RiskLevel } from "./enums";
import { FraudRiskFactor } from "./core-types";

export interface AmountRiskAnalysis {
  score: number;
  normalizedScore: number;
  riskFactors: FraudRiskFactor[];
  detectionMethods: FraudDetectionMethod[];
  confidence: number;
  metadata: Record<string, any>;
}

export interface SupplierAgeRiskAnalysis {
  score: number;
  normalizedScore: number;
  riskFactors: FraudRiskFactor[];
  detectionMethods: FraudDetectionMethod[];
  confidence: number;
  metadata: Record<string, any>;
}

export interface SupplierRiskProfileAnalysis {
  score: number;
  normalizedScore: number;
  riskLevel: RiskLevel;
  riskFactors: FraudRiskFactor[];
  detectionMethods: FraudDetectionMethod[];
  confidence: number;
  metadata: Record<string, any>;
}

export interface PaymentPatternRiskAnalysis {
  score: number;
  normalizedScore: number;
  riskFactors: FraudRiskFactor[];
  detectionMethods: FraudDetectionMethod[];
  confidence: number;
  metadata: Record<string, any>;
}

export interface TemporalAnomalyRiskAnalysis {
  score: number;
  normalizedScore: number;
  riskFactors: FraudRiskFactor[];
  detectionMethods: FraudDetectionMethod[];
  confidence: number;
  metadata: Record<string, any>;
}

export interface GeographicRiskAnalysis {
  score: number;
  normalizedScore: number;
  riskFactors: FraudRiskFactor[];
  detectionMethods: FraudDetectionMethod[];
  confidence: number;
  metadata: Record<string, any>;
}

export interface BehavioralRiskAnalysis {
  score: number;
  normalizedScore: number;
  riskFactors: FraudRiskFactor[];
  detectionMethods: FraudDetectionMethod[];
  confidence: number;
  metadata: Record<string, any>;
}

export interface NetworkRiskAnalysis {
  score: number;
  normalizedScore: number;
  riskFactors: FraudRiskFactor[];
  detectionMethods: FraudDetectionMethod[];
  confidence: number;
  metadata: Record<string, any>;
}

export interface VATComplianceRiskAnalysis {
  score: number;
  normalizedScore: number;
  riskFactors: FraudRiskFactor[];
  detectionMethods: FraudDetectionMethod[];
  confidence: number;
  metadata: Record<string, any>;
}

export interface RegulatoryRiskAnalysis {
  score: number;
  normalizedScore: number;
  riskFactors: FraudRiskFactor[];
  detectionMethods: FraudDetectionMethod[];
  confidence: number;
  metadata: Record<string, any>;
}

export interface AggregatedRiskAnalysis {
  overallScore: number;
  normalizedScore: number;
  componentScores: Record<string, number>;
  riskFactors: FraudRiskFactor[];
  detectionMethods: FraudDetectionMethod[];
  confidence: number;
  metadata: Record<string, any>;
}
