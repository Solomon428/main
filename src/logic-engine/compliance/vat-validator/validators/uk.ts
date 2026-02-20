/**
 * CREDITORFLOW EMS - UK VAT VALIDATOR
 * Version: 3.8.4
 *
 * United Kingdom VAT validation logic
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
 * UK VAT number patterns
 */
export const UK_VAT_PATTERNS = {
  STANDARD: /^GB\d{9}$/, // Standard: GB + 9 digits
  BRANCH: /^GB\d{12}$/, // Branch traders: GB + 12 digits
  GOVERNMENT: /^GBGD\d{3}$/, // Government departments
  HEALTH: /^GBHA\d{3}$/, // Health authorities
  NORTHERN_IRELAND: /^XI\d{9}$/, // Northern Ireland (post-Brexit)
  NORTHERN_IRELAND_BRANCH: /^XI\d{12}$/, // Northern Ireland branch
  // Without prefix
  NO_PREFIX_STANDARD: /^\d{9}$/,
  NO_PREFIX_BRANCH: /^\d{12}$/,
};

/**
 * UK standard VAT rate
 */
export const UK_STANDARD_VAT_RATE = 0.2; // 20%

/**
 * UK VAT rates
 */
export const UK_VAT_RATES = {
  STANDARD: 0.2,
  REDUCED: 0.05, // 5%
  ZERO: 0.0, // 0%
};

/**
 * Validate UK VAT number format
 * @param vatNumber - VAT number to validate
 * @param validationId - Validation session ID
 * @returns Validation result
 */
export function validateUKVATNumber(
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

  // Check if it's a Northern Ireland number (XI prefix)
  const isNorthernIreland = normalized.startsWith("XI");

  // Check patterns
  const isValidFormat = Object.values(UK_VAT_PATTERNS).some((pattern) =>
    pattern.test(normalized),
  );

  if (!isValidFormat) {
    return {
      isValid: false,
      validationType: "VAT_NUMBER",
      validationTimestamp: new Date(),
      score: 0,
      confidence: 0.95,
      errors: [
        {
          field: "supplierVATNumber",
          errorCode: "INVALID_UK_VAT_FORMAT",
          errorMessage: `VAT number "${vatNumber}" does not match UK format (GB followed by 9 or 12 digits, or XI for Northern Ireland)`,
          severity: "ERROR",
          timestamp: new Date(),
        },
      ],
      warnings: [],
      metadata: { validationId, isNorthernIreland },
    };
  }

  // Extract the numeric part for modulus 97 check (standard format only)
  let numericPart = normalized;
  if (normalized.startsWith("GB")) {
    numericPart = normalized.substring(2);
  } else if (normalized.startsWith("XI")) {
    numericPart = normalized.substring(2);
  }

  // HMRC modulus 97 check for standard 9-digit numbers
  if (numericPart.length === 9 && /^\d{9}$/.test(numericPart)) {
    const isValidModulus = validateUKModulus97(numericPart);

    if (!isValidModulus) {
      return {
        isValid: false,
        validationType: "VAT_NUMBER",
        validationTimestamp: new Date(),
        score: 0,
        confidence: 0.98,
        errors: [
          {
            field: "supplierVATNumber",
            errorCode: "INVALID_UK_VAT_CHECKSUM",
            errorMessage: "VAT number failed HMRC checksum validation",
            severity: "ERROR",
            timestamp: new Date(),
          },
        ],
        warnings: [],
        metadata: { validationId, isNorthernIreland },
      };
    }
  }

  return {
    isValid: true,
    validationType: "VAT_NUMBER",
    validationTimestamp: new Date(),
    score: 95,
    confidence: 0.9,
    errors: [],
    warnings: isNorthernIreland
      ? [
          {
            field: "supplierVATNumber",
            warningCode: "NORTHERN_IRELAND_VAT",
            warningMessage:
              "Northern Ireland VAT number detected - EU VAT rules may apply",
            severity: "INFO",
            timestamp: new Date(),
          },
        ]
      : [
          {
            field: "supplierVATNumber",
            warningCode: "UK_VAT_VALIDATE_HMRC",
            warningMessage:
              "Consider validating via HMRC API for real-time verification",
            severity: "INFO",
            timestamp: new Date(),
          },
        ],
    metadata: { validationId, isNorthernIreland },
  };
}

/**
 * HMRC Modulus 97 validation for UK VAT numbers
 * @param vatNumber - 9-digit VAT number (without GB prefix)
 * @returns Boolean indicating if checksum is valid
 */
