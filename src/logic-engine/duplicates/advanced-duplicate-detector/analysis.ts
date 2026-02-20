/**
 * CREDITORFLOW EMS - DUPLICATE ANALYSIS MODULES
 * Version: 3.9.2
 *
 * Temporal, supplier, line item, and contextual analysis functions
 */

import {
  DuplicateCheckInput,
  DuplicateCheckContext,
  TemporalCluster,
  SupplierCluster,
  LineItemMatch,
  MatchedLineItem,
  ContextualAnalysisResult,
  ContextualFactor,
  HistoricalInvoice,
  LineItem,
} from "./types";

import { generateRandomString } from "./hash";
import { calculateJaroWinklerSimilarity } from "./phonetic";

/**
 * Analyze temporal clusters for duplicate patterns
 * Detects multiple invoices from the same supplier within a short timeframe
 */
export async function analyzeTemporalClusters(
  input: DuplicateCheckInput,
  context: DuplicateCheckContext | undefined,
  checkId: string,
): Promise<TemporalCluster[]> {
  const clusters: TemporalCluster[] = [];

  if (!context?.historicalInvoices) {
    return clusters;
  }

  const inputDate = new Date(input.invoiceDate);
  const timeWindowDays = context?.temporalWindowDays || 30;

  // Group invoices by supplier
  const supplierInvoices = new Map<string, HistoricalInvoice[]>();

  for (const historical of context.historicalInvoices) {
    if (historical.supplierName === input.supplierName) {
      const daysDifference = Math.abs(
        (inputDate.getTime() - new Date(historical.invoiceDate).getTime()) /
          (1000 * 60 * 60 * 24),
      );

      if (daysDifference <= timeWindowDays) {
        if (!supplierInvoices.has(historical.supplierName)) {
          supplierInvoices.set(historical.supplierName, []);
        }
        supplierInvoices.get(historical.supplierName)!.push(historical);
      }
    }
  }

  // Create clusters for suppliers with multiple invoices
  supplierInvoices.forEach((invoices, supplierName) => {
    if (invoices.length >= 2) {
      const totalAmount = invoices.reduce(
        (sum, inv) => sum + inv.totalAmount,
        0,
      );
      const averageAmount = totalAmount / invoices.length;

      // Calculate centroid date
      const timestamps = invoices.map((inv) =>
        new Date(inv.invoiceDate).getTime(),
      );
      const centroidTimestamp =
        timestamps.reduce((sum, ts) => sum + ts, 0) / timestamps.length;

      clusters.push({
        clusterId: `temporal_${generateRandomString(8)}`,
        supplierName,
        invoiceCount: invoices.length,
        timeWindowDays,
        centroidDate: new Date(centroidTimestamp),
        representativeInvoiceNumber: invoices[0].invoiceNumber,
        averageAmount,
        confidence: Math.min(0.9, 0.5 + invoices.length * 0.1),
        invoices: invoices.map((inv) => ({
          invoiceId: inv.invoiceId,
          invoiceNumber: inv.invoiceNumber,
          invoiceDate: inv.invoiceDate,
          totalAmount: inv.totalAmount,
        })),
      });
    }
  });

  return clusters;
}

/**
 * Analyze supplier clusters for entity resolution
 * Identifies potential duplicate suppliers based on similar names and VAT numbers
 */
