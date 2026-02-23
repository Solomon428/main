/**
 * CREDITORFLOW EMS - DUPLICATE DETECTION CONSTANTS
 * Version: 3.9.2
 *
 * Thresholds, weights, patterns, and configuration constants
 */

import { DuplicateType } from "@/types/sqlite";
import {
  DuplicateRiskLevel,
  DuplicateMitigationAction,
  DuplicatePattern,
} from "@/types/index";

export const DUPLICATE_THRESHOLDS = {
  EXACT_MATCH: 1.0,
  VERY_HIGH_CONFIDENCE: 0.95,
  HIGH_CONFIDENCE: 0.85,
  MEDIUM_CONFIDENCE: 0.7,
  LOW_CONFIDENCE: 0.5,
  MIN_CONFIDENCE: 0.3,
} as const;

export const DUPLICATE_WEIGHTS = {
  INVOICE_NUMBER: 0.3,
  SUPPLIER_NAME: 0.2,
  TOTAL_AMOUNT: 0.15,
  INVOICE_DATE: 0.1,
  SUPPLIER_VAT: 0.1,
  LINE_ITEMS: 0.15,
} as const;

export const DUPLICATE_PATTERNS: DuplicatePattern[] = [
  {
    patternId: "exact-invoice",
    patternName: "EXACT_INVOICE_NUMBER",
    patternDescription: "Exact invoice number match",
    patternType: "EXACT_INVOICE_NUMBER",
    matchCriteria: {},
    confidenceThreshold: 1.0,
    isActive: true,
    lastUpdated: new Date(),
  },
  {
    patternId: "fuzzy-invoice",
    patternName: "FUZZY_INVOICE_NUMBER",
    patternDescription: "Fuzzy invoice number match",
    patternType: "FUZZY_INVOICE_NUMBER",
    matchCriteria: {},
    confidenceThreshold: 0.85,
    isActive: true,
    lastUpdated: new Date(),
  },
  {
    patternId: "same-supplier-amount",
    patternName: "SAME_SUPPLIER_SAME_AMOUNT",
    patternDescription: "Same supplier, same amount, different invoice number",
    patternType: "SAME_SUPPLIER_SAME_AMOUNT",
    matchCriteria: {},
    confidenceThreshold: 0.85,
    isActive: true,
    lastUpdated: new Date(),
  },
  {
    patternId: "same-supplier-date",
    patternName: "SAME_SUPPLIER_SAME_DATE",
    patternDescription: "Same supplier, same date, different invoice number",
    patternType: "SAME_SUPPLIER_SAME_DATE",
    matchCriteria: {},
    confidenceThreshold: 0.7,
    isActive: true,
    lastUpdated: new Date(),
  },
  {
    patternId: "cross-supplier",
    patternName: "CROSS_SUPPLIER_DUPLICATE",
    patternDescription: "Different suppliers, same invoice details (fraud pattern)",
    patternType: "CROSS_SUPPLIER_DUPLICATE",
    matchCriteria: {},
    confidenceThreshold: 0.9,
    isActive: true,
    lastUpdated: new Date(),
  },
  {
    patternId: "partial-line-item",
    patternName: "PARTIAL_LINE_ITEM_MATCH",
    patternDescription: "Partial line item match across invoices",
    patternType: "PARTIAL_LINE_ITEM_MATCH",
    matchCriteria: {},
    confidenceThreshold: 0.5,
    isActive: true,
    lastUpdated: new Date(),
  },
  {
    patternId: "temporal-cluster",
    patternName: "TEMPORAL_CLUSTER",
    patternDescription: "Multiple invoices from same supplier within short timeframe",
    patternType: "TEMPORAL_CLUSTER",
    matchCriteria: {},
    confidenceThreshold: 0.7,
    isActive: true,
    lastUpdated: new Date(),
  },
  {
    patternId: "po-reference",
    patternName: "PO_REFERENCE_DUPLICATE",
    patternDescription: "Same PO reference across multiple invoices",
    patternType: "PO_REFERENCE_DUPLICATE",
    matchCriteria: {},
    confidenceThreshold: 0.85,
    isActive: true,
    lastUpdated: new Date(),
  },
];

export const RISK_LEVELS: Record<DuplicateType, DuplicateRiskLevel> = {
  EXACT: "CRITICAL",
  FUZZY: "HIGH",
  TEMPORAL: "MEDIUM",
  SUPPLIER_CLUSTER: "HIGH",
  LINE_ITEM: "LOW",
  CROSS_SUPPLIER: "CRITICAL",
  PO_REFERENCE: "HIGH",
  PARTIAL: "LOW",
};

export const MITIGATION_ACTIONS: Record<
  DuplicateRiskLevel,
  DuplicateMitigationAction[]
> = {
  LOW: ["ACCEPT"],
  MEDIUM: ["FLAG_FOR_HUMAN_REVIEW", "REVIEW"],
  HIGH: ["ESCALATE", "BLOCK", "FLAG_FOR_HUMAN_REVIEW"],
  CRITICAL: ["BLOCK", "ESCALATE", "FLAG_FOR_HUMAN_REVIEW"],
};

export const FUZZY_MATCH_SETTINGS = {
  LEVENSHTEIN_MAX_DISTANCE: 3,
  JARO_WINKLER_THRESHOLD: 0.85,
  SOUNDEX_SIMILARITY_THRESHOLD: 0.8,
  METAPHONE_SIMILARITY_THRESHOLD: 0.8,
  COSINE_SIMILARITY_THRESHOLD: 0.75,
  TFIDF_SIMILARITY_THRESHOLD: 0.7,
  AMOUNT_TOLERANCE_PERCENTAGE: 0.02,
  AMOUNT_TOLERANCE_ABSOLUTE: 0.5,
  DATE_TOLERANCE_DAYS: 3,
} as const;
