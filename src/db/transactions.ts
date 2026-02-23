// ============================================================================
// Database Transaction Utilities
// ============================================================================

import { prisma } from "./prisma";

/**
 * Options for transaction execution
 */
export interface TransactionOptions {
  maxWait?: number;
  timeout?: number;
  isolationLevel?:
    | "ReadUncommitted"
    | "ReadCommitted"
    | "RepeatableRead"
    | "Serializable";
}

/**
 * Default transaction options
 */
const DEFAULT_OPTIONS: TransactionOptions = {
  maxWait: 5000,
  timeout: 10000,
};

/**
 * Execute a function within a database transaction
 * @param fn Function to execute within transaction
 * @param options Transaction options
 * @returns Result of the function
 */
export async function runInTransaction<T>(
  fn: (tx: typeof prisma) => Promise<T>,
  options: TransactionOptions = {},
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return prisma.$transaction(async (tx) => {
    return fn(tx as typeof prisma);
  }) as Promise<T>;
}

/**
 * Execute multiple operations in a batch transaction
 * @param operations Array of functions to execute
 * @param options Transaction options
 * @returns Array of results
 */
export async function runBatchTransaction<T>(
  operations: ((tx: typeof prisma) => Promise<T>)[],
  options: TransactionOptions = {},
): Promise<T[]> {
  return runInTransaction(async (tx) => {
    const results: T[] = [];
    for (const operation of operations) {
      results.push(await operation(tx));
    }
    return results;
  }, options);
}

/**
 * Retry a transaction with exponential backoff
 * @param fn Function to execute
 * @param maxRetries Maximum number of retries
 * @param options Transaction options
 * @returns Result of the function
 */
export async function runInTransactionWithRetry<T>(
  fn: (tx: typeof prisma) => Promise<T>,
  maxRetries: number = 3,
  options: TransactionOptions = {},
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await runInTransaction(fn, options);
    } catch (error) {
      lastError = error as Error;

      // Only retry on transaction conflicts
      if (isRetryableError(lastError)) {
        const delay = Math.pow(2, attempt) * 100; // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: Error): boolean {
  const retryableCodes = [
    "P2034", // Transaction conflict
    "P2037", // Write conflict
  ];

  return retryableCodes.some((code) => error.message?.includes(code));
}