export async function analyzeSupplierClusters(
  input: DuplicateCheckInput,
  context: DuplicateCheckContext | undefined,
  checkId: string,
): Promise<SupplierCluster[]> {
  const clusters: SupplierCluster[] = [];

  if (!context?.historicalInvoices) {
    return clusters;
  }

  // Group suppliers by VAT number (exact match)
  const vatGroups = new Map<string, Set<string>>();
  const supplierData = new Map<
    string,
    { invoices: HistoricalInvoice[]; vat?: string }
  >();

  // Add current invoice supplier
  supplierData.set(input.supplierName, {
    invoices: [],
    vat: input.supplierVAT,
  });

  for (const historical of context.historicalInvoices) {
    if (!supplierData.has(historical.supplierName)) {
      supplierData.set(historical.supplierName, {
        invoices: [],
        vat: historical.supplierVAT,
      });
    }
    supplierData.get(historical.supplierName)!.invoices.push(historical);

    if (historical.supplierVAT) {
      if (!vatGroups.has(historical.supplierVAT)) {
        vatGroups.set(historical.supplierVAT, new Set());
      }
      vatGroups.get(historical.supplierVAT)!.add(historical.supplierName);
    }
  }

  // Create clusters for suppliers sharing VAT numbers
  vatGroups.forEach((supplierNames, vat) => {
    if (supplierNames.size >= 2) {
      const names = Array.from(supplierNames);
      const invoiceCount = names.reduce(
        (sum, name) => sum + (supplierData.get(name)?.invoices.length || 0),
        0,
      );

      clusters.push({
        clusterId: `supplier_${generateRandomString(8)}`,
        supplierNames: names,
        supplierVATs: [vat],
        invoiceCount,
        confidence: 0.85,
        clusterCentroid: {},
        suppliers: names.map((name) => ({
          supplierId: `sup_${generateRandomString(6)}`,
          supplierName: name,
          supplierVAT: vat,
          invoiceCount: supplierData.get(name)?.invoices.length || 0,
        })),
      });
    }
  });

  return clusters;
}

/**
 * Analyze line items for partial duplicates
 * Detects invoices with similar line items that may indicate partial duplication
 */
export async function analyzeLineItems(
  input: DuplicateCheckInput,
  context: DuplicateCheckContext | undefined,
  checkId: string,
): Promise<LineItemMatch[]> {
  const matches: LineItemMatch[] = [];

  if (!input.lineItems || input.lineItems.length === 0) {
    return matches;
  }

  if (!context?.historicalInvoices) {
    return matches;
  }

  for (const historical of context.historicalInvoices) {
    if (!historical.lineItems || historical.lineItems.length === 0) {
      continue;
    }

    const matchedItems: MatchedLineItem[] = [];

    for (const inputItem of input.lineItems) {
      for (const historicalItem of historical.lineItems) {
        const descriptionMatch = calculateDescriptionSimilarity(
          inputItem.description,
          historicalItem.description,
        );

        const quantityMatch =
          Math.abs(inputItem.quantity - historicalItem.quantity) < 0.01;
        const priceMatch =
          Math.abs(inputItem.unitPrice - historicalItem.unitPrice) /
            inputItem.unitPrice <
          0.05;

        if (descriptionMatch > 0.8 && (quantityMatch || priceMatch)) {
          matchedItems.push({
            lineNumber: historicalItem.lineNumber,
            description: historicalItem.description,
            quantity: historicalItem.quantity,
            unitPrice: historicalItem.unitPrice,
            matchConfidence: descriptionMatch,
            matchType: descriptionMatch > 0.95 ? "EXACT" : "FUZZY",
          });
        }
      }
    }

    if (matchedItems.length > 0) {
      const confidence =
        matchedItems.reduce((sum, item) => sum + item.matchConfidence, 0) /
        matchedItems.length;

      matches.push({
        candidateId: historical.invoiceId,
        candidateInvoiceNumber: historical.invoiceNumber,
        candidateSupplierName: historical.supplierName,
        matchedLineItems: matchedItems,
        confidence,
        matchType: confidence > 0.9 ? "EXACT" : "FUZZY",
      });
    }
  }

  return matches;
}

/**
 * Calculate similarity between two descriptions
 * Uses word overlap and order analysis
 */
function calculateDescriptionSimilarity(desc1: string, desc2: string): number {
  const words1 = desc1
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);
  const words2 = desc2
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);

  if (words1.length === 0 && words2.length === 0) return 1.0;
  if (words1.length === 0 || words2.length === 0) return 0.0;

  // Calculate Jaccard similarity
  const set1 = new Set(words1);
  const set2 = new Set(words2);

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  const jaccardSimilarity = intersection.size / union.size;

  // Calculate word order similarity
  let orderMatches = 0;
  const minLength = Math.min(words1.length, words2.length);
  for (let i = 0; i < minLength; i++) {
    if (words1[i] === words2[i]) {
      orderMatches++;
    }
  }
  const orderSimilarity = orderMatches / Math.max(words1.length, words2.length);

  // Combine similarities
  return jaccardSimilarity * 0.7 + orderSimilarity * 0.3;
}

