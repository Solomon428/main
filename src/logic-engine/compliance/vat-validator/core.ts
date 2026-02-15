/**
 * CREDITORFLOW EMS - CORE VAT VALIDATOR
 * Version: 3.8.4
 * 
 * Main VATValidator class with comprehensive validation logic
 */

import {
  VAT_RATE,
  VAT_ROUNDING_TOLERANCE,
  VAT_NUMBER_PATTERN,
  VAT_RATES,
  VAT_TREATMENTS,
  VAT_REGULATIONS,
  VAT_SARS_NOTICES,
  VAT_LEGISLATION_REFERENCES,
  VAT_CASE_LAW_REFERENCES,
  VAT_RULING_REFERENCES,
  VAT_GUIDANCE_REFERENCES,
  VAT_INDUSTRY_PRACTICE_REFERENCES,
  VAT_INTERNATIONAL_STANDARD_REFERENCES
} from './constants';

import {
  validateSAVATNumber,
  validateSAVATTreatment,
  validateSAReverseCharge,
  validateSATaxInvoice
} from './validators/sa';

import {
  validateGenericVATNumber,
  validateGenericVATAmount,
  validateGenericTotalAmount
} from './validators/generic';

import type {
  VATValidationInput,
  VATValidationResult,
  VATValidationContext,
  VATCalculationResult,
  VATNumberValidationResult,
  VATAmountValidationResult,
  TotalAmountValidationResult,
  VATTreatmentValidationResult,
  VATReverseChargeValidationResult,
  TaxInvoiceValidationResult,
  VATComplianceStatus,
  VATValidationError,
  VATValidationWarning,
  VATValidationSuggestion,
  VATAuditTrail,
  VATTreatmentType
} from './types';

export class VATValidator {
  private static readonly VAT_RATE = VAT_RATE;
  private static readonly VAT_ROUNDING_TOLERANCE = VAT_ROUNDING_TOLERANCE;
  private static readonly VAT_NUMBER_PATTERN = VAT_NUMBER_PATTERN;
  private static readonly VAT_RATES = VAT_RATES;
  private static readonly VAT_TREATMENTS = VAT_TREATMENTS;