export function validateUKModulus97(vatNumber: string): boolean {
  if (!/^\d{9}$/.test(vatNumber)) {
    return false;
  }

  // HMRC Modulus 97 algorithm
  const weights = [8, 7, 6, 5, 4, 3, 2];
  let sum = 0;

  // First 7 digits have weights
  for (let i = 0; i < 7; i++) {
    sum += parseInt(vatNumber[i] ?? "0", 10) * (weights[i] ?? 0);
  }

  // Calculate check digits
  const checkDigit1 = parseInt(vatNumber[7] ?? "0", 10);
  const checkDigit2 = parseInt(vatNumber[8] ?? "0", 10);

  // The sum of weighted digits plus the check digits should be divisible by 97
  const total = sum + checkDigit1 * 10 + checkDigit2;

  return total % 97 === 0;
}

/**
 * Calculate UK VAT amount
 * @param subtotalExclVAT - Subtotal excluding VAT
 * @param vatRate - VAT rate (default 20%)
 * @returns Calculation result
 */
export function calculateUKVAT(
  subtotalExclVAT: number,
  vatRate: number = UK_STANDARD_VAT_RATE,
): Omit<
  VATCalculationResult,
  | "calculationId"
  | "calculationTimestamp"
  | "vatTreatment"
  | "roundingMethod"
  | "metadata"
> {
  const vatAmount = subtotalExclVAT * vatRate;
  const roundedVatAmount = Math.round(vatAmount * 100) / 100; // Standard 2 decimal rounding

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
 * Validate UK VAT amount
 * @param actualVatAmount - Actual VAT amount
 * @param calculatedVatAmount - Calculated expected VAT
 * @param tolerance - Allowed tolerance
 * @param validationId - Validation session ID
 * @returns Validation result
 */
export function validateUKVATAmount(
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
 * Validate UK total amount
 * @param totalAmount - Total amount
 * @param subtotalExclVAT - Subtotal excluding VAT
 * @param vatAmount - VAT amount
 * @param tolerance - Allowed tolerance
 * @param validationId - Validation session ID
 * @returns Validation result
 */
export function validateUKTotalAmount(
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
 * Validate UK tax invoice requirements
 * @param input - VAT validation input
 * @param validationId - Validation session ID
 * @returns Validation result
 */
export function validateUKTaxInvoice(
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

  // UK VAT invoice requirements (per HMRC)
  if (!input.invoiceNumber) {
    errors.push({
      field: "invoiceNumber",
      errorCode: "MISSING_INVOICE_NUMBER",
      errorMessage: "Invoice number is mandatory (HMRC requirement)",
      severity: "ERROR",
      timestamp: new Date(),
    });
    score -= 20;
  }

  if (!input.invoiceDate) {
    errors.push({
      field: "invoiceDate",
      errorCode: "MISSING_INVOICE_DATE",
      errorMessage: "Invoice date is mandatory (HMRC requirement)",
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
    warnings.push({
      field: "supplierVATNumber",
      warningCode: "MISSING_SUPPLIER_VAT_NUMBER",
      warningMessage: "Supplier VAT number recommended for tax invoices",
      severity: "WARNING",
      timestamp: new Date(),
    });
    score -= 10;
  } else {
    // Validate UK VAT format
    const vatResult = validateUKVATNumber(
      input.supplierVATNumber,
      validationId,
    );
    if (!vatResult.isValid) {
      errors.push(...vatResult.errors);
      score -= 15;
    }
  }

  // Check for Northern Ireland VAT (post-Brexit considerations)
  if (input.supplierVATNumber) {
    const normalized = input.supplierVATNumber.replace(/\s/g, "").toUpperCase();
    if (normalized.startsWith("XI")) {
      warnings.push({
        field: "supplierVATNumber",
        warningCode: "NORTHERN_IRELAND_SUPPLIER",
        warningMessage: "Northern Ireland supplier - EU VAT rules may apply",
        severity: "INFO",
        timestamp: new Date(),
      });
    }
  }

  return {
    isValid: errors.length === 0,
    score: Math.max(0, score),
    errors,
    warnings,
  };
}

/**
 * Check if a VAT number is from Northern Ireland
 * @param vatNumber - VAT number to check
 * @returns Boolean indicating if it's a Northern Ireland number
 */
export function isNorthernIrelandVAT(vatNumber: string): boolean {
  const normalized = vatNumber.replace(/\s/g, "").toUpperCase();
  return normalized.startsWith("XI");
}
