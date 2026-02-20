/**
 * CREDITORFLOW EMS - EU VAT VALIDATOR
 * Version: 3.8.4
 *
 * European Union VAT validation logic
 */

import type {
  VATValidationInput,
  VATNumberValidationResult,
  VATAmountValidationResult,
  TotalAmountValidationResult,
  VATValidationError,
  VATValidationWarning,
  VATCalculationResult,
} from "../types";

/**
 * EU country codes
 */
export const EU_COUNTRY_CODES = [
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

/**
 * EU VAT number patterns by country
 */
export const EU_VAT_PATTERNS: Record<string, RegExp> = {
  AT: /^ATU\d{8}$/, // Austria
  BE: /^BE0\d{9}$/, // Belgium
  BG: /^BG\d{9,10}$/, // Bulgaria
  HR: /^HR\d{11}$/, // Croatia
  CY: /^CY\d{8}[A-Z]$/, // Cyprus
  CZ: /^CZ\d{8,10}$/, // Czech Republic
  DK: /^DK\d{8}$/, // Denmark
  EE: /^EE\d{9}$/, // Estonia
  FI: /^FI\d{8}$/, // Finland
  FR: /^FR[A-Z0-9]{2}\d{9}$/, // France
  DE: /^DE\d{9}$/, // Germany
  EL: /^EL\d{9}$/, // Greece
  HU: /^HU\d{8}$/, // Hungary
  IE: /^IE\d{7}[A-Z]{1,2}$/, // Ireland
  IT: /^IT\d{11}$/, // Italy
  LV: /^LV\d{11}$/, // Latvia
  LT: /^LT\d{9,12}$/, // Lithuania
  LU: /^LU\d{8}$/, // Luxembourg
  MT: /^MT\d{8}$/, // Malta
  NL: /^NL\d{9}B\d{2}$/, // Netherlands
  PL: /^PL\d{10}$/, // Poland
  PT: /^PT\d{9}$/, // Portugal
  RO: /^RO\d{2,10}$/, // Romania
  SK: /^SK\d{10}$/, // Slovakia
  SI: /^SI\d{8}$/, // Slovenia
  ES: /^ES[A-Z]\d{7}[A-Z]$|^ES\d{8}[A-Z]$/, // Spain
  SE: /^SE\d{12}$/, // Sweden
};

/**
 * EU standard VAT rate
 */
export const EU_STANDARD_VAT_RATE = 0.2; // 20% - varies by country

/**
 * EU VAT rates by country
 */
export const EU_VAT_RATES: Record<
  string,
  { standard: number; reduced?: number; superReduced?: number }
> = {
  AT: { standard: 0.2, reduced: 0.1, superReduced: 0.0 },
  BE: { standard: 0.21, reduced: 0.06 },
  BG: { standard: 0.2, reduced: 0.09 },
  HR: { standard: 0.25, reduced: 0.13 },
  CY: { standard: 0.19, reduced: 0.09 },
  CZ: { standard: 0.21, reduced: 0.15, superReduced: 0.1 },
  DK: { standard: 0.25 },
  EE: { standard: 0.2, reduced: 0.09 },
  FI: { standard: 0.24, reduced: 0.14, superReduced: 0.1 },
  FR: { standard: 0.2, reduced: 0.1, superReduced: 0.055 },
  DE: { standard: 0.19, reduced: 0.07 },
  EL: { standard: 0.24, reduced: 0.13 },
  HU: { standard: 0.27, reduced: 0.18, superReduced: 0.05 },
  IE: { standard: 0.23, reduced: 0.135, superReduced: 0.09 },
  IT: { standard: 0.22, reduced: 0.1, superReduced: 0.05 },
  LV: { standard: 0.21, reduced: 0.12 },
  LT: { standard: 0.21, reduced: 0.09 },
  LU: { standard: 0.17, reduced: 0.14, superReduced: 0.08 },
  MT: { standard: 0.18, reduced: 0.05 },
  NL: { standard: 0.21, reduced: 0.09 },
  PL: { standard: 0.23, reduced: 0.08, superReduced: 0.05 },
  PT: { standard: 0.23, reduced: 0.13 },
  RO: { standard: 0.19, reduced: 0.09, superReduced: 0.05 },
  SK: { standard: 0.2, reduced: 0.1 },
  SI: { standard: 0.22, reduced: 0.095 },
  ES: { standard: 0.21, reduced: 0.1, superReduced: 0.04 },
  SE: { standard: 0.25, reduced: 0.12, superReduced: 0.06 },
};

/**
 * Validate EU VAT number format
 * @param vatNumber - VAT number to validate (with country prefix)
 * @param validationId - Validation session ID
 * @returns Validation result
 */
export function validateEUVATNumber(
  vatNumber: string | undefined,
  validationId: string,
): VATNumberValidationResult {
  if (!vatNumber) {
    return {
      isValid: false,
      validationType: "VAT_NUMBER",
      validationTimestamp: new Date(),
      score: 0,
      confidence: 0.5,
      errors: [
        {
          field: "supplierVATNumber",
          errorCode: "MISSING_VAT_NUMBER",
          errorMessage: "VAT number is required",
          severity: "ERROR",
          timestamp: new Date(),
        },
      ],
      warnings: [],
      metadata: { validationId },
    };
  }

  const normalized = vatNumber.replace(/\s/g, "").toUpperCase();
  const countryCode = normalized.substring(0, 2);

  if (!EU_COUNTRY_CODES.includes(countryCode)) {
    return {
      isValid: false,
      validationType: "VAT_NUMBER",
      validationTimestamp: new Date(),
      score: 0,
      confidence: 0.95,
      errors: [
        {
          field: "supplierVATNumber",
          errorCode: "INVALID_EU_COUNTRY_CODE",
          errorMessage: `Country code "${countryCode}" is not a valid EU member state`,
          severity: "ERROR",
          timestamp: new Date(),
        },
      ],
      warnings: [],
      metadata: { validationId, countryCode },
    };
  }

  const pattern = EU_VAT_PATTERNS[countryCode];
  if (pattern && !pattern.test(normalized)) {
    return {
      isValid: false,
      validationType: "VAT_NUMBER",
      validationTimestamp: new Date(),
      score: 0,
      confidence: 0.9,
      errors: [
        {
          field: "supplierVATNumber",
          errorCode: "INVALID_EU_VAT_FORMAT",
          errorMessage: `VAT number "${vatNumber}" does not match ${countryCode} format`,
          severity: "ERROR",
          timestamp: new Date(),
        },
      ],
      warnings: [],
      metadata: { validationId, countryCode },
    };
  }

  return {
    isValid: true,
    validationType: "VAT_NUMBER",
    validationTimestamp: new Date(),
    score: 90,
    confidence: 0.85,
    errors: [],
    warnings: [
      {
        field: "supplierVATNumber",
        warningCode: "EU_VAT_VALIDATE_VIES",
        warningMessage:
          "Consider validating via VIES for real-time verification",
        severity: "INFO",
        timestamp: new Date(),
      },
    ],
    metadata: { validationId, countryCode },
  };
}

/**
 * Calculate EU VAT amount
 * @param subtotalExclVAT - Subtotal excluding VAT
 * @param countryCode - EU country code
 * @param vatRateType - Type of VAT rate (standard, reduced, superReduced)
 * @returns Calculation result
 */
export function calculateEUVAT(
  subtotalExclVAT: number,
  countryCode: string,
  vatRateType: "standard" | "reduced" | "superReduced" = "standard",
): Omit<
  VATCalculationResult,
  | "calculationId"
  | "calculationTimestamp"
  | "vatTreatment"
  | "roundingMethod"
  | "metadata"
> {
  const upperCountryCode = countryCode.toUpperCase();
  const rates = EU_VAT_RATES[upperCountryCode];

  if (!rates) {
    throw new Error(`Unknown EU country code: ${countryCode}`);
  }

  const vatRate = rates[vatRateType] ?? rates.standard;
  const vatAmount = subtotalExclVAT * vatRate;
  const roundedVatAmount = Math.round(vatAmount * 100) / 100;

  return {
    subtotalExclVAT,
    vatRate,
    vatAmount: roundedVatAmount,
    totalAmountInclVAT: subtotalExclVAT + roundedVatAmount,
    applicableRate: vatRate,
    roundingAdjustment: roundedVatAmount - vatAmount,
    toleranceApplied: 0.01,
  };
}

/**
 * Validate EU VAT amount
 * @param actualVatAmount - Actual VAT amount
 * @param calculatedVatAmount - Calculated expected VAT
 * @param tolerance - Allowed tolerance
 * @param validationId - Validation session ID
 * @returns Validation result
 */
export function validateEUVATAmount(
  actualVatAmount: number | undefined,
  calculatedVatAmount: number,
  tolerance: number,
  validationId: string,
): VATAmountValidationResult {
  if (actualVatAmount === undefined) {
    return {
      isValid: false,
      validationType: "VAT_AMOUNT",
      validationTimestamp: new Date(),
      score: 0,
      confidence: 0.5,
      errors: [
        {
          field: "vatAmount",
          errorCode: "MISSING_VAT_AMOUNT",
          errorMessage: "VAT amount is required",
          severity: "ERROR",
          timestamp: new Date(),
        },
      ],
      warnings: [],
      metadata: { validationId },
    };
  }

  const difference = Math.abs(actualVatAmount - calculatedVatAmount);

  if (difference <= tolerance) {
    return {
      isValid: true,
      validationType: "VAT_AMOUNT",
      validationTimestamp: new Date(),
      score: 100,
      confidence: 0.95,
      errors: [],
      warnings:
        difference > 0
          ? [
              {
                field: "vatAmount",
                warningCode: "VAT_ROUNDING_APPLIED",
                warningMessage: `VAT amount rounded by ${difference.toFixed(2)} within tolerance`,
                severity: "INFO",
                timestamp: new Date(),
              },
            ]
          : [],
      metadata: { validationId },
    };
  }

  return {
    isValid: false,
    validationType: "VAT_AMOUNT",
    validationTimestamp: new Date(),
    score: 0,
    confidence: 0.9,
    errors: [
      {
        field: "vatAmount",
        errorCode: "VAT_CALCULATION_MISMATCH",
        errorMessage: `VAT amount mismatch: expected ${calculatedVatAmount.toFixed(2)}, actual ${actualVatAmount.toFixed(2)}`,
        severity: "ERROR",
        timestamp: new Date(),
      },
    ],
    warnings: [],
    metadata: { validationId },
  };
}

/**
 * Validate EU total amount
 * @param totalAmount - Total amount
 * @param subtotalExclVAT - Subtotal excluding VAT
 * @param vatAmount - VAT amount
 * @param tolerance - Allowed tolerance
 * @param validationId - Validation session ID
 * @returns Validation result
 */
export function validateEUTotalAmount(
  totalAmount: number,
  subtotalExclVAT: number,
  vatAmount: number | undefined,
  tolerance: number,
  validationId: string,
): TotalAmountValidationResult {
  if (vatAmount === undefined) {
    return {
      isValid: true,
      validationType: "TOTAL_AMOUNT",
      validationTimestamp: new Date(),
      score: 75,
      confidence: 0.6,
      errors: [],
      warnings: [
        {
          field: "totalAmount",
          warningCode: "INCOMPLETE_VALIDATION",
          warningMessage:
            "Total amount validation incomplete due to missing VAT amount",
          severity: "WARNING",
          timestamp: new Date(),
        },
      ],
      metadata: { validationId },
    };
  }

  const calculatedTotal = subtotalExclVAT + vatAmount;
  const difference = Math.abs(totalAmount - calculatedTotal);

  if (difference <= tolerance) {
    return {
      isValid: true,
      validationType: "TOTAL_AMOUNT",
      validationTimestamp: new Date(),
      score: 100,
      confidence: 0.95,
      errors: [],
      warnings:
        difference > 0
          ? [
              {
                field: "totalAmount",
                warningCode: "TOTAL_ROUNDING_APPLIED",
                warningMessage: `Total amount rounded by ${difference.toFixed(2)}`,
                severity: "INFO",
                timestamp: new Date(),
              },
            ]
          : [],
      metadata: { validationId },
    };
  }

  return {
    isValid: false,
    validationType: "TOTAL_AMOUNT",
    validationTimestamp: new Date(),
    score: 0,
    confidence: 0.9,
    errors: [
      {
        field: "totalAmount",
        errorCode: "TOTAL_CALCULATION_MISMATCH",
        errorMessage: `Total amount mismatch: expected ${calculatedTotal.toFixed(2)}, actual ${totalAmount.toFixed(2)}`,
        severity: "ERROR",
        timestamp: new Date(),
      },
    ],
    warnings: [],
    metadata: { validationId },
  };
}

/**
 * Validate EU tax invoice requirements
 * @param input - VAT validation input
 * @param validationId - Validation session ID
 * @returns Validation result
 */
export function validateEUTaxInvoice(
  input: VATValidationInput,
  validationId: string,
): {
  isValid: boolean;
  score: number;
  errors: VATValidationError[];
  warnings: VATValidationWarning[];
} {
  const errors: VATValidationError[] = [];
  const warnings: VATValidationWarning[] = [];
  let score = 100;

  // EU Directive 2006/112/EC requirements
  if (!input.invoiceNumber) {
    errors.push({
      field: "invoiceNumber",
      errorCode: "MISSING_INVOICE_NUMBER",
      errorMessage: "Invoice number is mandatory (EU Directive 2006/112/EC)",
      severity: "ERROR",
      timestamp: new Date(),
    });
    score -= 20;
  }

  if (!input.invoiceDate) {
    errors.push({
      field: "invoiceDate",
      errorCode: "MISSING_INVOICE_DATE",
      errorMessage: "Invoice date is mandatory (EU Directive 2006/112/EC)",
      severity: "ERROR",
      timestamp: new Date(),
    });
    score -= 20;
  }

  if (!input.supplierName) {
    errors.push({
      field: "supplierName",
      errorCode: "MISSING_SUPPLIER_NAME",
      errorMessage: "Supplier name is mandatory",
      severity: "ERROR",
      timestamp: new Date(),
    });
    score -= 15;
  }

  if (!input.supplierVATNumber) {
    errors.push({
      field: "supplierVATNumber",
      errorCode: "MISSING_SUPPLIER_VAT_NUMBER",
      errorMessage:
        "Supplier VAT number is mandatory for intra-EU transactions",
      severity: "ERROR",
      timestamp: new Date(),
    });
    score -= 20;
  }

  // Check for EU VAT format
  if (input.supplierVATNumber) {
    const normalized = input.supplierVATNumber.replace(/\s/g, "").toUpperCase();
    const countryCode = normalized.substring(0, 2);

    if (!EU_COUNTRY_CODES.includes(countryCode)) {
      warnings.push({
        field: "supplierVATNumber",
        warningCode: "NON_EU_VAT_NUMBER",
        warningMessage: "Supplier appears to be outside the EU",
        severity: "WARNING",
        timestamp: new Date(),
      });
      score -= 10;
    }
  }

  return {
    isValid: errors.length === 0,
    score: Math.max(0, score),
    errors,
    warnings,
  };
}