  /**
   * Validate VAT compliance for invoice with comprehensive SA-specific rules
   * @param input - VAT validation input containing invoice financial data
   * @param context - Optional business context for adaptive validation
   * @returns Comprehensive VAT validation result with compliance status
   */
  validateVAT(
    input: VATValidationInput,
    context?: VATValidationContext
  ): VATValidationResult {
    const validationId = `vat_${Date.now()}_${this.generateRandomString(12)}`;
    const validationStartTime = Date.now();
    const auditTrail: VATAuditTrail[] = [];
    
    try {
      // Step 1: Validate input data quality
      auditTrail.push(this.createAuditEntry('VALIDATION_INITIALIZED', validationId, { input, context }));
      this.validateInput(input, validationId);
      
      // Step 2: Validate VAT number format (SA specific)
      auditTrail.push(this.createAuditEntry('VAT_NUMBER_VALIDATION_STARTED', validationId));
      const vatNumberValidation = validateSAVATNumber(input.supplierVATNumber, validationId);
      auditTrail.push(this.createAuditEntry('VAT_NUMBER_VALIDATION_COMPLETED', validationId, { vatNumberValidation }));
      
      // Step 3: Calculate expected VAT amount
      auditTrail.push(this.createAuditEntry('VAT_CALCULATION_STARTED', validationId));
      const vatCalculation = this.calculateVAT(
        input.subtotalExclVAT,
        input.vatRate ?? VATValidator.VAT_RATE,
        input.vatTreatment ?? 'TAXABLE_STANDARD',
        validationId
      );
      auditTrail.push(this.createAuditEntry('VAT_CALCULATION_COMPLETED', validationId, { vatCalculation }));
      
      // Step 4: Validate VAT amount against calculated amount
      auditTrail.push(this.createAuditEntry('VAT_AMOUNT_VALIDATION_STARTED', validationId));
      const vatAmountValidation = validateGenericVATAmount(
        input.vatAmount,
        vatCalculation.vatAmount,
        VATValidator.VAT_ROUNDING_TOLERANCE,
        validationId
      );
      auditTrail.push(this.createAuditEntry('VAT_AMOUNT_VALIDATION_COMPLETED', validationId, { vatAmountValidation }));
      
      // Step 5: Validate total amount calculation
      auditTrail.push(this.createAuditEntry('TOTAL_AMOUNT_VALIDATION_STARTED', validationId));
      const totalAmountValidation = validateGenericTotalAmount(
        input.totalAmount,
        input.subtotalExclVAT,
        input.vatAmount,
        VATValidator.VAT_ROUNDING_TOLERANCE,
        validationId
      );
      auditTrail.push(this.createAuditEntry('TOTAL_AMOUNT_VALIDATION_COMPLETED', validationId, { totalAmountValidation }));
      
      // Step 6: Validate VAT treatment applicability
      auditTrail.push(this.createAuditEntry('VAT_TREATMENT_VALIDATION_STARTED', validationId));
      const vatTreatmentValidation = validateSAVATTreatment(
        input.vatTreatment ?? 'TAXABLE_STANDARD',
        input.supplierCountry,
        input.supplierVATNumber,
        validationId
      );
      auditTrail.push(this.createAuditEntry('VAT_TREATMENT_VALIDATION_COMPLETED', validationId, { vatTreatmentValidation }));
      
      // Step 7: Validate reverse charge applicability
      auditTrail.push(this.createAuditEntry('REVERSE_CHARGE_VALIDATION_STARTED', validationId));
      const reverseChargeValidation = validateSAReverseCharge(
        input.reverseChargeType,
        input.supplierCountry,
        input.supplierVATNumber,
        validationId
      );
      auditTrail.push(this.createAuditEntry('REVERSE_CHARGE_VALIDATION_COMPLETED', validationId, { reverseChargeValidation }));
      
      // Step 8: Validate tax invoice requirements per SARS Section 20
      auditTrail.push(this.createAuditEntry('TAX_INVOICE_VALIDATION_STARTED', validationId));
      const taxInvoiceValidation = validateSATaxInvoice(input, validationId);
      auditTrail.push(this.createAuditEntry('TAX_INVOICE_VALIDATION_COMPLETED', validationId, { taxInvoiceValidation }));
      
      // Step 9: Determine overall compliance status
      auditTrail.push(this.createAuditEntry('COMPLIANCE_STATUS_DETERMINATION_STARTED', validationId));
      const complianceStatus = this.determineComplianceStatus(
        vatNumberValidation,
        vatAmountValidation,
        totalAmountValidation,
        vatTreatmentValidation,
        reverseChargeValidation,
        taxInvoiceValidation,
        validationId
      );
      auditTrail.push(this.createAuditEntry('COMPLIANCE_STATUS_DETERMINATION_COMPLETED', validationId, { complianceStatus }));
      
      // Step 10: Generate validation errors, warnings, and suggestions
      auditTrail.push(this.createAuditEntry('VALIDATION_ISSUE_GENERATION_STARTED', validationId));
      const { errors, warnings, suggestions } = this.generateValidationIssues(
        vatNumberValidation,
        vatAmountValidation,
        totalAmountValidation,
        vatTreatmentValidation,
        reverseChargeValidation,
        taxInvoiceValidation,
        complianceStatus,
        validationId
      );
      auditTrail.push(this.createAuditEntry('VALIDATION_ISSUE_GENERATION_COMPLETED', validationId, { errors, warnings, suggestions }));
      
      // Step 11: Create comprehensive validation result
      const validationResult: VATValidationResult = {
        validationId,
        validationTimestamp: new Date(),
        inputHash: this.generateInputHash(input),
        complianceStatus,
        vatCalculation,
        vatNumberValidation,
        vatAmountValidation,
        totalAmountValidation,
        vatTreatmentValidation,
        reverseChargeValidation,
        taxInvoiceValidation,
        errors,
        warnings,
        suggestions,
        auditTrail,
        metadata: {
          validationId,
          validationStartTime: new Date(validationStartTime),
          validationEndTime: new Date(),
          validationDurationMs: Date.now() - validationStartTime,
          sarsRegulations: VAT_REGULATIONS,
          sarsNotices: VAT_SARS_NOTICES,
          legislationReferences: VAT_LEGISLATION_REFERENCES,
          caseLawReferences: VAT_CASE_LAW_REFERENCES,
          rulingReferences: VAT_RULING_REFERENCES,
          guidanceReferences: VAT_GUIDANCE_REFERENCES,
          industryPracticeReferences: VAT_INDUSTRY_PRACTICE_REFERENCES,
          internationalStandardReferences: VAT_INTERNATIONAL_STANDARD_REFERENCES
        }
      };
      
      // Step 12: Log successful validation
      this.logValidationSuccess(validationResult, validationStartTime, Date.now());
      
      return validationResult;
      
    } catch (error) {
      // Log validation failure
      this.logValidationFailure(
        validationId,
        input,
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error.stack : undefined,
        validationStartTime,
        Date.now()
      );
      
      // Return failure result
      return this.createFailureResult(
        validationId,
        input,
        error instanceof Error ? error.message : 'Unknown validation error',
        Date.now() - validationStartTime,
        auditTrail
      );
    }
  }

