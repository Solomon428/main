/**
 * CREDITORFLOW EMS - SOUTH AFRICA VAT VALIDATOR
 * Version: 3.8.4
 *
 * South Africa specific VAT validation logic
 */

import { VAT_NUMBER_PATTERN } from "../constants";
import type {
  VATValidationInput,
  VATNumberValidationResult,
  VATAmountValidationResult,
  TotalAmountValidationResult,
  VATTreatmentValidationResult,
  VATReverseChargeValidationResult,
  TaxInvoiceValidationResult,
  VATValidationError,
  VATValidationWarning,
  VATTreatmentType,
  VATReverseChargeType,
} from "../types";

/**
 * Validate South African VAT number format
 * @param vatNumber - VAT number to validate
 * @param validationId - Validation session ID
 * @returns Validation result for SA VAT number
 */
export function validateSAVATNumber(
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
          errorMessage: "VAT number is required for taxable supplies",
          severity: "ERROR",
          timestamp: new Date(),
        },
      ],
      warnings: [
        {
          field: "supplierVATNumber",
          warningCode: "VAT_NUMBER_RECOMMENDED",
          warningMessage: "VAT number recommended for all suppliers",
          severity: "WARNING",
          timestamp: new Date(),
        },
      ],
      metadata: { validationId },
    };
  }

  if (!VAT_NUMBER_PATTERN.test(vatNumber)) {
    return {
      isValid: false,
      validationType: "VAT_NUMBER",
      validationTimestamp: new Date(),
      score: 0,
      confidence: 0.95,
      errors: [
        {
          field: "supplierVATNumber",
          errorCode: "INVALID_VAT_NUMBER_FORMAT",
          errorMessage: `VAT number "${vatNumber}" does not match SA format (10 digits starting with 4)`,
          severity: "ERROR",
          timestamp: new Date(),
        },
      ],
      warnings: [],
      metadata: { validationId },
    };
  }

  return {
    isValid: true,
    validationType: "VAT_NUMBER",
    validationTimestamp: new Date(),
    score: 100,
    confidence: 0.98,
    errors: [],
    warnings: [],
    metadata: { validationId },
  };
}

/**
 * Validate South African VAT treatment applicability
 * @param vatTreatment - VAT treatment type
 * @param supplierCountry - Supplier country code
 * @param supplierVATNumber - Supplier VAT number
 * @param validationId - Validation session ID
 * @returns Validation result for SA VAT treatment
 */
export function validateSAVATTreatment(
  vatTreatment: VATTreatmentType,
  supplierCountry: string | undefined,
  supplierVATNumber: string | undefined,
  validationId: string,
): VATTreatmentValidationResult {
  const errors: VATValidationError[] = [];
  const warnings: VATValidationWarning[] = [];

  // Basic validation - treatment must be recognized
  const validTreatments: VATTreatmentType[] = [
    "TAXABLE_STANDARD",
    "TAXABLE_ZERO_RATED",
    "EXEMPT",
    "OUT_OF_SCOPE",
  ];

  if (!validTreatments.includes(vatTreatment)) {
    return {
      isValid: false,
      validationType: "VAT_TREATMENT",
      validationTimestamp: new Date(),
      score: 0,
      confidence: 0.95,
      errors: [
        {
          field: "vatTreatment",
          errorCode: "INVALID_VAT_TREATMENT",
          errorMessage: `VAT treatment "${vatTreatment}" is not recognized`,
          severity: "ERROR",
          timestamp: new Date(),
        },
      ],
      warnings: [],
      metadata: { validationId },
    };
  }

  // Cross-border validation
  if (
    supplierCountry &&
    supplierCountry !== "ZA" &&
    vatTreatment === "TAXABLE_STANDARD"
  ) {
    warnings.push({
      field: "vatTreatment",
      warningCode: "CROSS_BORDER_TREATMENT_REVIEW",
      warningMessage: `Cross-border supply from ${supplierCountry} may require zero-rating or reverse charge treatment`,
      severity: "WARNING",
      timestamp: new Date(),
    });

    return {
      isValid: true,
      validationType: "VAT_TREATMENT",
      validationTimestamp: new Date(),
      score: 50,
      confidence: 0.8,
      errors: [],
      warnings,
      metadata: { validationId },
    };
  }

  return {
    isValid: true,
    validationType: "VAT_TREATMENT",
    validationTimestamp: new Date(),
    score: 100,
    confidence: 0.9,
    errors: [],
    warnings: [],
    metadata: { validationId },
  };
}

/**
 * Validate South African reverse charge applicability
 * @param reverseChargeType - Type of reverse charge
 * @param supplierCountry - Supplier country code
 * @param supplierVATNumber - Supplier VAT number
 * @param validationId - Validation session ID
 * @returns Validation result for SA reverse charge
 */
