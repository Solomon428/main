/**
 * CREDITORFLOW EMS - HASH-BASED DUPLICATE DETECTION
 * Version: 3.9.2
 *
 * MD5, SHA, and perceptual hashing for duplicate detection
 */

import { createHash, randomBytes } from "crypto";
import {
  DuplicateCheckInput,
  DuplicateCheckContext,
  ExactMatch,
  DuplicateDetectionException,
} from "./types";

/**
 * Detect exact matches in database using hash comparison
 */
export async function detectExactMatches(
  input: DuplicateCheckInput,
  context: DuplicateCheckContext | undefined,
  checkId: string,
): Promise<ExactMatch[]> {
  const matches: ExactMatch[] = [];

  if (!context?.historicalInvoices) {
    return matches;
  }

  // Generate input hash for comparison
  const inputHash = generateInputHash(input);

  for (const historical of context.historicalInvoices) {
    if (!historical.invoiceNumber) continue;

    // Check for exact invoice number match
    if (
      normalizeInvoiceNumber(historical.invoiceNumber) ===
      normalizeInvoiceNumber(input.invoiceNumber)
    ) {
      // Additional validation: supplier name and amount should also match closely
      if (
        normalizeSupplierName(historical.supplierName) ===
          normalizeSupplierName(input.supplierName) &&
        Math.abs(historical.totalAmount - input.totalAmount) < 0.01
      ) {
        matches.push({
          candidateId: historical.invoiceId,
          candidateInvoiceNumber: historical.invoiceNumber,
          candidateSupplierName: historical.supplierName,
          candidateTotalAmount: historical.totalAmount,
          candidateInvoiceDate: historical.invoiceDate,
          matchTimestamp: new Date(),
        });
      }
    }
  }

  return matches;
}

/**
 * Generate SHA-256 hash for input normalization
 * Creates a deterministic hash of the key invoice fields
 */
export function generateInputHash(input: DuplicateCheckInput): string {
  const hash = createHash("sha256");

  // Normalize and hash key fields
  const normalizedData = {
    invoiceNumber: normalizeInvoiceNumber(input.invoiceNumber),
    supplierName: normalizeSupplierName(input.supplierName),
    totalAmount: Math.round(input.totalAmount * 100) / 100, // Round to 2 decimal places
    invoiceDate: input.invoiceDate
      ? new Date(input.invoiceDate).toISOString().split("T")[0]
      : null,
    supplierVAT: input.supplierVAT
      ? input.supplierVAT.toUpperCase().replace(/[^A-Z0-9]/g, "")
      : null,
    poNumber: input.poNumber ? normalizePONumber(input.poNumber) : null,
    lineItems: input.lineItems
      ? input.lineItems.map((item) => ({
          description: item.description.toLowerCase().trim(),
          quantity: item.quantity,
          unitPrice: Math.round(item.unitPrice * 100) / 100,
        }))
      : null,
  };

  hash.update(
    JSON.stringify(normalizedData, Object.keys(normalizedData).sort()),
  );
  return hash.digest("hex").substring(0, 32);
}

/**
 * Generate MD5 hash for quick comparison
 */
export function generateMD5Hash(input: string): string {
  return createHash("md5").update(input).digest("hex");
}

/**
 * Generate perceptual hash for fuzzy matching
 * Similar inputs will have similar hashes
 */
export function generatePerceptualHash(input: DuplicateCheckInput): string {
  const normalized = [
    normalizeInvoiceNumber(input.invoiceNumber).substring(0, 8),
    normalizeSupplierName(input.supplierName).substring(0, 10),
    Math.round(input.totalAmount).toString().padStart(6, "0"),
    input.invoiceDate
      ? new Date(input.invoiceDate).getFullYear().toString()
      : "0000",
  ].join("");

  return generateMD5Hash(normalized).substring(0, 16);
}

/**
 * Calculate Hamming distance between two perceptual hashes
 * Lower distance = more similar
 */
export function calculateHashSimilarity(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) {
    throw new Error("Hashes must be of equal length");
  }

  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    // Convert hex characters to binary and count differing bits
    const char1 = hash1[i] ?? '0';
    const char2 = hash2[i] ?? '0';
    const bits1 = parseInt(char1, 16).toString(2).padStart(4, "0");
    const bits2 = parseInt(char2, 16).toString(2).padStart(4, "0");

    for (let j = 0; j < 4; j++) {
      if (bits1[j] !== bits2[j]) {
        distance++;
      }
    }
  }

  // Convert distance to similarity (0-1)
  const maxDistance = hash1.length * 4;
  return 1 - distance / maxDistance;
}

/**
 * Generate random string for IDs
 */