  /**
   * Validate input data quality and completeness
   */
  private validateInput(input: VATValidationInput, validationId: string): void {
    if (!input.subtotalExclVAT || input.subtotalExclVAT <= 0) {
      throw new VATValidationException('INVALID_SUBTOTAL', 'Subtotal must be greater than zero', validationId);
    }
    
    if (!input.totalAmount || input.totalAmount <= 0) {
      throw new VATValidationException('INVALID_TOTAL', 'Total amount must be greater than zero', validationId);
    }
    
    if (input.vatRate && (input.vatRate < 0 || input.vatRate > 1)) {
      throw new VATValidationException('INVALID_VAT_RATE', 'VAT rate must be between 0 and 1', validationId);
    }
    
    if (input.supplierVATNumber && !VATValidator.VAT_NUMBER_PATTERN.test(input.supplierVATNumber)) {
      throw new VATValidationException('INVALID_VAT_NUMBER', 'VAT number must be 10 digits starting with 4', validationId);
    }
  }

  /**
   * Calculate VAT amount with SA-specific rules and R0.50 tolerance
   */
  private calculateVAT(
    subtotalExclVAT: number,
    vatRate: number,
    vatTreatment: VATTreatmentType,
    validationId: string
  ): VATCalculationResult {
    // Determine applicable VAT rate based on treatment
    const applicableRate = VATValidator.VAT_RATES[VATValidator.VAT_TREATMENTS[vatTreatment] ?? 'STANDARD'];
    
    // Calculate VAT amount
    const vatAmount = subtotalExclVAT * applicableRate;
    
    // Apply SARS rounding rules (R0.50 tolerance)
    const roundedVatAmount = Math.round(vatAmount * 20) / 20; // Round to nearest 5 cents
    
    return {
      calculationId: `calc_${Date.now()}_${this.generateRandomString(8)}`,
      calculationTimestamp: new Date(),
      subtotalExclVAT,
      vatRate: applicableRate,
      vatAmount: roundedVatAmount,
      totalAmountInclVAT: subtotalExclVAT + roundedVatAmount,
      vatTreatment,
      applicableRate,
      roundingAdjustment: roundedVatAmount - vatAmount,
      roundingMethod: 'SARS_STANDARD',
      toleranceApplied: VATValidator.VAT_ROUNDING_TOLERANCE,
      metadata: { validationId }
    };
  }

  /**
   * Determine overall VAT compliance status
   */
  private determineComplianceStatus(
    vatNumberValidation: VATNumberValidationResult,
    vatAmountValidation: VATAmountValidationResult,
    totalAmountValidation: TotalAmountValidationResult,
    vatTreatmentValidation: VATTreatmentValidationResult,
    reverseChargeValidation: VATReverseChargeValidationResult,
    taxInvoiceValidation: TaxInvoiceValidationResult,
    _validationId: string
  ): VATComplianceStatus {
    // Critical failures (blocking compliance)
    if (!vatNumberValidation.isValid && vatNumberValidation.errors.length > 0) return 'NON_COMPLIANT';
    if (!vatAmountValidation.isValid && vatAmountValidation.errors.length > 0) return 'NON_COMPLIANT';
    if (!totalAmountValidation.isValid && totalAmountValidation.errors.length > 0) return 'NON_COMPLIANT';
    if (!taxInvoiceValidation.isValid && taxInvoiceValidation.errors.length > 0) return 'NON_COMPLIANT';
    
    // Warnings only (compliant with notes)
    if (vatNumberValidation.warnings.length > 0 || 
        vatAmountValidation.warnings.length > 0 || 
        totalAmountValidation.warnings.length > 0 || 
        vatTreatmentValidation.warnings.length > 0 || 
        reverseChargeValidation.warnings.length > 0 || 
        taxInvoiceValidation.warnings.length > 0) {
      return 'COMPLIANT_WITH_NOTES';
    }
    
    // Fully compliant
    return 'COMPLIANT';
  }

