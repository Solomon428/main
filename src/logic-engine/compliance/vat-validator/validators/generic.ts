/**
 * CREDITORFLOW EMS - GENERIC VAT VALIDATOR
 * Version: 3.8.4
 * 
 * Generic VAT validation logic for other jurisdictions
 */

import type {
  VATValidationInput,
  VATNumberValidationResult,
  VATAmountValidationResult,
  TotalAmountValidationResult,
  VATValidationError,
  VATValidationWarning,
  VATCalculationResult
} from '../types';

/**
 * Generic VAT number validation for non-SA countries
 * @param vatNumber - VAT number to validate
 * @param countryCode - Country code
 * @param validationId - Validation session ID
 * @returns Validation result
 */
export function validateGenericVATNumber(
  vatNumber: string | undefined,
  countryCode: string,
  validationId: string
): VATNumberValidationResult {
  if (!vatNumber) {
    return {
      isValid: false,
      validationType: 'VAT_NUMBER',
      validationTimestamp: new Date(),
      score: 0,
      confidence: 0.50,
      errors: [{
        field: 'supplierVATNumber',
        errorCode: 'MISSING_VAT_NUMBER',
        errorMessage: 'VAT number is required for validation',
        severity: 'ERROR',
        timestamp: new Date()
      }],
      warnings: [],
      metadata: { validationId, countryCode }
    };
  }
  
  // Basic format check - alphanumeric and reasonable length
  const normalized = vatNumber.replace(/\s/g, '').toUpperCase();
  
  if (normalized.length < 5 || normalized.length > 20) {
    return {
      isValid: false,
      validationType: 'VAT_NUMBER',
      validationTimestamp: new Date(),
      score: 0,
      confidence: 0.80,
      errors: [{
        field: 'supplierVATNumber',
        errorCode: 'INVALID_VAT_NUMBER_LENGTH',
        errorMessage: `VAT number "${vatNumber}" has invalid length for ${countryCode}`,
        severity: 'ERROR',
        timestamp: new Date()
      }],
      warnings: [],
      metadata: { validationId, countryCode }
    };
  }
  
  if (!/^[A-Z0-9]+$/.test(normalized)) {
    return {
      isValid: false,
      validationType: 'VAT_NUMBER',
      validationTimestamp: new Date(),
      score: 0,
      confidence: 0.85,
      errors: [{
        field: 'supplierVATNumber',
        errorCode: 'INVALID_VAT_NUMBER_FORMAT',
        errorMessage: `VAT number "${vatNumber}" contains invalid characters`,
        severity: 'ERROR',
        timestamp: new Date()
      }],
      warnings: [],
      metadata: { validationId, countryCode }
    };
  }
  
  return {
    isValid: true,
    validationType: 'VAT_NUMBER',
    validationTimestamp: new Date(),
    score: 75,
    confidence: 0.70,
    errors: [],
    warnings: [{
      field: 'supplierVATNumber',
      warningCode: 'GENERIC_VALIDATION_ONLY',
      warningMessage: `VAT number validated with generic rules only for ${countryCode}. Country-specific validation recommended.`,
      severity: 'WARNING',
      timestamp: new Date()
    }],
    metadata: { validationId, countryCode }
  };
}

/**
 * Generic VAT amount validation
 * @param actualVatAmount - Actual VAT amount from invoice
 * @param calculatedVatAmount - Calculated expected VAT amount
 * @param tolerance - Allowed tolerance
 * @param validationId - Validation session ID
 * @returns Validation result
 */
export function validateGenericVATAmount(
  actualVatAmount: number | undefined,
  calculatedVatAmount: number,
  tolerance: number,
  validationId: string
): VATAmountValidationResult {
  if (actualVatAmount === undefined) {
    return {
      isValid: false,
      validationType: 'VAT_AMOUNT',
      validationTimestamp: new Date(),
      score: 0,
      confidence: 0.50,
      errors: [{
        field: 'vatAmount',
        errorCode: 'MISSING_VAT_AMOUNT',
        errorMessage: 'VAT amount is required',
        severity: 'ERROR',
        timestamp: new Date()
      }],
      warnings: [],
      metadata: { validationId }
    };
  }
  
  const difference = Math.abs(actualVatAmount - calculatedVatAmount);
  
  if (difference <= tolerance) {
    return {
      isValid: true,
      validationType: 'VAT_AMOUNT',
      validationTimestamp: new Date(),
      score: 100,
      confidence: 0.95,
      errors: [],
      warnings: difference > 0 ? [{
        field: 'vatAmount',
        warningCode: 'VAT_ROUNDING_APPLIED',
        warningMessage: `VAT amount rounded by ${difference.toFixed(2)} within tolerance of ${tolerance}`,
        severity: 'INFO',
        timestamp: new Date()
      }] : [],
      metadata: { validationId }
    };
  }
  
  return {
    isValid: false,
    validationType: 'VAT_AMOUNT',
    validationTimestamp: new Date(),
    score: 0,
    confidence: 0.90,
    errors: [{
      field: 'vatAmount',
      errorCode: 'VAT_CALCULATION_MISMATCH',
      errorMessage: `VAT amount mismatch: expected ${calculatedVatAmount.toFixed(2)}, actual ${actualVatAmount.toFixed(2)} (tolerance: ${tolerance})`,
      severity: 'ERROR',
      timestamp: new Date()
    }],
    warnings: [],
    metadata: { validationId }
  };
}

