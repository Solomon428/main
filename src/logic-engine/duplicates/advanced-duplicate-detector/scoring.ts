/**
 * CREDITORFLOW EMS - DUPLICATE SCORING & CONFIDENCE CALCULATION
 * Version: 3.9.2
 * 
 * Confidence calculation, risk assessment, and scoring algorithms
 */

import {
  DuplicateCheckInput,
  DuplicateCheckResult,
  DuplicateType,
  DuplicateRiskLevel,
  DuplicateMitigationAction,
  DuplicatePattern,
  DuplicateEvidence,
  DuplicateEvidenceType,
  DuplicateEvidenceSource,
  FuzzyMatch,
  TemporalCluster,
  SupplierCluster,
  LineItemMatch,
  PotentialDuplicate,
  ContextualAnalysisResult,
  ConfidenceCalculationResult,
  ConfidenceBreakdown,
  InvestigationPriority,
  DuplicateDetectionException
} from './types';

import {
  DUPLICATE_THRESHOLDS,
  DUPLICATE_PATTERNS,
  RISK_LEVELS,
  MITIGATION_ACTIONS
} from './constants';

import { generateInputHash, generateRandomString } from './hash';

/**
 * Calculate overall confidence from all detection methods
 * Uses weighted scoring to combine different analysis results
 */
export function calculateConfidence(
  fuzzyMatches: FuzzyMatch[],
  temporalClusters: TemporalCluster[],
  supplierClusters: SupplierCluster[],
  lineItemMatches: LineItemMatch[],
  contextualAnalysis: ContextualAnalysisResult,
  checkId: string
): ConfidenceCalculationResult {
  // Calculate weighted confidence
  let overallConfidence = 0.0;
  const breakdown: ConfidenceBreakdown = {
    fuzzyMatching: 0.0,
    temporalAnalysis: 0.0,
    supplierAnalysis: 0.0,
    lineItemAnalysis: 0.0,
    contextualAdjustment: 0.0
  };
  
  // Fuzzy matching confidence (40% weight)
  if (fuzzyMatches.length > 0) {
    const maxConfidence = Math.max(...fuzzyMatches.map(m => m.confidence));
    breakdown.fuzzyMatching = maxConfidence;
    overallConfidence += maxConfidence * 0.40;
  }
  
  // Temporal cluster confidence (20% weight)
  if (temporalClusters.length > 0) {
    const maxConfidence = Math.max(...temporalClusters.map(c => c.confidence));
    breakdown.temporalAnalysis = maxConfidence;
    overallConfidence += maxConfidence * 0.20;
  }
  
  // Supplier cluster confidence (20% weight)
  if (supplierClusters.length > 0) {
    const maxConfidence = Math.max(...supplierClusters.map(c => c.confidence));
    breakdown.supplierAnalysis = maxConfidence;
    overallConfidence += maxConfidence * 0.20;
  }
  
  // Line item confidence (20% weight)
  if (lineItemMatches.length > 0) {
    const maxConfidence = Math.max(...lineItemMatches.map(m => m.confidence));
    breakdown.lineItemAnalysis = maxConfidence;
    overallConfidence += maxConfidence * 0.20;
  }
  
  // Apply contextual adjustment (false positive reduction)
  overallConfidence += contextualAnalysis.confidenceAdjustment;
  breakdown.contextualAdjustment = contextualAnalysis.confidenceAdjustment;
  
  // Ensure confidence is within bounds [0, 1]
  overallConfidence = Math.min(1.0, Math.max(0.0, overallConfidence));
  
  return {
    overallConfidence,
    breakdown,
    requiresManualReview: overallConfidence >= DUPLICATE_THRESHOLDS.LOW_CONFIDENCE && 
                         overallConfidence < DUPLICATE_THRESHOLDS.HIGH_CONFIDENCE,
    isDefinitiveMatch: overallConfidence >= DUPLICATE_THRESHOLDS.VERY_HIGH_CONFIDENCE,
    isDefinitiveNonMatch: overallConfidence < DUPLICATE_THRESHOLDS.MIN_CONFIDENCE
  };
}

