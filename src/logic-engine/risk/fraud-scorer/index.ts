/**
 * CREDITORFLOW EMS - FRAUD SCORER MODULE
 * Version: 4.1.7
 * Main entry point for fraud detection functionality
 */

// Core class
export { FraudScorer } from "./core";
export { default } from "./core";

// Types and interfaces - re-export from types barrel
export type {
  FraudScoringContext,
  FraudScoringInput,
  FraudScoringResult,
  FraudRiskFactor,
  FraudConfidenceInterval,
  FraudModelVersion,
  FraudScoringMetadata,
  FraudAuditTrail,
  FraudSLATimeline,
  FraudScoringException,
} from "./types";

export type {
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
  AggregatedRiskAnalysis,
} from "./types";
