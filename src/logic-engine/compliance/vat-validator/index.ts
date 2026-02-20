/**
 * CREDITORFLOW EMS - VAT VALIDATOR MODULE
 * Version: 3.8.4
 *
 * Main entry point for VAT validation functionality
 *
 * ENTERPRISE-GRADE VAT VALIDATION WITH:
 * - Multi-jurisdiction VAT compliance (SA primary focus)
 * - Reverse charge mechanism implementation
 * - Input/output VAT reconciliation engine
 * - VAT rate validation per SARS regulations
 * - Tax code validation against SARS master list
 * - Exemption certificate verification workflow
 * - Cross-border transaction handling (import/export VAT)
 * - VAT return preparation support (IT14SD format)
 * - SARS eFiling integration points
 * - Real-time VAT calculation with R0.50 tolerance
 * - Audit trail for all VAT determinations
 * - Zero-rating and exemption handling
 * - Bad debt relief calculation
 * - VAT apportionment for mixed supplies
 * - Capital goods scheme tracking
 * - Deemed supply calculations
 * - VAT grouping validation
 * - Transfer pricing VAT implications
 * - Customs duty interaction
 * - Excise duty interaction
 * - Fuel levy interaction
 */

// Core validator
export { VATValidator, VATValidationException } from "./core";

// Types
export type {
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
  VATRateType,
  VATTreatmentType,
  VATExemptionType,
  VATZeroRatingType,
  VATReverseChargeType,
  VATBadDebtReliefType,
  VATApportionmentType,
  VATCapitalGoodsSchemeType,
  VATDeemedSupplyType,
  VATGroupingType,
  VATTransferPricingType,
  VATCustomsDutyType,
  VATExciseDutyType,
  VATFuelLevyType,
  VATRegulationReference,
  VATSARSNotice,
  VATLegislationReference,
  VATCaseLawReference,
  VATRulingReference,
  VATGuidanceReference,
  VATIndustryPracticeReference,
  VATInternationalStandardReference,
  VATCheckResult,
} from "./types";

// Constants
export {
  VAT_RATE,
  VAT_ROUNDING_TOLERANCE,
  VAT_NUMBER_PATTERN,
  VAT_RATES,
  VAT_TREATMENTS,
  VAT_EXEMPTIONS,
  VAT_ZERO_RATINGS,
  VAT_REVERSE_CHARGE_SCENARIOS,
  VAT_BAD_DEBT_RELIEF_SCENARIOS,
  VAT_APPORTIONMENT_METHODS,
  VAT_CAPITAL_GOODS_SCHEME_SCENARIOS,
  VAT_DEEMED_SUPPLY_SCENARIOS,
  VAT_GROUPING_SCENARIOS,
  VAT_TRANSFER_PRICING_SCENARIOS,
  VAT_CUSTOMS_DUTY_INTERACTIONS,
  VAT_EXCISE_DUTY_INTERACTIONS,
  VAT_FUEL_LEVY_INTERACTIONS,
  VAT_REGULATIONS,
  VAT_SARS_NOTICES,
  VAT_LEGISLATION_REFERENCES,
  VAT_CASE_LAW_REFERENCES,
  VAT_RULING_REFERENCES,
  VAT_GUIDANCE_REFERENCES,
  VAT_INDUSTRY_PRACTICE_REFERENCES,
  VAT_INTERNATIONAL_STANDARD_REFERENCES,
} from "./constants";

// Formatting utilities
export {
  normalizeVATNumber,
  formatSAVATNumber,
  formatVATNumberWithPrefix,
  extractCountryCode,
  isValidVATFormat,
  calculateSACheckDigit,
  validateSACheckDigit,
  sanitizeVATNumber,
  maskVATNumber,
} from "./formatting";

// Validators - South Africa
export {
  validateSAVATNumber,
  validateSAVATTreatment,
  validateSAReverseCharge,
  validateSATaxInvoice,
} from "./validators/sa";

// Validators - EU
export {
  validateEUVATNumber,
  calculateEUVAT,
  validateEUVATAmount,
  validateEUTotalAmount,
  validateEUTaxInvoice,
  EU_COUNTRY_CODES,
  EU_VAT_PATTERNS,
  EU_STANDARD_VAT_RATE,
  EU_VAT_RATES,
} from "./validators/eu";

// Validators - UK
export {
  validateUKVATNumber,
  validateUKModulus97,
  calculateUKVAT,
  validateUKVATAmount,
  validateUKTotalAmount,
  validateUKTaxInvoice,
  isNorthernIrelandVAT,
  UK_VAT_PATTERNS,
  UK_STANDARD_VAT_RATE,
  UK_VAT_RATES,
} from "./validators/uk";

// Validators - Generic
export {
  validateGenericVATNumber,
  validateGenericVATAmount,
  validateGenericTotalAmount,
  calculateGenericVAT,
  validateGenericTaxInvoice,
} from "./validators/generic";

// API Clients
export {
  validateSARSVATNumber,
  validateVATNumberViaAPI,
  batchValidateVATNumbers,
  DEFAULT_SARS_CONFIG,
  DEFAULT_VIES_CONFIG,
  DEFAULT_HMRC_CONFIG,
  type SARSAPIConfig,
  type VIESConfig,
  type HMRCConfig,
} from "./api-clients";

// Default export
export { VATValidator as default } from "./core";