/**
 * Determine duplicate type based on detection results and confidence
 */
export function determineDuplicateType(
  confidenceResult: ConfidenceCalculationResult,
  fuzzyMatches: FuzzyMatch[],
  temporalClusters: TemporalCluster[],
  supplierClusters: SupplierCluster[],
  checkId: string
): DuplicateType {
  if (confidenceResult.isDefinitiveMatch) {
    // Check for exact invoice number match
    if (fuzzyMatches.some(m => m.matchType === 'INVOICE_NUMBER' && m.confidence >= 0.95)) {
      return 'EXACT';
    }
    
    // Check for fuzzy invoice number match
    if (fuzzyMatches.some(m => m.matchType === 'INVOICE_NUMBER' && m.confidence >= 0.85)) {
      return 'FUZZY';
    }
    
    // Check for temporal clustering
    if (temporalClusters.length > 0) {
      return 'TEMPORAL';
    }
    
    // Check for supplier clustering
    if (supplierClusters.length > 0) {
      return 'SUPPLIER_CLUSTER';
    }
    
    // Default to fuzzy if we have matches
    return 'FUZZY';
  }
  
  if (confidenceResult.requiresManualReview) {
    // Check for temporal + supplier combination
    if (temporalClusters.length > 0 && supplierClusters.length > 0) {
      return 'TEMPORAL';
    }
    return 'PARTIAL';
  }
  
  return 'NONE';
}

/**
 * Determine risk level based on duplicate type and confidence
 */
export function determineRiskLevel(
  duplicateType: DuplicateType,
  confidence: number,
  checkId: string
): DuplicateRiskLevel {
  if (duplicateType === 'NONE') return 'LOW';
  if (duplicateType === 'PARTIAL') return 'LOW';
  if (duplicateType === 'LINE_ITEM') return 'LOW';
  
  const baseRisk = RISK_LEVELS[duplicateType] || 'MEDIUM';
  
  // Adjust risk based on confidence level
  if (confidence >= 0.95) {
    return baseRisk === 'MEDIUM' ? 'HIGH' : baseRisk;
  }
  
  if (confidence >= 0.85) {
    return baseRisk === 'LOW' ? 'MEDIUM' : baseRisk;
  }
  
  return baseRisk;
}

/**
 * Generate potential duplicates list with evidence
 */
