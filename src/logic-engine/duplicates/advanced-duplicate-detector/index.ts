/**
 * CREDITORFLOW EMS - ADVANCED DUPLICATE DETECTOR INDEX
 * Version: 3.9.2
 *
 * Main entry point for the advanced duplicate detection engine
 * Re-exports all modules for easy consumption
 */

// Core detector class
export { AdvancedDuplicateDetector } from "./core";

// Types and interfaces
export type {
  DuplicateCheckContext,
  HistoricalInvoice,
  LineItem,
  CustomDuplicateRule,
  ExactMatch,
  FuzzyMatch,
  TemporalCluster,
  ClusterInvoice,
  SupplierCluster,
  ClusterSupplier,
  LineItemMatch,
  MatchedLineItem,
  ContextualAnalysisResult,
  ContextualFactor,
  ConfidenceCalculationResult,
  ConfidenceBreakdown,
  PotentialDuplicate,
  InvestigationPriority,
} from "./types";

export { DuplicateDetectionException } from "./types";

// Constants and configuration
export {
  DUPLICATE_THRESHOLDS,
  DUPLICATE_WEIGHTS,
  DUPLICATE_PATTERNS,
  RISK_LEVELS,
  MITIGATION_ACTIONS,
  FUZZY_MATCH_SETTINGS,
} from "./constants";

// Fuzzy matching algorithms
export {
  detectFuzzyMatches,
  fuzzyMatchInvoiceNumber,
  fuzzyMatchSupplierName,
  matchAmount,
} from "./algorithms";

// Phonetic and string similarity algorithms
export {
  calculateLevenshteinDistance,
  calculateJaroWinklerSimilarity,
  soundexEncode,
  metaphoneEncode,
  calculateCosineSimilarity,
} from "./phonetic";

// Hash-based duplicate detection
export {
  detectExactMatches,
  generateInputHash,
  generateMD5Hash,
  generatePerceptualHash,
  calculateHashSimilarity,
  generateRandomString,
  generateSecureId,
  DuplicateBloomFilter,
  generateSimHash,
  calculateSimHashSimilarity,
} from "./hash";

// Scoring and confidence calculation
export {
  calculateConfidence,
  determineDuplicateType,
  determineRiskLevel,
  generatePotentialDuplicates,
  determineInvestigationPriority,
  generateMitigationActions,
  identifyDuplicatePatterns,
  createExactMatchResult,
  createFailureResult,
  calculateWeightedScore,
  normalizeConfidence,
  calculateRiskScore,
  requiresEscalation,
} from "./scoring";

// Analysis functions
export {
  analyzeTemporalClusters,
  analyzeSupplierClusters,
  analyzeLineItems,
  performContextualAnalysis,
} from "./analysis";
