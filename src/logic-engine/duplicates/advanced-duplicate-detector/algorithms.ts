/**
 * CREDITORFLOW EMS - FUZZY MATCHING ALGORITHMS
 * Version: 3.9.2
 *
 * Multi-algorithm fuzzy matching for invoice data comparison
 */

import {
  DuplicateCheckInput,
  DuplicateCheckContext,
  FuzzyMatch,
} from "./types";

import { FUZZY_MATCH_SETTINGS } from "./constants";

import {
  calculateLevenshteinDistance,
  calculateJaroWinklerSimilarity,
  soundexEncode,
  metaphoneEncode,
} from "./phonetic";

/**
 * Detect fuzzy matches using multiple algorithms
 */
export async function detectFuzzyMatches(
  input: DuplicateCheckInput,
  context: DuplicateCheckContext | undefined,
  checkId: string,
): Promise<FuzzyMatch[]> {
  const matches: FuzzyMatch[] = [];

  // Invoice number fuzzy matching
  const invoiceNumberMatches = await fuzzyMatchInvoiceNumber(
    input,
    context,
    checkId,
  );
  matches.push(...invoiceNumberMatches);

  // Supplier name fuzzy matching
  const supplierNameMatches = await fuzzyMatchSupplierName(
    input,
    context,
    checkId,
  );
  matches.push(...supplierNameMatches);

  // Amount matching with tolerance
  const amountMatches = await matchAmount(input, context, checkId);
  matches.push(...amountMatches);

  return matches;
}

/**
 * Fuzzy match invoice numbers using multiple algorithms
 * Supports Levenshtein, Jaro-Winkler, and phonetic matching
 */
export async function fuzzyMatchInvoiceNumber(
  input: DuplicateCheckInput,
  context: DuplicateCheckContext | undefined,
  checkId: string,
): Promise<FuzzyMatch[]> {
  const matches: FuzzyMatch[] = [];
  const invoiceNumber = input.invoiceNumber;

  if (!context?.historicalInvoices) {
    return matches;
  }

  for (const historical of context.historicalInvoices) {
    if (!historical.invoiceNumber) continue;

    // Levenshtein distance calculation
    const levenshteinDistance = calculateLevenshteinDistance(
      invoiceNumber,
      historical.invoiceNumber,
    );
    const maxLength = Math.max(
      invoiceNumber.length,
      historical.invoiceNumber.length,
    );
    const levenshteinSimilarity = 1 - levenshteinDistance / maxLength;

    // Jaro-Winkler similarity calculation
    const jaroWinklerSimilarity = calculateJaroWinklerSimilarity(
      invoiceNumber,
      historical.invoiceNumber,
    );

    // Use the best similarity score
    const bestSimilarity = Math.max(
      levenshteinSimilarity,
      jaroWinklerSimilarity,
    );

    if (bestSimilarity >= FUZZY_MATCH_SETTINGS.JARO_WINKLER_THRESHOLD) {
      matches.push({
        candidateId: historical.invoiceId,
        candidateInvoiceNumber: historical.invoiceNumber,
        candidateSupplierName: historical.supplierName,
        candidateTotalAmount: historical.totalAmount,
        candidateInvoiceDate: historical.invoiceDate,
        matchType: "INVOICE_NUMBER",
        algorithm:
          jaroWinklerSimilarity > levenshteinSimilarity
            ? "JARO_WINKLER"
            : "LEVENSHTEIN",
        confidence: bestSimilarity,
        similarityScore: bestSimilarity,
        matchDetails: {
          levenshteinDistance,
          levenshteinSimilarity,
          jaroWinklerSimilarity,
        },
      });
    }
  }

  return matches;
}

/**
 * Fuzzy match supplier names using phonetic algorithms
 * Supports Soundex and Metaphone encoding
 */