  /**
   * Generate validation issues (errors, warnings, suggestions)
   */
  private generateValidationIssues(
    vatNumberValidation: VATNumberValidationResult,
    vatAmountValidation: VATAmountValidationResult,
    totalAmountValidation: TotalAmountValidationResult,
    vatTreatmentValidation: VATTreatmentValidationResult,
    reverseChargeValidation: VATReverseChargeValidationResult,
    taxInvoiceValidation: TaxInvoiceValidationResult,
    complianceStatus: VATComplianceStatus,
    _validationId: string
  ): { errors: VATValidationError[]; warnings: VATValidationWarning[]; suggestions: VATValidationSuggestion[] } {
    const errors: VATValidationError[] = [
      ...vatNumberValidation.errors,
      ...vatAmountValidation.errors,
      ...totalAmountValidation.errors,
      ...vatTreatmentValidation.errors,
      ...reverseChargeValidation.errors,
      ...taxInvoiceValidation.errors
    ];
    
    const warnings: VATValidationWarning[] = [
      ...vatNumberValidation.warnings,
      ...vatAmountValidation.warnings,
      ...totalAmountValidation.warnings,
      ...vatTreatmentValidation.warnings,
      ...reverseChargeValidation.warnings,
      ...taxInvoiceValidation.warnings
    ];
    
    const suggestions: VATValidationSuggestion[] = [];
    
    // Generate suggestions based on compliance status
    if (complianceStatus === 'NON_COMPLIANT') {
      suggestions.push({
        suggestionCode: 'CORRECT_VAT_CALCULATION',
        suggestionMessage: 'Correct VAT calculation to match SARS requirements',
        suggestionType: 'CORRECTION',
        impact: 'HIGH',
        implementationEffort: 'LOW',
        timestamp: new Date()
      });
    } else if (complianceStatus === 'COMPLIANT_WITH_NOTES') {
      suggestions.push({
        suggestionCode: 'ENHANCE_TAX_INVOICE',
        suggestionMessage: 'Enhance tax invoice with missing optional fields',
        suggestionType: 'IMPROVEMENT',
        impact: 'MEDIUM',
        implementationEffort: 'LOW',
        timestamp: new Date()
      });
    }
    
    return { errors, warnings, suggestions };
  }

  /**
   * Create audit trail entry
   */
  private createAuditEntry(
    eventType: string,
    validationId: string,
    metadata?: Record<string, unknown>
  ): VATAuditTrail {
    return {
      auditId: `vat_audit_${Date.now()}_${this.generateRandomString(8)}`,
      validationId,
      timestamp: new Date(),
      eventType,
      eventDescription: eventType.replace(/_/g, ' ').toLowerCase(),
      userId: 'system',
      ipAddress: '127.0.0.1',
      userAgent: 'CreditorFlow VAT Validator/3.8.4',
      metadata: metadata ?? {}
    };
  }

  /**
   * Generate random string for IDs
   */
  private generateRandomString(length: number): string {
    return Array.from({ length }, () => Math.floor(Math.random() * 36).toString(36)).join('');
  }

