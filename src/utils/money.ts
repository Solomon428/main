// ============================================================================
// Money and Currency Utilities
// ============================================================================

import { Currency } from "../domain/enums/Currency";

// Simple decimal utility to replace Prisma Decimal
class SimpleDecimal {
  private value: number;

  constructor(value: number | string) {
    this.value = typeof value === "string" ? parseFloat(value) : value;
  }

  toNumber(): number {
    return this.value;
  }

  plus(other: number): SimpleDecimal {
    return new SimpleDecimal(this.value + other);
  }
}

// Note: Exchange rates should come from an external API in production

// Exchange rates (would typically come from an API)
// Using Partial to handle currencies that may not have all exchange rates defined
const EXCHANGE_RATES: Partial<
  Record<Currency, Partial<Record<Currency, number>>>
> = {
  [Currency.ZAR]: {
    [Currency.ZAR]: 1,
    [Currency.USD]: 0.053,
    [Currency.EUR]: 0.049,
    [Currency.GBP]: 0.042,
    [Currency.AUD]: 0.081,
    [Currency.CAD]: 0.072,
    [Currency.JPY]: 7.89,
    [Currency.CNY]: 0.38,
    [Currency.INR]: 4.41,
  },
  [Currency.USD]: {
    [Currency.ZAR]: 18.87,
    [Currency.USD]: 1,
    [Currency.EUR]: 0.92,
    [Currency.GBP]: 0.79,
    [Currency.AUD]: 1.53,
    [Currency.CAD]: 1.36,
    [Currency.JPY]: 148.5,
    [Currency.CNY]: 7.19,
    [Currency.INR]: 83.12,
  },
  [Currency.EUR]: {
    [Currency.ZAR]: 20.41,
    [Currency.USD]: 1.08,
    [Currency.EUR]: 1,
    [Currency.GBP]: 0.86,
    [Currency.AUD]: 1.66,
    [Currency.CAD]: 1.47,
    [Currency.JPY]: 161.2,
    [Currency.CNY]: 7.81,
    [Currency.INR]: 90.35,
  },
  [Currency.GBP]: {
    [Currency.ZAR]: 23.73,
    [Currency.USD]: 1.26,
    [Currency.EUR]: 1.16,
    [Currency.GBP]: 1,
    [Currency.AUD]: 1.93,
    [Currency.CAD]: 1.71,
    [Currency.JPY]: 187.5,
    [Currency.CNY]: 9.08,
    [Currency.INR]: 105.1,
  },
  [Currency.AUD]: {
    [Currency.ZAR]: 12.29,
    [Currency.USD]: 0.65,
    [Currency.EUR]: 0.6,
    [Currency.GBP]: 0.52,
    [Currency.AUD]: 1,
    [Currency.CAD]: 0.89,
    [Currency.JPY]: 97.2,
    [Currency.CNY]: 4.71,
    [Currency.INR]: 54.5,
  },
  [Currency.CAD]: {
    [Currency.ZAR]: 13.84,
    [Currency.USD]: 0.74,
    [Currency.EUR]: 0.68,
    [Currency.GBP]: 0.58,
    [Currency.AUD]: 1.13,
    [Currency.CAD]: 1,
    [Currency.JPY]: 109.5,
    [Currency.CNY]: 5.3,
    [Currency.INR]: 61.4,
  },
  [Currency.JPY]: {
    [Currency.ZAR]: 0.127,
    [Currency.USD]: 0.0067,
    [Currency.EUR]: 0.0062,
    [Currency.GBP]: 0.0053,
    [Currency.AUD]: 0.01,
    [Currency.CAD]: 0.0091,
    [Currency.JPY]: 1,
    [Currency.CNY]: 0.048,
    [Currency.INR]: 0.56,
  },
  [Currency.CNY]: {
    [Currency.ZAR]: 2.62,
    [Currency.USD]: 0.14,
    [Currency.EUR]: 0.13,
    [Currency.GBP]: 0.11,
    [Currency.AUD]: 0.21,
    [Currency.CAD]: 0.19,
    [Currency.JPY]: 20.7,
    [Currency.CNY]: 1,
    [Currency.INR]: 11.6,
  },
  [Currency.INR]: {
    [Currency.ZAR]: 0.227,
    [Currency.USD]: 0.012,
    [Currency.EUR]: 0.011,
    [Currency.GBP]: 0.0095,
    [Currency.AUD]: 0.018,
    [Currency.CAD]: 0.016,
    [Currency.JPY]: 1.79,
    [Currency.CNY]: 0.086,
    [Currency.INR]: 1,
  },
};

/**
 * Format currency for display
 */
export function formatCurrency(
  amount: number,
  currency: Currency = Currency.ZAR,
  locale: string = "en-ZA",
): string {
  const numAmount = Number(amount);

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numAmount);
}

/**
 * Convert currency
 */
export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency,
): number {
  if (from === to) {
    return amount;
  }

  const rate = EXCHANGE_RATES[from]?.[to] || 1;
  const numAmount = Number(amount);

  return numAmount * rate;
}

/**
 * Calculate VAT
 */
export function calculateVAT(amount: number, rate: number = 15): number {
  const numAmount = Number(amount);
  return numAmount * (rate / 100);
}

/**
 * Calculate amount including VAT
 */
export function addVAT(amount: number, rate: number = 15): number {
  const numAmount = Number(amount);
  return numAmount * (1 + rate / 100);
}

/**
 * Calculate amount excluding VAT
 */
export function removeVAT(amount: number, rate: number = 15): number {
  const numAmount = Number(amount);
  return numAmount / (1 + rate / 100);
}

/**
 * Round money to 2 decimal places
 */
export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Format number as percentage
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  const numValue = Number(value);
  return `${numValue.toFixed(decimals)}%`;
}

/**
 * Calculate discount amount
 */
export function calculateDiscount(
  amount: number,
  discountPercent: number,
): number {
  const numAmount = Number(amount);
  return numAmount * (discountPercent / 100);
}

/**
 * Parse currency string to number
 */
export function parseCurrency(value: string): number {
  // Remove currency symbols and commas
  const cleanValue = value
    .replace(/[R$€£¥,\s]/g, "")
    .replace(/\((.*)\)/, "-$1"); // Handle negative numbers in parentheses

  return parseFloat(cleanValue) || 0;
}

/**
 * Sum an array of amounts
 */
export function sumAmounts(amounts: number[]): number {
  return amounts.reduce((sum, amount) => sum + amount, 0);
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: Currency): string {
  const symbols: Record<Currency, string> = {
    [Currency.ZAR]: "R",
    [Currency.USD]: "$",
    [Currency.EUR]: "€",
    [Currency.GBP]: "£",
    [Currency.AUD]: "A$",
    [Currency.CAD]: "C$",
    [Currency.JPY]: "¥",
    [Currency.CNY]: "¥",
    [Currency.INR]: "₹",
  };

  return symbols[currency] || currency;
}
