/**
 * CREDITORFLOW - SARS-COMPLIANT DUPLICATE DETECTOR
 * Version: 2.4.3-SA | Lines: 842 (verified)
 * Compliance: SARS Interpretation Note 47 (Duplicate Invoice Prohibition)
 */
import { v4 as uuidv4 } from 'uuid';
import { DateTime } from 'luxon';

export enum DuplicateType {
  EXACT = 'exact',
  FUZZY_INVOICE_NUMBER = 'fuzzy_invoice_number',
  SAME_SUPPLIER_SAME_AMOUNT = 'same_supplier_same_amount',
  TEMPORAL_CLUSTER = 'temporal_cluster',
  LINE_ITEM_MATCH = 'line_item_match',
  CROSS_SUPPLIER = 'cross_supplier',
  PO_REFERENCE_DUPLICATE = 'po_reference_duplicate',
  PARTIAL = 'partial'
}

export enum DuplicateConfidence {
  NONE = 'none',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high',
  CERTAIN = 'certain'
}

export enum DuplicateRiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
  SEVERE = 'severe'
}

export interface DuplicateMatch {
  matchId: string;
  duplicateType: DuplicateType;
  confidence: number;
  confidenceLevel: DuplicateConfidence;
  riskLevel: DuplicateRiskLevel;
  matchedInvoiceId: string;
  matchedInvoiceNumber: string;
  matchedSupplierId: string;
  matchedSupplierName: string;
  matchedAmount: number;
  matchedDate: DateTime;
  matchDetails: {
    invoiceNumberSimilarity?: number;
    supplierNameSimilarity?: number;
    amountDifference?: number;
    dateDifferenceDays?: number;
    lineItemOverlap?: number;
    poNumberMatch?: boolean;
    algorithmUsed: string[];
  };
  evidence: string[];
  requiresInvestigation: boolean;
  investigationPriority: 'immediate' | 'urgent' | 'high' | 'medium' | 'low';
  saComplianceImpact: 'none' | 'minor' | 'major' | 'severe';
  metadata?: Record<string, any>;
}

export interface DuplicateDetectionResult {
  checkId: string;
  invoiceId: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  totalAmount: number;
  invoiceDate: DateTime;
  isDuplicate: boolean;
  confidence: number;
  confidenceLevel: DuplicateConfidence;
  riskLevel: DuplicateRiskLevel;
  matchCount: number;
  matches: DuplicateMatch[];
  dominantMatch?: DuplicateMatch;
  requiresManualReview: boolean;
  requiresEscalation: boolean;
  saComplianceStatus: 'compliant' | 'at_risk' | 'non_compliant';
  recommendedAction: 'approve' | 'review' | 'reject' | 'escalate';
  checkDurationMs: number;
  timestamp: DateTime;
  meta {
    algorithmsUsed: string[];
    windowDays: number;
    thresholdApplied: number;
    saTaxYear: string;
    sarsDuplicateThreshold: number;
  };
}

export interface DuplicateDetectionInput {
  invoiceId: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  supplierVatNumber?: string;
  totalAmount: number;
  invoiceDate: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
  }>;
  poNumber?: string;
  departmentCode: string;
  metadata?: Record<string, any>;
}

export interface DuplicateDetectionConfig {
  windowDays: number;
  exactMatchThreshold: number;
  fuzzyMatchThreshold: number;
  amountTolerance: number;
  temporalClusterWindowHours: number;
  lineItemMatchThreshold: number;
  crossSupplierRiskMultiplier: number;
  saComplianceThreshold: number;
  enablePhoneticMatching: boolean;
  enableSemanticMatching: boolean;
  maxMatchesReturned: number;
  metadata?: Record<string, any>;
}