export function generatePotentialDuplicates(
  fuzzyMatches: FuzzyMatch[],
  temporalClusters: TemporalCluster[],
  supplierClusters: SupplierCluster[],
  lineItemMatches: LineItemMatch[],
  confidenceResult: ConfidenceCalculationResult,
  duplicateType: DuplicateType,
  riskLevel: DuplicateRiskLevel,
  checkId: string
): PotentialDuplicate[] {
  const duplicates: PotentialDuplicate[] = [];
  
  // Add fuzzy matches
  fuzzyMatches.forEach(match => {
    duplicates.push({
      duplicateId: match.candidateId,
      invoiceNumber: match.candidateInvoiceNumber,
      supplierName: match.candidateSupplierName,
      totalAmount: match.candidateTotalAmount,
      invoiceDate: match.candidateInvoiceDate,
      similarityScore: match.confidence,
      matchType: 'FUZZY',
      evidence: [{
        evidenceType: 'FUZZY_MATCH' as DuplicateEvidenceType,
        evidenceSource: 'ALGORITHM' as DuplicateEvidenceSource,
        description: `Fuzzy match on ${match.matchType} with ${match.algorithm} algorithm`,
        confidence: match.confidence,
        timestamp: new Date()
      }],
      requiresInvestigation: riskLevel === 'HIGH' || riskLevel === 'CRITICAL' || riskLevel === 'SEVERE',
      investigationPriority: determineInvestigationPriority(riskLevel, match.confidence, checkId)
    });
  });
  
  // Add temporal clusters
  temporalClusters.forEach(cluster => {
    duplicates.push({
      duplicateId: cluster.clusterId,
      invoiceNumber: cluster.representativeInvoiceNumber,
      supplierName: cluster.supplierName,
      totalAmount: cluster.averageAmount,
      invoiceDate: cluster.centroidDate,
      similarityScore: cluster.confidence,
      matchType: 'TEMPORAL',
      evidence: [{
        evidenceType: 'TEMPORAL_CLUSTER' as DuplicateEvidenceType,
        evidenceSource: 'ANALYSIS' as DuplicateEvidenceSource,
        description: `Temporal cluster of ${cluster.invoiceCount} invoices within ${cluster.timeWindowDays} days`,
        confidence: cluster.confidence,
        timestamp: new Date()
      }],
      requiresInvestigation: riskLevel === 'HIGH' || riskLevel === 'CRITICAL' || riskLevel === 'SEVERE',
      investigationPriority: determineInvestigationPriority(riskLevel, cluster.confidence, checkId)
    });
  });
  
  // Add supplier clusters
  supplierClusters.forEach(cluster => {
    duplicates.push({
      duplicateId: cluster.clusterId,
      invoiceNumber: cluster.supplierNames[0] || 'UNKNOWN',
      supplierName: cluster.supplierNames.join(', '),
      totalAmount: 0, // Not applicable for supplier clusters
      invoiceDate: new Date(),
      similarityScore: cluster.confidence,
      matchType: 'SUPPLIER_CLUSTER',
      evidence: [{
        evidenceType: 'SUPPLIER_MATCH' as DuplicateEvidenceType,
        evidenceSource: 'CLUSTERING' as DuplicateEvidenceSource,
        description: `Supplier cluster with ${cluster.invoiceCount} invoices`,
        confidence: cluster.confidence,
        timestamp: new Date()
      }],
      requiresInvestigation: riskLevel === 'HIGH' || riskLevel === 'CRITICAL' || riskLevel === 'SEVERE',
      investigationPriority: determineInvestigationPriority(riskLevel, cluster.confidence, checkId)
    });
  });
  
  // Add line item matches
  lineItemMatches.forEach(match => {
    duplicates.push({
      duplicateId: match.candidateId,
      invoiceNumber: match.candidateInvoiceNumber,
      supplierName: match.candidateSupplierName,
      totalAmount: 0,
      invoiceDate: new Date(),
      similarityScore: match.confidence,
      matchType: 'LINE_ITEM',
      evidence: [{
        evidenceType: 'LINE_ITEM_MATCH' as DuplicateEvidenceType,
        evidenceSource: 'ANALYSIS' as DuplicateEvidenceSource,
        description: `Line item match with ${match.matchedLineItems.length} matching items`,
        confidence: match.confidence,
        timestamp: new Date()
      }],
      requiresInvestigation: riskLevel === 'HIGH' || riskLevel === 'CRITICAL' || riskLevel === 'SEVERE',
      investigationPriority: determineInvestigationPriority(riskLevel, match.confidence, checkId)
    });
  });
  
  // Sort by similarity score and limit to top 10
  return duplicates
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, 10);
}

/**
 * Determine investigation priority based on risk level and confidence
 */
export function determineInvestigationPriority(
  riskLevel: DuplicateRiskLevel,
  confidence: number,
  checkId: string
): InvestigationPriority {
  if (riskLevel === 'SEVERE' || riskLevel === 'CRITICAL') return 'IMMEDIATE';
  if (riskLevel === 'HIGH' && confidence >= 0.90) return 'URGENT';
  if (riskLevel === 'HIGH') return 'HIGH';
  if (riskLevel === 'MEDIUM' && confidence >= 0.80) return 'MEDIUM';
  return 'LOW';
}

/**
 * Generate mitigation actions based on risk level
 */