export async function fuzzyMatchSupplierName(
  input: DuplicateCheckInput,
  context: DuplicateCheckContext | undefined,
  checkId: string,
): Promise<FuzzyMatch[]> {
  const matches: FuzzyMatch[] = [];
  const supplierName = input.supplierName.toLowerCase();

  if (!context?.historicalInvoices) {
    return matches;
  }

  // Generate phonetic codes for the input supplier
  const inputSoundex = soundexEncode(supplierName);
  const inputMetaphone = metaphoneEncode(supplierName);

  for (const historical of context.historicalInvoices) {
    if (!historical.supplierName) continue;

    const historicalName = historical.supplierName.toLowerCase();

    // Phonetic matching using Soundex
    const historicalSoundex = soundexEncode(historicalName);
    const soundexMatch = inputSoundex === historicalSoundex;

    // Phonetic matching using Metaphone
    const historicalMetaphone = metaphoneEncode(historicalName);
    const metaphoneMatch = inputMetaphone === historicalMetaphone;

    // Jaro-Winkler similarity for direct string comparison
    const jaroWinklerSimilarity = calculateJaroWinklerSimilarity(
      supplierName,
      historicalName,
    );

    // Calculate combined confidence
    let confidence = jaroWinklerSimilarity;
    let algorithm: FuzzyMatch["algorithm"] = "JARO_WINKLER";

    if (soundexMatch && metaphoneMatch) {
      confidence = Math.max(
        confidence,
        FUZZY_MATCH_SETTINGS.METAPHONE_SIMILARITY_THRESHOLD,
      );
      algorithm = "METAPHONE";
    } else if (soundexMatch) {
      confidence = Math.max(
        confidence,
        FUZZY_MATCH_SETTINGS.SOUNDEX_SIMILARITY_THRESHOLD,
      );
      algorithm = "SOUNDEX";
    }

    if (confidence >= FUZZY_MATCH_SETTINGS.JARO_WINKLER_THRESHOLD) {
      matches.push({
        candidateId: historical.invoiceId,
        candidateInvoiceNumber: historical.invoiceNumber,
        candidateSupplierName: historical.supplierName,
        candidateTotalAmount: historical.totalAmount,
        candidateInvoiceDate: historical.invoiceDate,
        matchType: "SUPPLIER_NAME",
        algorithm,
        confidence,
        similarityScore: confidence,
        matchDetails: {
          soundexMatch,
          soundexCode: inputSoundex,
          metaphoneMatch,
          metaphoneCode: inputMetaphone,
          jaroWinklerSimilarity,
        },
      });
    }
  }

  return matches;
}

/**
 * Match amounts with configurable tolerance
 * Supports both percentage and absolute tolerance
 */
export async function matchAmount(
  input: DuplicateCheckInput,
  context: DuplicateCheckContext | undefined,
  checkId: string,
): Promise<FuzzyMatch[]> {
  const matches: FuzzyMatch[] = [];
  const inputAmount = input.totalAmount;

  if (!context?.historicalInvoices) {
    return matches;
  }

  const absoluteTolerance = FUZZY_MATCH_SETTINGS.AMOUNT_TOLERANCE_ABSOLUTE;
  const percentageTolerance = FUZZY_MATCH_SETTINGS.AMOUNT_TOLERANCE_PERCENTAGE;

  for (const historical of context.historicalInvoices) {
    if (!historical.totalAmount) continue;

    const historicalAmount = historical.totalAmount;
    const amountDifference = Math.abs(inputAmount - historicalAmount);
    const percentageDifference = amountDifference / inputAmount;

    // Match if within absolute tolerance or percentage tolerance
    const isMatch =
      amountDifference <= absoluteTolerance ||
      percentageDifference <= percentageTolerance;

    if (isMatch) {
      // Calculate confidence based on how close the amounts are
      const confidence =
        1 - Math.min(percentageDifference / percentageTolerance, 1);

      matches.push({
        candidateId: historical.invoiceId,
        candidateInvoiceNumber: historical.invoiceNumber,
        candidateSupplierName: historical.supplierName,
        candidateTotalAmount: historical.totalAmount,
        candidateInvoiceDate: historical.invoiceDate,
        matchType: "TOTAL_AMOUNT",
        algorithm: "LEVENSHTEIN",
        confidence,
        similarityScore: confidence,
        matchDetails: {
          amountDifference,
          percentageDifference: percentageDifference * 100,
          absoluteTolerance,
          percentageTolerance: percentageTolerance * 100,
        },
      });
    }
  }

  return matches;
}
