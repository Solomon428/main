/**
 * CREDITORFLOW EMS - ADVANCED DUPLICATE DETECTION CORE
 * Version: 3.9.2
 * 
 * Main orchestration class for comprehensive duplicate detection
 * Multi-algorithm fuzzy matching with ML-based similarity scoring
 */

import {
  DuplicateCheckInput,
  DuplicateCheckContext,
  DuplicateCheckResult,
  DuplicateType,
  DuplicateRiskLevel,
  DuplicateMitigationAction,
  DuplicateAuditTrail,
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
  ExactMatch,
  DuplicateDetectionException,
  HistoricalInvoice
} from './types';

import {
  DUPLICATE_THRESHOLDS,
  DUPLICATE_WEIGHTS,
  DUPLICATE_PATTERNS,
  RISK_LEVELS,
  MITIGATION_ACTIONS
} from './constants';

import {
  detectFuzzyMatches,
  fuzzyMatchInvoiceNumber,
  fuzzyMatchSupplierName,
  matchAmount
} from './algorithms';

import {
  detectExactMatches,
  generateInputHash,
  generateRandomString
} from './hash';

import {
  calculateConfidence,
  determineDuplicateType,
  determineRiskLevel,
  generatePotentialDuplicates,
  determineInvestigationPriority,
  generateMitigationActions,
  identifyDuplicatePatterns,
  createExactMatchResult,
  createFailureResult
} from './scoring';

import {
  analyzeTemporalClusters,
  analyzeSupplierClusters,
  analyzeLineItems,
  performContextualAnalysis
} from './analysis';

import { SA_COMPLIANCE_RULES } from '@/types/index';
import { auditLogger } from '@/lib/utils/audit-logger';

export class AdvancedDuplicateDetector {
  