export function generateMitigationActions(
  riskLevel: DuplicateRiskLevel,
  duplicateType: DuplicateType,
  checkId: string
): DuplicateMitigationAction[] {
  const actions = new Set<DuplicateMitigationAction>();
  
  // Add risk-level based actions
  const riskActions = MITIGATION_ACTIONS[riskLevel] || [];
  riskActions.forEach(action => actions.add(action));
  
  // Add type-specific actions
  if (duplicateType === 'CROSS_SUPPLIER') {
    actions.add('FRAUD_INVESTIGATION');
    actions.add('REGULATORY_REPORTING');
  }
  
  if (duplicateType === 'PO_REFERENCE') {
    actions.add('PO_VERIFICATION');
    actions.add('CONTRACT_REVIEW');
  }
  
  if (duplicateType === 'EXACT') {
    actions.add('BLOCK_PAYMENT');
  }
  
  return Array.from(actions);
}

/**
 * Identify duplicate patterns from potential duplicates
 */
export function identifyDuplicatePatterns(
  potentialDuplicates: PotentialDuplicate[],
  checkId: string
): DuplicatePattern[] {
  const patterns = new Set<string>();
  
  potentialDuplicates.forEach(dup => {
    if (dup.matchType === 'FUZZY' && dup.similarityScore >= 0.95) {
      patterns.add('EXACT_INVOICE_NUMBER');
    }
    if (dup.matchType === 'TEMPORAL') {
      patterns.add('TEMPORAL_CLUSTER');
    }
    if (dup.matchType === 'SUPPLIER_CLUSTER') {
      patterns.add('SAME_SUPPLIER_SAME_AMOUNT');
    }
    if (dup.matchType === 'LINE_ITEM') {
      patterns.add('PARTIAL_LINE_ITEM_MATCH');
    }
  });
  
  return DUPLICATE_PATTERNS.filter(pattern => patterns.has(pattern.patternType));
}

/**
 * Create exact match result
 */
export function createExactMatchResult(
  exactMatches: any[],
  checkId: string,
  checkStartTime: number,
  auditTrail: any[]
): DuplicateCheckResult {
  return {
    checkId,
    checkTimestamp: new Date(),
    inputHash: '',
    isDuplicate: true,
    duplicateType: 'EXACT',
    confidence: 1.0,
    confidenceBreakdown: {
      fuzzyMatching: 1.0,
      temporalAnalysis: 1.0,
      supplierAnalysis: 1.0,
      lineItemAnalysis: 1.0,
      contextualAdjustment: 0.0
    },
    riskLevel: 'CRITICAL',
    requiresAttention: true,
    potentialDuplicates: exactMatches.map(match => ({
      duplicateId: match.candidateId,
      invoiceNumber: match.candidateInvoiceNumber,
      supplierName: match.candidateSupplierName,
      totalAmount: match.candidateTotalAmount,
      invoiceDate: match.candidateInvoiceDate,
      similarityScore: 1.0,
      matchType: 'EXACT',
      evidence: [{
        evidenceType: 'EXACT_MATCH' as DuplicateEvidenceType,
        evidenceSource: 'DATABASE' as DuplicateEvidenceSource,
        description: 'Exact match found in database',
        confidence: 1.0,
        timestamp: new Date()
      }],
      requiresInvestigation: true,
      investigationPriority: 'IMMEDIATE'
    })),
    mitigationActions: ['BLOCK_PAYMENT', 'IMMEDIATE_ESCALATION', 'FRAUD_INVESTIGATION'],
    duplicatePatterns: [DUPLICATE_PATTERNS[0]], // EXACT_INVOICE_NUMBER
    investigationRequired: true,
    regulatoryReportingRequired: true,
    calculationTimestamp: new Date(),
    checkDurationMs: Date.now() - checkStartTime,
    auditTrail,
    metadata: {
      checkId,
      checkStartTime: new Date(checkStartTime),
      checkEndTime: new Date(),
      checkDurationMs: Date.now() - checkStartTime
    }
  };
}

