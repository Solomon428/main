/**
 * CREDITORFLOW EMS - VAT VALIDATOR FORMATTING
 * Version: 3.8.4
 *
 * VAT number formatting and normalization utilities
 */

import { VAT_NUMBER_PATTERN } from "./constants";

/**
 * Normalize a VAT number by removing spaces and converting to uppercase
 * @param vatNumber - Raw VAT number input
 * @returns Normalized VAT number
 */
export function normalizeVATNumber(
  vatNumber: string | undefined,
): string | undefined {
  if (!vatNumber) return undefined;

  return vatNumber.replace(/\s/g, "").replace(/-/g, "").toUpperCase();
}

/**
 * Format a South African VAT number with proper spacing
 * @param vatNumber - VAT number to format
 * @returns Formatted VAT number (e.g., "4 123 456 789")
 */
export function formatSAVATNumber(vatNumber: string): string {
  const normalized = normalizeVATNumber(vatNumber);
  if (!normalized) return vatNumber;

  // SA format: 4XX XXX XXXX (4 123 456 789)
  if (normalized.match(/^4\d{9}$/)) {
    return `${normalized[0]} ${normalized.substring(1, 4)} ${normalized.substring(4, 7)} ${normalized.substring(7, 10)}`;
  }

  return normalized;
}

/**
 * Format a VAT number for display with country prefix
 * @param vatNumber - VAT number
 * @param countryCode - ISO country code
 * @returns Formatted VAT number with country prefix
 */
export function formatVATNumberWithPrefix(
  vatNumber: string,
  countryCode: string,
): string {
  const normalized = normalizeVATNumber(vatNumber);
  if (!normalized) return vatNumber;

  return `${countryCode.toUpperCase()} ${formatSAVATNumber(normalized)}`;
}

/**
 * Extract country code from a VAT number if present
 * @param vatNumber - VAT number that may include country code
 * @returns Object with country code and number
 */
export function extractCountryCode(vatNumber: string): {
  countryCode: string;
  number: string;
} {
  const normalized = normalizeVATNumber(vatNumber) || "";

  // Check for common EU country codes at the start
  const euCountryCodes = [
    "AT",
    "BE",
    "BG",
    "HR",
    "CY",
    "CZ",
    "DK",
    "EE",
    "FI",
    "FR",
    "DE",
    "EL",
    "HU",
    "IE",
    "IT",
    "LV",
    "LT",
    "LU",
    "MT",
    "NL",
    "PL",
    "PT",
    "RO",
    "SK",
    "SI",
    "ES",
    "SE",
  ];

  for (const code of euCountryCodes) {
    if (normalized.startsWith(code)) {
      return {
        countryCode: code,
        number: normalized.substring(code.length),
      };
    }
  }

  // Check for UK formats
  if (normalized.startsWith("GB") || normalized.startsWith("XI")) {
    return {
      countryCode: normalized.substring(0, 2),
      number: normalized.substring(2),
    };
  }

  // Default: assume SA if starts with 4
  if (normalized.match(/^4\d{9}$/)) {
    return {
      countryCode: "ZA",
      number: normalized,
    };
  }

  return {
    countryCode: "UNKNOWN",
    number: normalized,
  };
}

/**
 * Validate basic VAT number format for given country
 * @param vatNumber - VAT number to validate
 * @param countryCode - ISO country code
 * @returns Boolean indicating if format is valid
 */
export function isValidVATFormat(
  vatNumber: string | undefined,
  countryCode: string,
): boolean {
  if (!vatNumber) return false;

  const normalized = normalizeVATNumber(vatNumber) ?? "";

  const upperCountryCode = countryCode.toUpperCase();

  switch (upperCountryCode) {
    case "ZA":
      return VAT_NUMBER_PATTERN.test(normalized);

    case "GB":
    case "UK":
      // UK VAT: 9 or 12 digits, or GB + 9 digits, or specific formats
      return (
        /^([0-9]{9}([0-9]{3})?|[A-Z]{2}[0-9]{3})$/.test(normalized) ||
        /^GB[0-9]{9}([0-9]{3})?$/.test(normalized)
      );

    default:
      // For EU countries, basic check for alphanumeric
      return /^[A-Z0-9]+$/.test(normalized) && normalized.length >= 8;
  }
}

/**
 * Calculate check digit for SA VAT number (if applicable)
 * @param vatNumber - VAT number without check digit
 * @returns Calculated check digit or null
 */
export function calculateSACheckDigit(vatNumber: string): number | null {
  const normalized = normalizeVATNumber(vatNumber) ?? "";
  if (!normalized.match(/^4\d{8}$/)) {
    return null;
  }

  // SA VAT uses a weighted sum algorithm
  const weights = [2, 3, 4, 5, 6, 7, 8, 9];
  let sum = 0;

  for (let i = 0; i < 8; i++) {
    const weight = weights[i] ?? 0;
    sum += parseInt(normalized[i + 1] ?? "0") * weight;
  }

  const checkDigit = (11 - (sum % 11)) % 10;
  return checkDigit;
}

/**
 * Validate SA VAT number check digit
 * @param vatNumber - Complete VAT number including check digit
 * @returns Boolean indicating if check digit is valid
 */
export function validateSACheckDigit(vatNumber: string): boolean {
  const normalized = normalizeVATNumber(vatNumber) ?? "";
  if (!normalized.match(/^4\d{9}$/)) {
    return false;
  }

  const numberWithoutCheck = normalized.substring(0, 9);
  const providedCheckDigit = parseInt(normalized[9] ?? "0");
  const calculatedCheckDigit = calculateSACheckDigit(numberWithoutCheck);

  return calculatedCheckDigit === providedCheckDigit;
}

/**
 * Sanitize VAT number for storage (remove all non-alphanumeric)
 * @param vatNumber - Raw VAT number
 * @returns Sanitized VAT number
 */
export function sanitizeVATNumber(vatNumber: string): string {
  return vatNumber.replace(/[^A-Z0-9]/gi, "").toUpperCase();
}

/**
 * Mask VAT number for display (partially hide sensitive digits)
 * @param vatNumber - Full VAT number
 * @returns Masked VAT number (e.g., "4*** *** 789")
 */
export function maskVATNumber(vatNumber: string): string {
  const normalized = normalizeVATNumber(vatNumber);
  if (!normalized) return "****";

  if (normalized.match(/^4\d{9}$/)) {
    return `${normalized[0]}*** *** ${normalized.substring(7, 10)}`;
  }

  // Generic masking for other formats
  if (normalized.length > 4) {
    return (
      normalized.substring(0, 2) +
      "*".repeat(normalized.length - 4) +
      normalized.substring(normalized.length - 2)
    );
  }

  return "****";
}