/**
 * Generic total amount validation
 * @param totalAmount - Total amount from invoice
 * @param subtotalExclVAT - Subtotal excluding VAT
 * @param vatAmount - VAT amount
 * @param tolerance - Allowed tolerance
 * @param validationId - Validation session ID
 * @returns Validation result
 */
export function validateGenericTotalAmount(
  totalAmount: number,
  subtotalExclVAT: number,
  vatAmount: number | undefined,
  tolerance: number,
  validationId: string
): TotalAmountValidationResult {
  if (vatAmount === undefined) {
    return {
      isValid: true,
      validationType: 'TOTAL_AMOUNT',
      validationTimestamp: new Date(),
      score: 75,
      confidence: 0.60,
      errors: [],
      warnings: [{
        field: 'totalAmount',
        warningCode: 'INCOMPLETE_VALIDATION',
        warningMessage: 'Total amount validation incomplete due to missing VAT amount',
        severity: 'WARNING',
        timestamp: new Date()
      }],
      metadata: { validationId }
    };
  }
  
  const calculatedTotal = subtotalExclVAT + vatAmount;
  const difference = Math.abs(totalAmount - calculatedTotal);
  
  if (difference <= tolerance) {
    return {
      isValid: true,
      validationType: 'TOTAL_AMOUNT',
      validationTimestamp: new Date(),
      score: 100,
      confidence: 0.95,
      errors: [],
      warnings: difference > 0 ? [{
        field: 'totalAmount',
        warningCode: 'TOTAL_ROUNDING_APPLIED',
        warningMessage: `Total amount rounded by ${difference.toFixed(2)} within tolerance of ${tolerance}`,
        severity: 'INFO',
        timestamp: new Date()
      }] : [],
      metadata: { validationId }
    };
  }
  
  return {
    isValid: false,
    validationType: 'TOTAL_AMOUNT',
    validationTimestamp: new Date(),
    score: 0,
    confidence: 0.90,
    errors: [{
      field: 'totalAmount',
      errorCode: 'TOTAL_CALCULATION_MISMATCH',
      errorMessage: `Total amount mismatch: expected ${calculatedTotal.toFixed(2)}, actual ${totalAmount.toFixed(2)} (tolerance: ${tolerance})`,
      severity: 'ERROR',
      timestamp: new Date()
    }],
    warnings: [],
    metadata: { validationId }
  };
}

/**
 * Calculate generic VAT amount
 * @param subtotalExclVAT - Subtotal excluding VAT
 * @param vatRate - VAT rate (0-1)
 * @returns Calculation result
 */
export function calculateGenericVAT(
  subtotalExclVAT: number,
  vatRate: number
): Omit<VATCalculationResult, 'calculationId' | 'calculationTimestamp' | 'vatTreatment' | 'roundingMethod' | 'metadata'> {
  const vatAmount = subtotalExclVAT * vatRate;
  const roundedVatAmount = Math.round(vatAmount * 100) / 100; // Standard 2 decimal rounding
  
  return {
    subtotalExclVAT,
    vatRate,
    vatAmount: roundedVatAmount,
    totalAmountInclVAT: subtotalExclVAT + roundedVatAmount,
    applicableRate: vatRate,
    roundingAdjustment: roundedVatAmount - vatAmount,
    toleranceApplied: 0.01
  };
}

/**
 * Generic tax invoice validation
 * @param input - VAT validation input
 * @param validationId - Validation session ID
 * @returns Validation result
 */
export function validateGenericTaxInvoice(
  input: VATValidationInput,
  validationId: string
): { isValid: boolean; score: number; errors: VATValidationError[]; warnings: VATValidationWarning[] } {
  const errors: VATValidationError[] = [];
  const warnings: VATValidationWarning[] = [];
  let score = 100;
  
  // Basic requirements
  if (!input.invoiceNumber) {
    errors.push({
      field: 'invoiceNumber',
      errorCode: 'MISSING_INVOICE_NUMBER',
      errorMessage: 'Invoice number is mandatory',
      severity: 'ERROR',
      timestamp: new Date()
    });
    score -= 20;
  }
  
  if (!input.invoiceDate) {
    errors.push({
      field: 'invoiceDate',
      errorCode: 'MISSING_INVOICE_DATE',
      errorMessage: 'Invoice date is mandatory',
      severity: 'ERROR',
      timestamp: new Date()
    });
    score -= 20;
  }
  
  if (!input.supplierName) {
    errors.push({
      field: 'supplierName',
      errorCode: 'MISSING_SUPPLIER_NAME',
      errorMessage: 'Supplier name is mandatory',
      severity: 'ERROR',
      timestamp: new Date()
    });
    score -= 20;
  }
  
  if (!input.supplierVATNumber) {
    warnings.push({
      field: 'supplierVATNumber',
      warningCode: 'MISSING_SUPPLIER_VAT_NUMBER',
      warningMessage: 'Supplier VAT number recommended for tax invoice validation',
      severity: 'WARNING',
      timestamp: new Date()
    });
    score -= 10;
  }
  
  return {
    isValid: errors.length === 0,
    score: Math.max(0, score),
    errors,
    warnings
  };
}