/**
 * Create failure result for error handling
 */
export function createFailureResult(
  checkId: string,
  input: DuplicateCheckInput,
  errorMessage: string,
  durationMs: number,
  auditTrail: any[]
): DuplicateCheckResult {
  return {
    checkId,
    checkTimestamp: new Date(),
    inputHash: generateInputHash(input),
    isDuplicate: true, // Fail-safe: assume duplicate on error
    duplicateType: 'EXACT',
    confidence: 1.0,
    confidenceBreakdown: {
      fuzzyMatching: 1.0,
      temporalAnalysis: 1.0,
      supplierAnalysis: 1.0,
      lineItemAnalysis: 1.0,
      contextualAdjustment: 0.0
    },
    riskLevel: 'SEVERE',
    requiresAttention: true,
    potentialDuplicates: [{
      duplicateId: 'ERROR_DUPLICATE',
      invoiceNumber: input.invoiceNumber,
      supplierName: input.supplierName,
      totalAmount: input.totalAmount,
      invoiceDate: input.invoiceDate,
      similarityScore: 1.0,
      matchType: 'SYSTEM_ERROR',
      evidence: [{
        evidenceType: 'SYSTEM_ERROR' as DuplicateEvidenceType,
        evidenceSource: 'SYSTEM' as DuplicateEvidenceSource,
        description: `Duplicate detection failed: ${errorMessage}`,
        confidence: 1.0,
        timestamp: new Date()
      }],
      requiresInvestigation: true,
      investigationPriority: 'IMMEDIATE'
    }],
    mitigationActions: ['BLOCK_PAYMENT', 'IMMEDIATE_ESCALATION', 'SYSTEM_ADMIN_NOTIFICATION'],
    duplicatePatterns: [],
    investigationRequired: true,
    regulatoryReportingRequired: true,
    calculationTimestamp: new Date(),
    checkDurationMs: durationMs,
    auditTrail,
    metadata: {
      checkId,
      checkStartTime: new Date(Date.now() - durationMs),
      checkEndTime: new Date(),
      checkDurationMs: durationMs
    }
  };
}

/**
 * Calculate weighted score for duplicate confidence
 */
export function calculateWeightedScore(
  scores: { value: number; weight: number }[]
): number {
  const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
  const weightedSum = scores.reduce((sum, s) => sum + (s.value * s.weight), 0);
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Normalize confidence score to range [0, 1]
 */
export function normalizeConfidence(score: number, min: number = 0, max: number = 1): number {
  return Math.min(max, Math.max(min, score));
}

/**
 * Calculate combined risk score
 */
export function calculateRiskScore(
  confidence: number,
  duplicateType: DuplicateType,
  historicalFraudScore: number = 0
): number {
  const typeWeights: Record<DuplicateType, number> = {
    EXACT: 1.0,
    FUZZY: 0.8,
    TEMPORAL: 0.5,
    SUPPLIER_CLUSTER: 0.7,
    LINE_ITEM: 0.3,
    CROSS_SUPPLIER: 1.0,
    PO_REFERENCE: 0.7,
    PARTIAL: 0.4,
    NONE: 0
  };
  
  const typeWeight = typeWeights[duplicateType] || 0.5;
  const combinedScore = (confidence * typeWeight) + (historicalFraudScore * 0.2);
  
  return Math.min(1.0, combinedScore);
}

/**
 * Evaluate if duplicate requires immediate escalation
 */
export function requiresEscalation(
  riskLevel: DuplicateRiskLevel,
  confidence: number,
  duplicateCount: number
): boolean {
  if (riskLevel === 'SEVERE' || riskLevel === 'CRITICAL') {
    return true;
  }
  
  if (riskLevel === 'HIGH' && confidence >= 0.90) {
    return true;
  }
  
  if (duplicateCount >= 3 && confidence >= 0.80) {
    return true;
  }
  
  return false;
}