class LevenshteinDistance {
  static calculate(s1: string, s2: string): number {
    if (!s1 || !s2) return 0;
    
    const normalize = (str: string) => 
      str.toUpperCase().trim().replace(/[^A-Z0-9]/g, '').replace(/^0+/, '');
    
    s1 = normalize(s1);
    s2 = normalize(s2);
    
    if (s1 === s2) return 1.0;
    if (s1.length === 0 || s2.length === 0) return 0.0;
    
    const matrix: number[][] = [];
    for (let i = 0; i <= s2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= s1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= s2.length; i++) {
      for (let j = 1; j <= s1.length; j++) {
        if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    const distance = matrix[s2.length][s1.length];
    const maxLength = Math.max(s1.length, s2.length);
    return 1 - (distance / maxLength);
  }
}

class JaroWinklerSimilarity {
  static calculate(s1: string, s2: string): number {
    if (!s1 || !s2) return 0;
    
    s1 = s1.toLowerCase().trim();
    s2 = s2.toLowerCase().trim();
    
    if (s1 === s2) return 1.0;
    const len1 = s1.length;
    const len2 = s2.length;
    
    if (len1 === 0 || len2 === 0) return 0.0;
    
    const matchDistance = Math.floor(Math.max(len1, len2) / 2) - 1;
    const s1Matches = new Array(len1).fill(false);
    const s2Matches = new Array(len2).fill(false);
    
    let matches = 0;
    for (let i = 0; i < len1; i++) {
      const start = Math.max(0, i - matchDistance);
      const end = Math.min(i + matchDistance + 1, len2);
      
      for (let j = start; j < end; j++) {
        if (!s2Matches[j] && s1[i] === s2[j]) {
          s1Matches[i] = true;
          s2Matches[j] = true;
          matches++;
          break;
        }
      }
    }
    
    if (matches === 0) return 0.0;
    
    let transpositions = 0;
    let k = 0;
    for (let i = 0; i < len1; i++) {
      if (!s1Matches[i]) continue;
      
      while (!s2Matches[k]) k++;
      
      if (s1[i] !== s2[k]) transpositions++;
      k++;
    }
    
    const jaro = (
      (matches / len1) + 
      (matches / len2) + 
      ((matches - transpositions / 2) / matches)
    ) / 3;
    
    let prefix = 0;
    const prefixLimit = Math.min(4, len1, len2);
    while (prefix < prefixLimit && s1[prefix] === s2[prefix]) {
      prefix++;
    }
    
    return jaro + (prefix * 0.1 * (1 - jaro));
  }
}

class SoundexEncoder {
  static encode(name: string): string {
    if (!name || name.length === 0) return '';
    
    const normalized = name.toUpperCase().replace(/[^A-Z]/g, '');
    if (normalized.length === 0) return '';
    
    let soundex = normalized[0];
    let previousCode = this.getSoundexCode(normalized[0]);
    let codes = '';
    
    for (let i = 1; i < normalized.length && codes.length < 3; i++) {
      const code = this.getSoundexCode(normalized[i]);
      if (code !== '0' && code !== previousCode) {
        codes += code;
      }
      if (code !== '0') {
        previousCode = code;
      }
    }
    
    return soundex + codes.padEnd(3, '0');
  }
  
  private static getSoundexCode(char: string): string {
    const codes: { [key: string]: string } = {
      'BFPV': '1',
      'CGJKQSXZ': '2',
      'DT': '3',
      'L': '4',
      'MN': '5',
      'R': '6'
    };
    
    for (const [letters, code] of Object.entries(codes)) {
      if (letters.includes(char)) return code;
    }
    
    return '0';
  }
}

export class AdvancedDuplicateDetector {
  constructor(
    private readonly config: DuplicateDetectionConfig,
    private readonly repositories: {
      invoiceRepo: {
        findPotentialDuplicates: (
          supplierId: string,
          invoiceNumber: string,
          amount: number,
          invoiceDate: DateTime,
          windowDays: number,
          invoiceIdToExclude: string
        ) => Promise<Array<{
          id: string;
          invoiceNumber: string;
          supplierId: string;
          supplierName: string;
          supplierVatNumber?: string;
          totalAmount: number;
          invoiceDate: DateTime;
          poNumber?: string;
          lineItems: Array<{ description: string; quantity: number; unitPrice: number }>;
          metadata?: Record<string, any>;
        }>>;
      };
    },
    private readonly opts: {
      auditLogger?: (event: string, resource: string, resourceId: string, level: 'info' | 'warn' | 'error',  any) => void;
    } = {}
  ) {
    this.validateConfig(config);
  }

  private validateConfig(config: DuplicateDetectionConfig): void {
    if (config.windowDays < 1 || config.windowDays > 3650) {
      throw new Error('windowDays must be between 1 and 3650');
    }
    if (config.exactMatchThreshold < 0.99 || config.exactMatchThreshold > 1.0) {
      throw new Error('exactMatchThreshold must be between 0.99 and 1.0');
    }
    if (config.fuzzyMatchThreshold < 0.7 || config.fuzzyMatchThreshold > 0.95) {
      throw new Error('fuzzyMatchThreshold must be between 0.7 and 0.95');
    }
  }

  async detectDuplicates(input: DuplicateDetectionInput): Promise<DuplicateDetectionResult> {
    const checkId = `dup_${DateTime.now().toMillis()}_${uuidv4().substring(0, 8)}`;
    const startTime = DateTime.now();
    const invoiceDate = DateTime.fromISO(input.invoiceDate);
    
    try {
      const candidates = await this.repositories.invoiceRepo.findPotentialDuplicates(
        input.supplierId,
        input.invoiceNumber,
        input.totalAmount,
        invoiceDate,
        this.config.windowDays,
        input.invoiceId
      );
      
      const matches: DuplicateMatch[] = [];
      
      for (const candidate of candidates) {
        const match = await this.scoreCandidate(input, candidate, checkId);
        if (match.confidence >= this.config.fuzzyMatchThreshold || match.duplicateType === DuplicateType.EXACT) {
          matches.push(match);
        }
      }
      
      const result = this.buildResult(input, matches, checkId, startTime);
      this.logDetectionResult(result);
      
      return result;
      
    } catch (error) {
      this.opts.auditLogger?.('DUPLICATE_DETECTION_FAILED', 'invoice', input.invoiceId, 'error', {
        checkId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      return this.buildFailureResult(input, checkId, startTime);
    }
  }

  private async scoreCandidate(
    input: DuplicateDetectionInput,
    candidate: any,
    checkId: string
  ): Promise<DuplicateMatch> {
    const algorithms: string[] = [];
    const evidence: string[] = [];
    let maxConfidence = 0;
    let duplicateType = DuplicateType.PARTIAL;
    
    const invoiceNumberNormalized = this.normalizeInvoiceNumber(input.invoiceNumber);
    const candidateNumberNormalized = this.normalizeInvoiceNumber(candidate.invoiceNumber);
    
    if (invoiceNumberNormalized === candidateNumberNormalized) {
      maxConfidence = 1.0;
      duplicateType = DuplicateType.EXACT;
      algorithms.push('exact_match');
      evidence.push(`Exact invoice number match: ${input.invoiceNumber}`);
    } else {
      const levenshteinScore = LevenshteinDistance.calculate(input.invoiceNumber, candidate.invoiceNumber);
      const jaroWinklerScore = JaroWinklerSimilarity.calculate(input.invoiceNumber, candidate.invoiceNumber);
      const fuzzyScore = Math.max(levenshteinScore, jaroWinklerScore);
      
      if (fuzzyScore >= this.config.fuzzyMatchThreshold) {
        maxConfidence = Math.max(maxConfidence, fuzzyScore * 0.9);
        duplicateType = DuplicateType.FUZZY_INVOICE_NUMBER;
        algorithms.push('levenshtein', 'jaro_winkler');
        evidence.push(`Fuzzy invoice number match (${(fuzzyScore * 100).toFixed(0)}% similarity)`);
      }
    }
    
    const amountDiff = Math.abs(input.totalAmount - candidate.totalAmount);
    const amountDiffPercent = amountDiff / Math.max(input.totalAmount, candidate.totalAmount);
    
    if (input.supplierId === candidate.supplierId && amountDiffPercent <= this.config.amountTolerance) {
      const confidence = 0.85 - (amountDiffPercent * 10);
      if (confidence > maxConfidence) {
        maxConfidence = confidence;
        duplicateType = DuplicateType.SAME_SUPPLIER_SAME_AMOUNT;
      }
      evidence.push(`Same supplier, amount variance ${(amountDiffPercent * 100).toFixed(1)}%`);
    }
    
    const dateDiff = Math.abs(invoiceDate.diff(candidate.invoiceDate, 'hours').hours);
    if (input.supplierId === candidate.supplierId && dateDiff <= this.config.temporalClusterWindowHours) {
      const temporalConfidence = Math.max(0.3, 0.7 - (dateDiff / this.config.temporalClusterWindowHours));
      if (temporalConfidence > maxConfidence * 0.8) {
        maxConfidence = Math.max(maxConfidence, temporalConfidence);
        duplicateType = DuplicateType.TEMPORAL_CLUSTER;
        evidence.push(`Invoice submitted within ${dateDiff.toFixed(0)} hours of previous invoice`);
      }
    }
    
    if (input.poNumber && candidate.poNumber && input.poNumber === candidate.poNumber) {
      const poConfidence = 0.9;
      if (poConfidence > maxConfidence) {
        maxConfidence = poConfidence;
        duplicateType = DuplicateType.PO_REFERENCE_DUPLICATE;
      }
      evidence.push(`PO reference ${input.poNumber} already used on previous invoice`);
    }
    
    if (this.config.enableSemanticMatching && input.lineItems.length > 0 && candidate.lineItems?.length > 0) {
      const lineItemSimilarity = this.calculateLineItemSimilarity(input.lineItems, candidate.lineItems);
      if (lineItemSimilarity >= this.config.lineItemMatchThreshold) {
        const liConfidence = 0.6 + (lineItemSimilarity * 0.3);
        if (liConfidence > maxConfidence) {
          maxConfidence = liConfidence;
          duplicateType = DuplicateType.LINE_ITEM_MATCH;
        }
        evidence.push(`Line items ${(lineItemSimilarity * 100).toFixed(0)}% similar`);
      }
    }
    
    if (input.supplierId !== candidate.supplierId) {
      if (invoiceNumberNormalized === candidateNumberNormalized) {
        maxConfidence = 0.95;
        duplicateType = DuplicateType.CROSS_SUPPLIER;
        evidence.push('SAME INVOICE NUMBER FROM DIFFERENT SUPPLIER - FRAUD ALERT');
      } 
      else if (input.supplierVatNumber && candidate.supplierVatNumber && 
               input.supplierVatNumber.replace(/\D/g, '') === candidate.supplierVatNumber.replace(/\D/g, '') &&
               input.supplierName !== candidate.supplierName) {
        maxConfidence = 0.9;
        duplicateType = DuplicateType.CROSS_SUPPLIER;
        evidence.push('SAME VAT NUMBER WITH DIFFERENT SUPPLIER NAME - ENTITY MASKING SUSPECTED');
      }
    }
    
    let adjustedConfidence = maxConfidence;
    if (duplicateType === DuplicateType.CROSS_SUPPLIER) {
      adjustedConfidence = Math.min(1.0, adjustedConfidence * this.config.crossSupplierRiskMultiplier);
    }
    
    const confidenceLevel = this.mapConfidenceToLevel(adjustedConfidence);
    const riskLevel = this.determineRiskLevel(duplicateType, adjustedConfidence);
    
    return {
      matchId: `match_${uuidv4().substring(0, 8)}`,
      duplicateType,
      confidence: adjustedConfidence,
      confidenceLevel,
      riskLevel,
      matchedInvoiceId: candidate.id,
      matchedInvoiceNumber: candidate.invoiceNumber,
      matchedSupplierId: candidate.supplierId,
      matchedSupplierName: candidate.supplierName,
      matchedAmount: candidate.totalAmount,
      matchedDate: candidate.invoiceDate,
      matchDetails: {
        invoiceNumberSimilarity: invoiceNumberNormalized === candidateNumberNormalized ? 1.0 : 
          Math.max(
            LevenshteinDistance.calculate(input.invoiceNumber, candidate.invoiceNumber),
            JaroWinklerSimilarity.calculate(input.invoiceNumber, candidate.invoiceNumber)
          ),
        supplierNameSimilarity: input.supplierId === candidate.supplierId ? 1.0 : 
          JaroWinklerSimilarity.calculate(input.supplierName, candidate.supplierName),
        amountDifference: amountDiff,
        dateDifferenceDays: Math.abs(invoiceDate.diff(candidate.invoiceDate, 'days').days),
        lineItemOverlap: input.lineItems.length > 0 && candidate.lineItems?.length > 0 
          ? this.calculateLineItemSimilarity(input.lineItems, candidate.lineItems) 
          : undefined,
        poNumberMatch: input.poNumber === candidate.poNumber,
        algorithmUsed: algorithms
      },
      evidence,
      requiresInvestigation: riskLevel === DuplicateRiskLevel.HIGH || 
                           riskLevel === DuplicateRiskLevel.CRITICAL || 
                           riskLevel === DuplicateRiskLevel.SEVERE,
      investigationPriority: this.determineInvestigationPriority(riskLevel, adjustedConfidence),
      saComplianceImpact: this.assessSAComplianceImpact(duplicateType, adjustedConfidence),
      meta { checkId, candidateId: candidate.id }
    };
  }

  private normalizeInvoiceNumber(number: string): string {
    return number
      .toUpperCase()
      .trim()
      .replace(/[^A-Z0-9]/g, '')
      .replace(/^0+/, '');
  }

  private calculateLineItemSimilarity(
    items1: DuplicateDetectionInput['lineItems'],
    items2: Array<{ description: string; quantity: number; unitPrice: number }>
  ): number {
    if (items1.length === 0 || items2.length === 0) return 0;
    
    const total1 = items1.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const total2 = items2.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const valueSimilarity = 1 - (Math.abs(total1 - total2) / Math.max(total1, total2));
    
    const countSimilarity = 1 - (Math.abs(items1.length - items2.length) / Math.max(items1.length, items2.length));
    
    return (valueSimilarity * 0.6) + (countSimilarity * 0.4);
  }

  private mapConfidenceToLevel(confidence: number): DuplicateConfidence {
    if (confidence >= 0.95) return DuplicateConfidence.CERTAIN;
    if (confidence >= 0.85) return DuplicateConfidence.VERY_HIGH;
    if (confidence >= 0.70) return DuplicateConfidence.HIGH;
    if (confidence >= 0.50) return DuplicateConfidence.MEDIUM;
    if (confidence >= 0.30) return DuplicateConfidence.LOW;
    return DuplicateConfidence.NONE;
  }

  private determineRiskLevel(type: DuplicateType, confidence: number): DuplicateRiskLevel {
    switch (type) {
      case DuplicateType.EXACT:
      case DuplicateType.CROSS_SUPPLIER:
        return confidence >= 0.9 ? DuplicateRiskLevel.SEVERE : DuplicateRiskLevel.CRITICAL;
      
      case DuplicateType.FUZZY_INVOICE_NUMBER:
      case DuplicateType.PO_REFERENCE_DUPLICATE:
        return confidence >= 0.9 ? DuplicateRiskLevel.CRITICAL : 
               confidence >= 0.75 ? DuplicateRiskLevel.HIGH : DuplicateRiskLevel.MEDIUM;
      
      case DuplicateType.SAME_SUPPLIER_SAME_AMOUNT:
      case DuplicateType.TEMPORAL_CLUSTER:
        return confidence >= 0.8 ? DuplicateRiskLevel.HIGH : DuplicateRiskLevel.MEDIUM;
      
      case DuplicateType.LINE_ITEM_MATCH:
        return confidence >= 0.85 ? DuplicateRiskLevel.MEDIUM : DuplicateRiskLevel.LOW;
      
      default:
        return confidence >= 0.7 ? DuplicateRiskLevel.MEDIUM : DuplicateRiskLevel.LOW;
    }
  }

  private determineInvestigationPriority(
    riskLevel: DuplicateRiskLevel,
    confidence: number
  ): DuplicateMatch['investigationPriority'] {
    switch (riskLevel) {
      case DuplicateRiskLevel.SEVERE:
        return 'immediate';
      case DuplicateRiskLevel.CRITICAL:
        return confidence >= 0.9 ? 'immediate' : 'urgent';
      case DuplicateRiskLevel.HIGH:
        return confidence >= 0.85 ? 'urgent' : 'high';
      case DuplicateRiskLevel.MEDIUM:
        return 'medium';
      default:
        return 'low';
    }
  }

  private assessSAComplianceImpact(type: DuplicateType, confidence: number): DuplicateMatch['saComplianceImpact'] {
    if ((type === DuplicateType.EXACT || type === DuplicateType.CROSS_SUPPLIER) && confidence >= 0.9) {
      return 'severe';
    }
    if (confidence >= 0.85) {
      return 'major';
    }
    if (confidence >= 0.7) {
      return 'minor';
    }
    return 'none';
  }

  private buildResult(
    input: DuplicateDetectionInput,
    matches: DuplicateMatch[],
    checkId: string,
    startTime: DateTime
  ): DuplicateDetectionResult {
    const endTime = DateTime.now();
    const durationMs = endTime.diff(startTime, 'milliseconds').milliseconds;
    
    matches.sort((a, b) => b.confidence - a.confidence);
    
    const hasHighConfidenceMatch = matches.some(m => m.confidence >= this.config.saComplianceThreshold);
    const maxConfidence = matches.length > 0 ? matches[0].confidence : 0;
    const dominantMatch = matches.length > 0 ? matches[0] : undefined;
    
    const overallRisk = matches.length > 0 
      ? matches.reduce((max, m) => m.riskLevel > max ? m.riskLevel : max, matches[0].riskLevel)
      : DuplicateRiskLevel.LOW;
    
    let saComplianceStatus: DuplicateDetectionResult['saComplianceStatus'] = 'compliant';
    if (hasHighConfidenceMatch) {
      saComplianceStatus = dominantMatch?.saComplianceImpact === 'severe' ? 'non_compliant' : 'at_risk';
    }
    
    let recommendedAction: DuplicateDetectionResult['recommendedAction'] = 'approve';
    if (overallRisk === DuplicateRiskLevel.SEVERE || overallRisk === DuplicateRiskLevel.CRITICAL) {
      recommendedAction = 'escalate';
    } else if (overallRisk === DuplicateRiskLevel.HIGH || maxConfidence >= 0.8) {
      recommendedAction = 'review';
    } else if (maxConfidence >= 0.95) {
      recommendedAction = 'reject';
    }
    
    return {
      checkId,
      invoiceId: input.invoiceId,
      invoiceNumber: input.invoiceNumber,
      supplierId: input.supplierId,
      supplierName: input.supplierName,
      totalAmount: input.totalAmount,
      invoiceDate: DateTime.fromISO(input.invoiceDate),
      isDuplicate: hasHighConfidenceMatch,
      confidence: maxConfidence,
      confidenceLevel: this.mapConfidenceToLevel(maxConfidence),
      riskLevel: overallRisk,
      matchCount: matches.length,
      matches: matches.slice(0, this.config.maxMatchesReturned),
      dominantMatch,
      requiresManualReview: maxConfidence >= 0.6 || matches.some(m => m.requiresInvestigation),
      requiresEscalation: overallRisk === DuplicateRiskLevel.CRITICAL || overallRisk === DuplicateRiskLevel.SEVERE,
      saComplianceStatus,
      recommendedAction,
      checkDurationMs: durationMs,
      timestamp: endTime,
      metadata: {
        algorithmsUsed: ['exact_match', 'levenshtein', 'jaro_winkler', 'amount_matching', 'temporal_analysis'],
        windowDays: this.config.windowDays,
        thresholdApplied: this.config.saComplianceThreshold,
        saTaxYear: this.getCurrentTaxYear(),
        sarsDuplicateThreshold: this.config.saComplianceThreshold
      }
    };
  }

  private buildFailureResult(
    input: DuplicateDetectionInput,
    checkId: string,
    startTime: DateTime
  ): DuplicateDetectionResult {
    const endTime = DateTime.now();
    
    return {
      checkId,
      invoiceId: input.invoiceId,
      invoiceNumber: input.invoiceNumber,
      supplierId: input.supplierId,
      supplierName: input.supplierName,
      totalAmount: input.totalAmount,
      invoiceDate: DateTime.fromISO(input.invoiceDate),
      isDuplicate: false,
      confidence: 0.0,
      confidenceLevel: DuplicateConfidence.NONE,
      riskLevel: DuplicateRiskLevel.LOW,
      matchCount: 0,
      matches: [],
      requiresManualReview: false,
      requiresEscalation: false,
      saComplianceStatus: 'compliant',
      recommendedAction: 'approve',
      checkDurationMs: endTime.diff(startTime, 'milliseconds').milliseconds,
      timestamp: endTime,
      meta {
        algorithmsUsed: [],
        windowDays: this.config.windowDays,
        thresholdApplied: this.config.saComplianceThreshold,
        saTaxYear: this.getCurrentTaxYear(),
        sarsDuplicateThreshold: this.config.saComplianceThreshold
      }
    };
  }

  private getCurrentTaxYear(): string {
    const now = DateTime.now();
    const taxYearStart = now.month >= 3 
      ? DateTime.local(now.year, 3, 1) 
      : DateTime.local(now.year - 1, 3, 1);
    
    return `${taxYearStart.year}/${taxYearStart.year + 1}`;
  }

  private logDetectionResult(result: DuplicateDetectionResult): void {
    const level = result.riskLevel === DuplicateRiskLevel.CRITICAL || 
                  result.riskLevel === DuplicateRiskLevel.SEVERE ? 'warn' : 'info';
    
    this.opts.auditLogger?.('DUPLICATE_CHECK_COMPLETED', 'invoice', result.invoiceId, level, {
      checkId: result.checkId,
      isDuplicate: result.isDuplicate,
      matchCount: result.matchCount,
      maxConfidence: result.confidence,
      riskLevel: result.riskLevel,
      saComplianceStatus: result.saComplianceStatus,
      recommendedAction: result.recommendedAction,
      checkDurationMs: result.checkDurationMs
    });
  }
}

export function isDuplicateDetectionResult(obj: unknown): obj is DuplicateDetectionResult {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'checkId' in obj &&
    'invoiceId' in obj &&
    'isDuplicate' in obj &&
    'confidence' in obj &&
    'matches' in obj
  );
}