  /**
   * Perform comprehensive duplicate detection with multi-algorithm analysis
   * @param input - Invoice data to check for duplicates
   * @param context - Optional business context for adaptive detection
   * @returns Comprehensive duplicate check result with confidence scoring
   */
  static async checkForDuplicates(
    input: DuplicateCheckInput,
    context?: DuplicateCheckContext
  ): Promise<DuplicateCheckResult> {
    const checkId = `dup_${Date.now()}_${generateRandomString(12)}`;
    const checkStartTime = Date.now();
    const auditTrail: DuplicateAuditTrail[] = [];
    
    try {
      // Step 1: Validate input data quality
      auditTrail.push(createAuditEntry('DUPLICATE_CHECK_INITIALIZED', checkId, { input, context }));
      validateInput(input, checkId);
      
      // Step 2: Perform exact match detection (fast path)
      auditTrail.push(createAuditEntry('EXACT_MATCH_DETECTION_STARTED', checkId));
      const exactMatches = await detectExactMatches(input, context, checkId);
      auditTrail.push(createAuditEntry('EXACT_MATCH_DETECTION_COMPLETED', checkId, { exactMatchCount: exactMatches.length }));
      
      if (exactMatches.length > 0) {
        // Exact match found - return immediately with critical confidence
        const result = createExactMatchResult(exactMatches, checkId, checkStartTime, auditTrail);
        logDuplicateDetection(result, checkStartTime, Date.now());
        return result;
      }
      
      // Step 3: Perform fuzzy matching analysis
      auditTrail.push(createAuditEntry('FUZZY_MATCHING_STARTED', checkId));
      const fuzzyMatches = await detectFuzzyMatches(input, context, checkId);
      auditTrail.push(createAuditEntry('FUZZY_MATCHING_COMPLETED', checkId, { fuzzyMatchCount: fuzzyMatches.length }));
      
      // Step 4: Perform temporal cluster analysis
      auditTrail.push(createAuditEntry('TEMPORAL_CLUSTER_ANALYSIS_STARTED', checkId));
      const temporalClusters = await analyzeTemporalClusters(input, context, checkId);
      auditTrail.push(createAuditEntry('TEMPORAL_CLUSTER_ANALYSIS_COMPLETED', checkId, { clusterCount: temporalClusters.length }));
      
      // Step 5: Perform supplier cluster analysis
      auditTrail.push(createAuditEntry('SUPPLIER_CLUSTER_ANALYSIS_STARTED', checkId));
      const supplierClusters = await analyzeSupplierClusters(input, context, checkId);
      auditTrail.push(createAuditEntry('SUPPLIER_CLUSTER_ANALYSIS_COMPLETED', checkId, { clusterCount: supplierClusters.length }));
      
      // Step 6: Perform line item analysis
      auditTrail.push(createAuditEntry('LINE_ITEM_ANALYSIS_STARTED', checkId));
      const lineItemMatches = await analyzeLineItems(input, context, checkId);
      auditTrail.push(createAuditEntry('LINE_ITEM_ANALYSIS_COMPLETED', checkId, { lineItemMatchCount: lineItemMatches.length }));
      
      // Step 7: Perform contextual analysis for false positive reduction
      auditTrail.push(createAuditEntry('CONTEXTUAL_ANALYSIS_STARTED', checkId));
      const contextualAnalysis = await performContextualAnalysis(
        input,
        fuzzyMatches,
        temporalClusters,
        supplierClusters,
        lineItemMatches,
        context,
        checkId
      );
      auditTrail.push(createAuditEntry('CONTEXTUAL_ANALYSIS_COMPLETED', checkId, { contextualAnalysis }));
      
      // Step 8: Calculate overall confidence and determine duplicate status
      auditTrail.push(createAuditEntry('CONFIDENCE_CALCULATION_STARTED', checkId));
      const confidenceResult = calculateConfidence(
        fuzzyMatches,
        temporalClusters,
        supplierClusters,
        lineItemMatches,
        contextualAnalysis
      );
      auditTrail.push(createAuditEntry('CONFIDENCE_CALCULATION_COMPLETED', checkId, { confidenceResult }));
      
      // Step 9: Determine duplicate type and risk level
      auditTrail.push(createAuditEntry('DUPLICATE_TYPE_DETERMINATION_STARTED', checkId));
      const duplicateType = determineDuplicateType(confidenceResult, fuzzyMatches, temporalClusters, supplierClusters, checkId);
      const riskLevel = determineRiskLevel(duplicateType, confidenceResult.overallConfidence, checkId);
      auditTrail.push(createAuditEntry('DUPLICATE_TYPE_DETERMINATION_COMPLETED', checkId, { duplicateType, riskLevel }));
      
      // Step 10: Generate potential duplicates list with evidence
      auditTrail.push(createAuditEntry('POTENTIAL_DUPLICATES_GENERATION_STARTED', checkId));
      const potentialDuplicates = generatePotentialDuplicates(
        fuzzyMatches,
        temporalClusters,
        supplierClusters,
        lineItemMatches,
        confidenceResult,
        duplicateType,
        riskLevel,
        checkId
      );
      auditTrail.push(createAuditEntry('POTENTIAL_DUPLICATES_GENERATION_COMPLETED', checkId, { potentialDuplicateCount: potentialDuplicates.length }));
      
      // Step 11: Generate mitigation actions based on risk level
      auditTrail.push(createAuditEntry('MITIGATION_ACTION_GENERATION_STARTED', checkId));
      const mitigationActions = generateMitigationActions(riskLevel, duplicateType, checkId);
      auditTrail.push(createAuditEntry('MITIGATION_ACTION_GENERATION_COMPLETED', checkId, { mitigationActions }));
      
      // Step 12: Create comprehensive duplicate check result
      const result: DuplicateCheckResult = {
        checkId,
        checkTimestamp: new Date(),
        inputHash: generateInputHash(input),
        isDuplicate: confidenceResult.overallConfidence >= SA_COMPLIANCE_RULES.DUPLICATE_DETECTION_THRESHOLD,
        duplicateType: confidenceResult.overallConfidence >= SA_COMPLIANCE_RULES.DUPLICATE_DETECTION_THRESHOLD ? duplicateType : 'NONE',
        confidence: confidenceResult.overallConfidence,
        confidenceBreakdown: confidenceResult.breakdown,
        riskLevel: confidenceResult.overallConfidence >= SA_COMPLIANCE_RULES.DUPLICATE_DETECTION_THRESHOLD ? riskLevel : 'LOW',
        requiresAttention: confidenceResult.overallConfidence >= DUPLICATE_THRESHOLDS.LOW_CONFIDENCE,
        potentialDuplicates,
        mitigationActions,
        duplicatePatterns: identifyDuplicatePatterns(potentialDuplicates, checkId),
        investigationRequired: riskLevel === 'HIGH' || riskLevel === 'CRITICAL' || riskLevel === 'SEVERE',
        regulatoryReportingRequired: (riskLevel === 'CRITICAL' || riskLevel === 'SEVERE') && SA_COMPLIANCE_RULES.SARS_DUPLICATE_REPORTING_REQUIRED,
        calculationTimestamp: new Date(),
        checkDurationMs: Date.now() - checkStartTime,
        auditTrail,
        metadata: {
          checkId,
          checkStartTime: new Date(checkStartTime),
          checkEndTime: new Date(),
          checkDurationMs: Date.now() - checkStartTime,
          saComplianceRules: SA_COMPLIANCE_RULES,
          duplicatePatterns: DUPLICATE_PATTERNS,
          riskLevels: RISK_LEVELS,
          mitigationActions: MITIGATION_ACTIONS
        }
      };
      
      // Step 13: Log successful duplicate detection
      logDuplicateDetection(result, checkStartTime, Date.now());
      
      return result;
      
    } catch (error) {
      // Log duplicate detection failure
      logDuplicateDetectionFailure(
        checkId,
        input,
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error.stack : undefined,
        checkStartTime,
        Date.now()
      );
      
      // Return failure result with maximum confidence (fail-safe)
      return createFailureResult(
        checkId,
        input,
        error instanceof Error ? error.message : 'Unknown duplicate detection error',
        Date.now() - checkStartTime,
        auditTrail
      );
    }
  }
}