  /**
   * Generate hash for input normalization
   */
  private generateInputHash(input: VATValidationInput): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify({
      subtotalExclVAT: input.subtotalExclVAT,
      vatAmount: input.vatAmount,
      totalAmount: input.totalAmount,
      vatRate: input.vatRate,
      vatTreatment: input.vatTreatment,
      supplierVATNumber: input.supplierVATNumber,
      supplierCountry: input.supplierCountry,
      invoiceNumber: input.invoiceNumber,
      invoiceDate: input.invoiceDate
    }));
    return hash.digest('hex').substring(0, 32);
  }

  /**
   * Log successful validation
   */
  private logValidationSuccess(
    validationResult: VATValidationResult,
    startTime: number,
    endTime: number
  ): void {
    // Placeholder for audit logging
    console.log('VAT_VALIDATION_COMPLETED', {
      validationId: validationResult.validationId,
      complianceStatus: validationResult.complianceStatus,
      vatAmount: validationResult.vatCalculation.vatAmount,
      totalAmount: validationResult.vatCalculation.totalAmountInclVAT,
      validationDurationMs: endTime - startTime,
      errorCount: validationResult.errors.length,
      warningCount: validationResult.warnings.length
    });
  }

  /**
   * Log validation failure
   */
  private logValidationFailure(
    validationId: string,
    input: VATValidationInput,
    errorMessage: string,
    errorStack: string | undefined,
    startTime: number,
    endTime: number
  ): void {
    // Placeholder for audit logging
    console.log('VAT_VALIDATION_FAILED', {
      validationId,
      totalAmount: input.totalAmount,
      errorMessage,
      errorStack,
      validationDurationMs: endTime - startTime
    });
  }

  /**
   * Create failure result for error handling
   */
  private createFailureResult(
    validationId: string,
    input: VATValidationInput,
    errorMessage: string,
    durationMs: number,
    auditTrail: VATAuditTrail[]
  ): VATValidationResult {
    const now = new Date();
    const defaultValidationResult = {
      isValid: false,
      validationType: 'UNKNOWN',
      validationTimestamp: now,
      score: 0,
      confidence: 0.0,
      errors: [] as VATValidationError[],
      warnings: [] as VATValidationWarning[],
      metadata: { validationId }
    };

    return {
      validationId,
      validationTimestamp: now,
      inputHash: this.generateInputHash(input),
      complianceStatus: 'NON_COMPLIANT',
      vatCalculation: {
        calculationId: `calc_${Date.now()}_${this.generateRandomString(8)}`,
        calculationTimestamp: now,
        subtotalExclVAT: input.subtotalExclVAT,
        vatRate: VATValidator.VAT_RATE,
        vatAmount: input.subtotalExclVAT * VATValidator.VAT_RATE,
        totalAmountInclVAT: input.subtotalExclVAT * (1 + VATValidator.VAT_RATE),
        vatTreatment: input.vatTreatment ?? 'TAXABLE_STANDARD',
        applicableRate: VATValidator.VAT_RATE,
        roundingAdjustment: 0,
        roundingMethod: 'NONE',
        toleranceApplied: 0,
        metadata: { validationId }
      },
      vatNumberValidation: {
        ...defaultValidationResult,
        validationType: 'VAT_NUMBER',
        errors: [{
          field: 'system',
          errorCode: 'VALIDATION_FAILURE',
          errorMessage: `VAT validation failed: ${errorMessage}`,
          severity: 'CRITICAL',
          timestamp: now
        }]
      },
      vatAmountValidation: {
        ...defaultValidationResult,
        validationType: 'VAT_AMOUNT'
      },
      totalAmountValidation: {
        ...defaultValidationResult,
        validationType: 'TOTAL_AMOUNT'
      },
      vatTreatmentValidation: {
        ...defaultValidationResult,
        validationType: 'VAT_TREATMENT'
      },
      reverseChargeValidation: {
        ...defaultValidationResult,
        validationType: 'REVERSE_CHARGE'
      },
      taxInvoiceValidation: {
        ...defaultValidationResult,
        validationType: 'TAX_INVOICE'
      },
      errors: [{
        field: 'system',
        errorCode: 'VALIDATION_FAILURE',
        errorMessage: `VAT validation failed: ${errorMessage}`,
        severity: 'CRITICAL',
        timestamp: now
      }],
      warnings: [],
      suggestions: [{
        suggestionCode: 'SYSTEM_ERROR',
        suggestionMessage: 'VAT validation system error - manual review required',
        suggestionType: 'CORRECTION',
        impact: 'HIGH',
        implementationEffort: 'HIGH',
        timestamp: now
      }],
      auditTrail,
      metadata: {
        validationId,
        validationStartTime: new Date(Date.now() - durationMs),
        validationEndTime: now,
        validationDurationMs: durationMs,
        sarsRegulations: VAT_REGULATIONS,
        sarsNotices: VAT_SARS_NOTICES,
        legislationReferences: VAT_LEGISLATION_REFERENCES,
        caseLawReferences: VAT_CASE_LAW_REFERENCES,
        rulingReferences: VAT_RULING_REFERENCES,
        guidanceReferences: VAT_GUIDANCE_REFERENCES,
        industryPracticeReferences: VAT_INDUSTRY_PRACTICE_REFERENCES,
        internationalStandardReferences: VAT_INTERNATIONAL_STANDARD_REFERENCES
      }
    };
  }
}

export class VATValidationException extends Error {
  constructor(
    public code: string,
    public override message: string,
    public validationId: string,
    public metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'VATValidationException';
  }
}

export default VATValidator;