export function validateSAReverseCharge(
  reverseChargeType: VATReverseChargeType | undefined,
  supplierCountry: string | undefined,
  supplierVATNumber: string | undefined,
  validationId: string,
): VATReverseChargeValidationResult {
  const validReverseChargeTypes: VATReverseChargeType[] = [
    "IMPORTED_SERVICES",
    "DIGITAL_SERVICES_FROM_NON_RESIDENTS",
    "CONSTRUCTION_SERVICES",
    "SECOND_HAND_GOODS",
    "OTHER_REVERSE_CHARGE",
  ];

  // No reverse charge specified - validate if required
  if (!reverseChargeType) {
    // Check if reverse charge should apply (imported services from non-resident)
    if (supplierCountry && supplierCountry !== "ZA" && !supplierVATNumber) {
      return {
        isValid: false,
        validationType: "REVERSE_CHARGE",
        validationTimestamp: new Date(),
        score: 60,
        confidence: 0.75,
        errors: [],
        warnings: [
          {
            field: "reverseChargeType",
            warningCode: "REVERSE_CHARGE_POSSIBLY_REQUIRED",
            warningMessage: `Supply from non-resident supplier ${supplierCountry} without VAT number may require reverse charge treatment per SARS Notice No. 17 of 2021`,
            severity: "WARNING",
            timestamp: new Date(),
          },
        ],
        metadata: { validationId },
      };
    }

    return {
      isValid: true,
      validationType: "REVERSE_CHARGE",
      validationTimestamp: new Date(),
      score: 100,
      confidence: 0.85,
      errors: [],
      warnings: [],
      metadata: { validationId },
    };
  }

  // Validate recognized reverse charge type
  if (!validReverseChargeTypes.includes(reverseChargeType)) {
    return {
      isValid: false,
      validationType: "REVERSE_CHARGE",
      validationTimestamp: new Date(),
      score: 0,
      confidence: 0.95,
      errors: [
        {
          field: "reverseChargeType",
          errorCode: "INVALID_REVERSE_CHARGE_TYPE",
          errorMessage: `Reverse charge type "${reverseChargeType}" is not recognized`,
          severity: "ERROR",
          timestamp: new Date(),
        },
      ],
      warnings: [],
      metadata: { validationId },
    };
  }

  return {
    isValid: true,
    validationType: "REVERSE_CHARGE",
    validationTimestamp: new Date(),
    score: 100,
    confidence: 0.9,
    errors: [],
    warnings: [],
    metadata: { validationId },
  };
}

/**
 * Validate South African tax invoice requirements per SARS Section 20
 * @param input - VAT validation input
 * @param validationId - Validation session ID
 * @returns Validation result for SA tax invoice
 */
export function validateSATaxInvoice(
  input: VATValidationInput,
  validationId: string,
): TaxInvoiceValidationResult {
  const errors: VATValidationError[] = [];
  const warnings: VATValidationWarning[] = [];
  let score = 100;

  // Mandatory fields per SARS Section 20
  if (!input.invoiceNumber) {
    errors.push({
      field: "invoiceNumber",
      errorCode: "MISSING_INVOICE_NUMBER",
      errorMessage: "Invoice number is mandatory per SARS Section 20",
      severity: "ERROR",
      timestamp: new Date(),
    });
    score -= 20;
  }

  if (!input.invoiceDate) {
    errors.push({
      field: "invoiceDate",
      errorCode: "MISSING_INVOICE_DATE",
      errorMessage: "Invoice date is mandatory per SARS Section 20",
      severity: "ERROR",
      timestamp: new Date(),
    });
    score -= 20;
  }

  if (!input.supplierName) {
    errors.push({
      field: "supplierName",
      errorCode: "MISSING_SUPPLIER_NAME",
      errorMessage: "Supplier name is mandatory per SARS Section 20",
      severity: "ERROR",
      timestamp: new Date(),
    });
    score -= 20;
  }

  if (!input.supplierVATNumber) {
    warnings.push({
      field: "supplierVATNumber",
      warningCode: "MISSING_SUPPLIER_VAT_NUMBER",
      warningMessage:
        "Supplier VAT number recommended per SARS Section 20 (mandatory for input tax claims)",
      severity: "WARNING",
      timestamp: new Date(),
    });
    score -= 10;
  }

  if (
    !input.vatAmount &&
    input.vatTreatment !== "EXEMPT" &&
    input.vatTreatment !== "OUT_OF_SCOPE"
  ) {
    errors.push({
      field: "vatAmount",
      errorCode: "MISSING_VAT_AMOUNT",
      errorMessage:
        "VAT amount is mandatory for taxable supplies per SARS Section 20",
      severity: "ERROR",
      timestamp: new Date(),
    });
    score -= 20;
  }

  // Additional requirements for invoices > R5,000
  if (input.totalAmount > 5000) {
    if (!input.supplierAddress) {
      warnings.push({
        field: "supplierAddress",
        warningCode: "MISSING_SUPPLIER_ADDRESS",
        warningMessage:
          "Supplier address required for invoices > R5,000 per SARS Section 20(4)",
        severity: "WARNING",
        timestamp: new Date(),
      });
      score -= 5;
    }

    if (!input.supplierVATNumber) {
      errors.push({
        field: "supplierVATNumber",
        errorCode: "MISSING_SUPPLIER_VAT_NUMBER_REQUIRED",
        errorMessage:
          "Supplier VAT number mandatory for invoices > R5,000 per SARS Section 20(4)",
        severity: "ERROR",
        timestamp: new Date(),
      });
      score -= 15;
    }
  }

  return {
    isValid: errors.length === 0,
    validationType: "TAX_INVOICE",
    validationTimestamp: new Date(),
    score: Math.max(0, score),
    confidence: errors.length === 0 ? 0.95 : warnings.length === 0 ? 0.7 : 0.5,
    errors,
    warnings,
    metadata: { validationId },
  };
}