/**
 * Validate input data quality and completeness
 */
function validateInput(input: DuplicateCheckInput, checkId: string): void {
  if (!input.invoiceNumber || input.invoiceNumber.trim().length === 0) {
    throw new DuplicateDetectionException('MISSING_INVOICE_NUMBER', 'Invoice number is required for duplicate detection', checkId);
  }
  
  if (!input.supplierName || input.supplierName.trim().length === 0) {
    throw new DuplicateDetectionException('MISSING_SUPPLIER_NAME', 'Supplier name is required for duplicate detection', checkId);
  }
  
  if (!input.totalAmount || input.totalAmount <= 0) {
    throw new DuplicateDetectionException('INVALID_TOTAL_AMOUNT', 'Total amount must be greater than zero', checkId);
  }
  
  if (!input.invoiceDate) {
    throw new DuplicateDetectionException('MISSING_INVOICE_DATE', 'Invoice date is required for duplicate detection', checkId);
  }
  
  // Validate required fields per SARS compliance
  for (const field of SA_COMPLIANCE_RULES.REQUIRED_DUPLICATE_FIELDS) {
    if (!(field in input) || (input as any)[field] === null || (input as any)[field] === undefined) {
      throw new DuplicateDetectionException(
        'MISSING_REQUIRED_FIELD',
        `Required field '${field}' is missing for SARS duplicate detection compliance`,
        checkId
      );
    }
  }
}

/**
 * Create audit trail entry
 */
function createAuditEntry(
  eventType: string,
  checkId: string,
  metadata?: Record<string, any>
): DuplicateAuditTrail {
  return {
    auditId: `dup_audit_${Date.now()}_${generateRandomString(8)}`,
    checkId,
    timestamp: new Date(),
    eventType,
    eventDescription: eventType.replace(/_/g, ' ').toLowerCase(),
    userId: 'system',
    ipAddress: '127.0.0.1',
    userAgent: 'CreditorFlow Duplicate Detector/3.9.2',
    metadata: metadata || {}
  };
}

/**
 * Log successful duplicate detection
 */
function logDuplicateDetection(
  result: DuplicateCheckResult,
  startTime: number,
  endTime: number
): void {
  auditLogger.log(
    'DUPLICATE_DETECTION_COMPLETED',
    'invoice',
    result.checkId,
    'INFO',
    {
      checkId: result.checkId,
      isDuplicate: result.isDuplicate,
      duplicateType: result.duplicateType,
      confidence: result.confidence,
      riskLevel: result.riskLevel,
      potentialDuplicateCount: result.potentialDuplicates.length,
      checkDurationMs: endTime - startTime
    }
  );
}

/**
 * Log duplicate detection failure
 */
function logDuplicateDetectionFailure(
  checkId: string,
  input: DuplicateCheckInput,
  errorMessage: string,
  errorStack: string | undefined,
  startTime: number,
  endTime: number
): void {
  auditLogger.log(
    'DUPLICATE_DETECTION_FAILED',
    'invoice',
    checkId,
    'ERROR',
    {
      checkId,
      invoiceNumber: input.invoiceNumber,
      supplierName: input.supplierName,
      errorMessage,
      errorStack,
      checkDurationMs: endTime - startTime
    }
  );
}

export default AdvancedDuplicateDetector;
