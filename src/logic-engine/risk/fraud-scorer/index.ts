/**
 * CREDITORFLOW EMS - FRAUD SCORER MODULE
 * Version: 4.1.7
 * Main entry point for fraud detection functionality
 */

// Core class
export { FraudScorer } from './core';
export { default } from './core';

// Types and interfaces
export type {
  FraudScoringContext,
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
  FraudScoringInput,
  FraudScoringResult,
  FraudRiskFactor,
  FraudConfidenceInterval,
  FraudModelVersion,
  FraudScoringMetadata,
  FraudAuditTrail,
  FraudSLATimeline
};
