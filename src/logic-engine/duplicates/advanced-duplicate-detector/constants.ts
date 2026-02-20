/**
 * CREDITORFLOW EMS - DUPLICATE DETECTION CONSTANTS
 * Version: 3.9.2
 *
 * Thresholds, weights, patterns, and configuration constants
 */

import {
  DuplicateType,
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
    patternType: "EXACT_INVOICE_NUMBER",
    description: "Exact invoice number match",
    severity: "CRITICAL",
  },
  {
    patternType: "FUZZY_INVOICE_NUMBER",
    description: "Fuzzy invoice number match",
    severity: "HIGH",
  },
  {
    patternType: "SAME_SUPPLIER_SAME_AMOUNT",
    description: "Same supplier, same amount, different invoice number",
    severity: "HIGH",
  },
  {
    patternType: "SAME_SUPPLIER_SAME_DATE",
    description: "Same supplier, same date, different invoice number",
    severity: "MEDIUM",
  },
  {
    patternType: "CROSS_SUPPLIER_DUPLICATE",
    description: "Different suppliers, same invoice details (fraud pattern)",
    severity: "CRITICAL",
  },
  {
    patternType: "PARTIAL_LINE_ITEM_MATCH",
    description: "Partial line item match across invoices",
    severity: "LOW",
  },
  {
    patternType: "TEMPORAL_CLUSTER",
    description: "Multiple invoices from same supplier within short timeframe",
    severity: "MEDIUM",
  },
  {
    patternType: "PO_REFERENCE_DUPLICATE",
    description: "Same PO reference across multiple invoices",
    severity: "HIGH",
  },
];

export const RISK_LEVELS: Record<DuplicateType, DuplicateRiskLevel> = {
  EXACT: "CRITICAL",
  FUZZY: "HIGH",
  TEMPORAL: "MEDIUM",
  SUPPLIER_CLUSTER: "HIGH",
  LINE_ITEM: "LOW",
  CROSS_SUPPLIER: "SEVERE",
  PO_REFERENCE: "HIGH",
  PARTIAL: "LOW",
  NONE: "LOW",
};

export const MITIGATION_ACTIONS: Record<
  DuplicateRiskLevel,
  DuplicateMitigationAction[]
> = {
  LOW: ["MONITOR", "FLAG_FOR_REVIEW"],
  MEDIUM: ["MANUAL_REVIEW", "SUPPLIER_VERIFICATION"],
  HIGH: ["HOLD_PAYMENT", "ESCALATE_TO_MANAGER", "SUPPLIER_CONTACT"],
  CRITICAL: ["BLOCK_PAYMENT", "IMMEDIATE_ESCALATION", "FRAUD_INVESTIGATION"],
  SEVERE: [
    "BLOCK_PAYMENT",
    "IMMEDIATE_ESCALATION",
    "REGULATORY_REPORTING",
    "LAW_ENFORCEMENT",
  ],
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
