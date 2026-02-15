/**
 * CREDITORFLOW EMS - ADVANCED DUPLICATE DETECTION TYPES
 * Version: 3.9.2
 * 
 * Type definitions and interfaces for the duplicate detection engine
 */

import {
  DuplicateCheckResult,
  DuplicateType,
  DuplicateRiskLevel,
  DuplicateMitigationAction,
  DuplicateAuditTrail,
  DuplicatePattern,
  DuplicateEvidence,
  DuplicateEvidenceType,
  DuplicateEvidenceSource
} from '@/types/index';

export interface DuplicateCheckContext {
  businessUnit?: string;
  department?: string;
  supplierCategory?: string;
  historicalInvoices?: HistoricalInvoice[];
  temporalWindowDays?: number;
  confidenceThreshold?: number;
  enableContextualAnalysis?: boolean;
  enableFalsePositiveReduction?: boolean;
  customRules?: CustomDuplicateRule[];
  customWeights?: Record<string, number>;
  auditRequired?: boolean;
  regulatoryReportingEnabled?: boolean;
  investigationAutoEscalation?: boolean;
  userRiskProfile?: string;
  sessionData?: Record<string, any>;
  customAttributes?: Record<string, any>;
}

export interface HistoricalInvoice {
  invoiceId: string;
  invoiceNumber: string;
  supplierName: string;
  supplierVAT?: string;
  totalAmount: number;
  invoiceDate: Date;
  poNumber?: string;
  lineItems?: LineItem[];
  riskScore?: number;
  duplicateFlags?: string[];
}

export interface LineItem {
  lineNumber: number;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface CustomDuplicateRule {
  ruleId: string;
  ruleName: string;
  ruleDescription: string;
  ruleCondition: string;
  ruleAction: string;
  rulePriority: number;
  isActive: boolean;
}

export interface ExactMatch {
  candidateId: string;
  candidateInvoiceNumber: string;
  candidateSupplierName: string;
  candidateTotalAmount: number;
  candidateInvoiceDate: Date;
  matchTimestamp: Date;
}

export interface FuzzyMatch {
  candidateId: string;
  candidateInvoiceNumber: string;
  candidateSupplierName: string;
  candidateTotalAmount: number;
  candidateInvoiceDate: Date;
  matchType: 'INVOICE_NUMBER' | 'SUPPLIER_NAME' | 'TOTAL_AMOUNT' | 'INVOICE_DATE' | 'PO_NUMBER';
  algorithm: 'LEVENSHTEIN' | 'JARO_WINKLER' | 'SOUNDEX' | 'METAPHONE' | 'COSINE' | 'TFIDF';
  confidence: number;
  similarityScore: number;
  matchDetails: Record<string, any>;
}

export interface TemporalCluster {
  clusterId: string;
  supplierName: string;
  invoiceCount: number;
  timeWindowDays: number;
  centroidDate: Date;
  representativeInvoiceNumber: string;
  averageAmount: number;
  confidence: number;
  invoices: ClusterInvoice[];
}

export interface ClusterInvoice {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: Date;
  totalAmount: number;
}

export interface SupplierCluster {
  clusterId: string;
  supplierNames: string[];
  supplierVATs: string[];
  invoiceCount: number;
  confidence: number;
  clusterCentroid: Record<string, any>;
  suppliers: ClusterSupplier[];
}

export interface ClusterSupplier {
  supplierId: string;
  supplierName: string;
  supplierVAT?: string;
  invoiceCount: number;
}

export interface LineItemMatch {
  candidateId: string;
  candidateInvoiceNumber: string;
  candidateSupplierName: string;
  matchedLineItems: MatchedLineItem[];
  confidence: number;
  matchType: 'EXACT' | 'FUZZY' | 'SEMANTIC';
}

export interface MatchedLineItem {
  lineNumber: number;
  description: string;
  quantity: number;
  unitPrice: number;
  matchConfidence: number;
  matchType: 'EXACT' | 'FUZZY' | 'SEMANTIC';
}

export interface ContextualAnalysisResult {
  falsePositiveProbability: number;
  contextualFactors: ContextualFactor[];
  confidenceAdjustment: number;
  recommendation: 'PROCEED' | 'PROCEED_WITH_CAUTION' | 'MANUAL_REVIEW_REQUIRED' | 'BLOCK';
}

export interface ContextualFactor {
  factorType: string;
  factorDescription: string;
  factorImpact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  confidence: number;
  evidence: string;
}

export interface ConfidenceCalculationResult {
  overallConfidence: number;
  breakdown: ConfidenceBreakdown;
  requiresManualReview: boolean;
  isDefinitiveMatch: boolean;
  isDefinitiveNonMatch: boolean;
}

export interface ConfidenceBreakdown {
  fuzzyMatching: number;
  temporalAnalysis: number;
  supplierAnalysis: number;
  lineItemAnalysis: number;
  contextualAdjustment: number;
}

export interface PotentialDuplicate {
  duplicateId: string;
  invoiceNumber: string;
  supplierName: string;
  totalAmount: number;
  invoiceDate: Date;
  similarityScore: number;
  matchType: 'EXACT' | 'FUZZY' | 'TEMPORAL' | 'SUPPLIER_CLUSTER' | 'LINE_ITEM' | 'CROSS_SUPPLIER' | 'PO_REFERENCE' | 'PARTIAL';
  evidence: DuplicateEvidence[];
  requiresInvestigation: boolean;
  investigationPriority: InvestigationPriority;
}

export type InvestigationPriority = 'IMMEDIATE' | 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW' | 'MONITOR';

export class DuplicateDetectionException extends Error {
  constructor(
    public code: string,
    message: string,
    public checkId: string,
    public metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'DuplicateDetectionException';
  }
}

export {
  DuplicateCheckResult,
  DuplicateType,
  DuplicateRiskLevel,
  DuplicateMitigationAction,
  DuplicateAuditTrail,
  DuplicatePattern,
  DuplicateEvidence,
  DuplicateEvidenceType,
  DuplicateEvidenceSource
};