/**
 * Perform contextual analysis for false positive reduction
 * Analyzes business context to reduce false positives
 */
export async function performContextualAnalysis(
  input: DuplicateCheckInput,
  fuzzyMatches: any[],
  temporalClusters: TemporalCluster[],
  supplierClusters: SupplierCluster[],
  lineItemMatches: LineItemMatch[],
  context: DuplicateCheckContext | undefined,
  checkId: string,
): Promise<ContextualAnalysisResult> {
  const factors: ContextualFactor[] = [];
  let falsePositiveProbability = 0.0;
  let confidenceAdjustment = 0.0;

  // Factor 1: Supplier relationship history
  if (context?.userRiskProfile === "TRUSTED_SUPPLIER") {
    factors.push({
      factorType: "SUPPLIER_HISTORY",
      factorDescription:
        "Supplier has established relationship with no previous duplicates",
      factorImpact: "NEGATIVE",
      confidence: 0.7,
      evidence: "Historical analysis shows clean record",
    });
    falsePositiveProbability += 0.1;
    confidenceAdjustment -= 0.05;
  }

  // Factor 2: Recurring invoice patterns (subscriptions, retainers)
  if (temporalClusters.length > 0 && temporalClusters[0].invoiceCount >= 3) {
    factors.push({
      factorType: "RECURRING_PATTERN",
      factorDescription:
        "Regular recurring invoice pattern detected (likely subscription/retainer)",
      factorImpact: "NEGATIVE",
      confidence: 0.8,
      evidence: `Consistent ${temporalClusters[0].timeWindowDays}-day intervals`,
    });
    falsePositiveProbability += 0.2;
    confidenceAdjustment -= 0.1;
  }

  // Factor 3: Amount variance analysis
  const amountVariances = fuzzyMatches
    .filter((m: any) => m.matchType === "TOTAL_AMOUNT")
    .map((m: any) => m.confidence);

  if (amountVariances.length > 0 && Math.min(...amountVariances) < 0.5) {
    factors.push({
      factorType: "AMOUNT_VARIANCE",
      factorDescription: "Significant amount differences detected",
      factorImpact: "NEGATIVE",
      confidence: 0.6,
      evidence: "Amounts differ by more than 5%",
    });
    falsePositiveProbability += 0.15;
    confidenceAdjustment -= 0.08;
  }

  // Factor 4: Different PO numbers
  if (
    input.poNumber &&
    fuzzyMatches.some(
      (m: any) =>
        m.matchDetails?.poNumber && m.matchDetails.poNumber !== input.poNumber,
    )
  ) {
    factors.push({
      factorType: "DIFFERENT_PO",
      factorDescription: "Invoices have different Purchase Order numbers",
      factorImpact: "NEGATIVE",
      confidence: 0.75,
      evidence: "PO numbers do not match",
    });
    falsePositiveProbability += 0.1;
    confidenceAdjustment -= 0.05;
  }

  // Factor 5: High-risk supplier category
  if (context?.supplierCategory === "HIGH_RISK") {
    factors.push({
      factorType: "SUPPLIER_RISK",
      factorDescription: "Supplier category flagged as high-risk",
      factorImpact: "POSITIVE",
      confidence: 0.8,
      evidence: "Category-based risk assessment",
    });
    falsePositiveProbability -= 0.1;
    confidenceAdjustment += 0.05;
  }

  // Determine recommendation
  let recommendation: ContextualAnalysisResult["recommendation"] =
    "PROCEED_WITH_CAUTION";

  if (falsePositiveProbability > 0.5) {
    recommendation = "PROCEED";
  } else if (falsePositiveProbability < 0.2 && fuzzyMatches.length > 2) {
    recommendation = "MANUAL_REVIEW_REQUIRED";
  } else if (falsePositiveProbability < 0.1 && confidenceAdjustment > 0.1) {
    recommendation = "BLOCK";
  }

  return {
    falsePositiveProbability: Math.min(
      1.0,
      Math.max(0.0, falsePositiveProbability),
    ),
    contextualFactors: factors,
    confidenceAdjustment,
    recommendation,
  };
}