export function generateRandomString(length: number): string {
  return Array.from({ length }, () =>
    Math.floor(Math.random() * 36).toString(36),
  ).join("");
}

/**
 * Generate cryptographically secure random ID
 */
export function generateSecureId(length: number = 16): string {
  return randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .substring(0, length);
}

/**
 * Normalize invoice number for comparison
 * Removes common prefixes, suffixes, and standardizes format
 */
function normalizeInvoiceNumber(invoiceNumber: string): string {
  if (!invoiceNumber) return "";

  return invoiceNumber
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "") // Remove all non-alphanumeric characters
    .replace(/^(INV|INVOICE|BILL|REF|NO|NUMBER)/i, "") // Remove common prefixes
    .replace(/(INV|INVOICE|BILL|REF|NO|NUMBER)$/i, "") // Remove common suffixes
    .trim();
}

/**
 * Normalize supplier name for comparison
 * Removes common business entity suffixes and standardizes
 */
function normalizeSupplierName(supplierName: string): string {
  if (!supplierName) return "";

  return supplierName
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "") // Remove special characters
    .replace(/\s+/g, " ") // Normalize whitespace
    .replace(/\b(PTY|LTD|LIMITED|INC|LLC|CORP|CORPORATION|SA|BV|GMBH)\b/gi, "") // Remove entity suffixes
    .trim();
}

/**
 * Normalize PO number for comparison
 */
function normalizePONumber(poNumber: string): string {
  if (!poNumber) return "";

  return poNumber
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "") // Remove special characters
    .replace(/^(PO|PURCHASE|ORDER)/i, "") // Remove common prefixes
    .trim();
}

/**
 * Generate Bloom filter for probabilistic duplicate detection
 * Memory-efficient way to check for possible duplicates
 */
export class DuplicateBloomFilter {
  private bitArray: boolean[];
  private numHashes: number;
  private size: number;

  constructor(expectedItems: number, falsePositiveRate: number = 0.01) {
    // Calculate optimal size and number of hash functions
    this.size = Math.ceil(
      -(expectedItems * Math.log(falsePositiveRate)) / Math.log(2) ** 2,
    );
    this.numHashes = Math.ceil((this.size / expectedItems) * Math.log(2));
    this.bitArray = new Array(this.size).fill(false);
  }

  /**
   * Add an item to the filter
   */
  add(item: string): void {
    for (let i = 0; i < this.numHashes; i++) {
      const index = this.hash(item, i);
      this.bitArray[index] = true;
    }
  }

  /**
   * Check if an item might be in the filter
   * Returns true if possibly present, false if definitely not present
   */
  mightContain(item: string): boolean {
    for (let i = 0; i < this.numHashes; i++) {
      const index = this.hash(item, i);
      if (!this.bitArray[index]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Hash function using multiple indices
   */
  private hash(item: string, seed: number): number {
    const hash = createHash("md5");
    hash.update(`${seed}:${item}`);
    const hex = hash.digest("hex");
    return parseInt(hex.substring(0, 8), 16) % this.size;
  }

  /**
   * Clear the filter
   */
  clear(): void {
    this.bitArray.fill(false);
  }

  /**
   * Get filter statistics
   */
  getStats(): { size: number; numHashes: number; fillRate: number } {
    const filledBits = this.bitArray.filter((b) => b).length;
    return {
      size: this.size,
      numHashes: this.numHashes,
      fillRate: filledBits / this.size,
    };
  }
}

/**
 * SimHash implementation for near-duplicate detection
 * Similar documents will have similar SimHashes
 */
export function generateSimHash(input: string): string {
  // Tokenize input
  const tokens = input.toLowerCase().split(/\s+/);

  // Create feature vector (simplified - in production, use TF-IDF)
  const featureVector = new Map<string, number>();
  tokens.forEach((token) => {
    featureVector.set(token, (featureVector.get(token) || 0) + 1);
  });

  // Create hash vector (64-bit)
  const hashVector = new Array(64).fill(0);

  featureVector.forEach((weight, feature) => {
    if (!feature) return;
    const featureHash = generateMD5Hash(feature);

    for (let i = 0; i < 64; i++) {
      const char = featureHash[i % 32] ?? '0';
      const bit = parseInt(char, 16) & (1 << (i % 4));
      hashVector[i] += bit ? weight : -weight;
    }
  });

  // Convert to binary hash
  return hashVector.map((val) => (val > 0 ? "1" : "0")).join("");
}

/**
 * Calculate SimHash similarity (Hamming distance-based)
 */
export function calculateSimHashSimilarity(
  hash1: string,
  hash2: string,
): number {
  if (hash1.length !== hash2.length) {
    throw new Error("SimHashes must be of equal length");
  }

  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) {
      distance++;
    }
  }

  return 1 - distance / hash1.length;
}
