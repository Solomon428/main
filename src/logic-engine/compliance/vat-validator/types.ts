/**
 * CREDITORFLOW EMS - VAT VALIDATOR TYPES
 * Version: 3.8.4
 *
 * Type definitions and interfaces for VAT validation
 */

export type VATRateType =
  | "STANDARD"
  | "ZERO_RATED"
  | "EXEMPT"
  | "REDUCED"
  | "SPECIAL";

export type VATTreatmentType =
  | "TAXABLE_STANDARD"
  | "TAXABLE_ZERO_RATED"
  | "EXEMPT"
  | "OUT_OF_SCOPE";

export type VATExemptionType =
  | "FINANCIAL_SERVICES"
  | "RESIDENTIAL_ACCOMMODATION"
  | "PUBLIC_TRANSPORT"
  | "EDUCATIONAL_SERVICES"
  | "MEDICAL_SERVICES"
  | "WELFARE_SERVICES"
  | "FUNERAL_SERVICES"
  | "MUNICIPAL_SERVICES"
  | "EXPORTS_OF_GOODS"
  | "INTERNATIONAL_TRANSPORT"
  | "DIPLOMATIC_PRIVILEGE"
  | "OTHER_EXEMPTIONS";

export type VATZeroRatingType =
  | "EXPORTS_OF_GOODS"
  | "INTERNATIONAL_TRANSPORT"
  | "SHIP_SUPPLIES"
  | "AIRCRAFT_SUPPLIES"
  | "CERTAIN_FOODSTUFFS"
  | "CERTAIN_MEDICINES"
  | "FARMER_INPUTS"
  | "INTERNATIONAL_SERVICES"
  | "OTHER_ZERO_RATINGS";

export type VATReverseChargeType =
  | "IMPORTED_SERVICES"
  | "DIGITAL_SERVICES_FROM_NON_RESIDENTS"
  | "CONSTRUCTION_SERVICES"
  | "SECOND_HAND_GOODS"
  | "OTHER_REVERSE_CHARGE";

export type VATBadDebtReliefType =
  | "DEBT_WRITTEN_OFF"
  | "DEBT_MORE_THAN_12_MONTHS"
  | "DEBT_FROM_INSOLVENT_DEBTOR"
  | "OTHER_BAD_DEBT";

export type VATApportionmentType =
  | "TURNOVER_METHOD"
  | "FLOOR_AREA_METHOD"
  | "DIRECT_ALLOCATION_METHOD"
  | "OTHER_APPORTIONMENT";

export type VATCapitalGoodsSchemeType =
  | "COMMERCIAL_PROPERTY"
  | "RESIDENTIAL_PROPERTY"
  | "OTHER_CAPITAL_GOODS";

export type VATDeemedSupplyType =
  | "BUSINESS_ENTERTAINMENT"
  | "GIFTS_ABOVE_THRESHOLD"
  | "PRIVATE_USE_OF_BUSINESS_ASSETS"
  | "OTHER_DEEMED_SUPPLY";

export type VATGroupingType =
  | "CONTROLLED_GROUP"
  | "ASSOCIATED_ENTERPRISES"
  | "OTHER_GROUPING";

export type VATTransferPricingType =
  | "RELATED_PARTY_TRANSACTIONS"
  | "INTERNATIONAL_TRANSACTIONS"
  | "OTHER_TRANSFER_PRICING";

export type VATCustomsDutyType =
  | "IMPORTED_GOODS"
  | "EXCISE_GOODS"
  | "OTHER_CUSTOMS";

export type VATExciseDutyType = "ALCOHOL" | "TOBACCO" | "FUEL" | "OTHER_EXCISE";

export type VATFuelLevyType = "PETROL" | "DIESEL" | "OTHER_FUEL";

export type VATComplianceStatus =
  | "COMPLIANT"
  | "COMPLIANT_WITH_NOTES"
  | "NON_COMPLIANT";

export interface VATValidationError {
  field: string;
  errorCode: string;
  errorMessage: string;
  severity: "ERROR" | "CRITICAL" | "WARNING";
  timestamp: Date;
}

export interface VATValidationWarning {
  field: string;
  warningCode: string;
  warningMessage: string;
  severity: "WARNING" | "INFO";
  timestamp: Date;
}

export interface VATValidationSuggestion {
  suggestionCode: string;
  suggestionMessage: string;
  suggestionType: "CORRECTION" | "IMPROVEMENT";
  impact: "HIGH" | "MEDIUM" | "LOW";
  implementationEffort: "HIGH" | "MEDIUM" | "LOW";
  timestamp: Date;
}

export interface VATAuditTrail {
  auditId: string;
  validationId: string;
  timestamp: Date;
  eventType: string;
  eventDescription: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  metadata: Record<string, any>;
}

export interface VATValidationInput {
  subtotalExclVAT: number;
  vatAmount?: number;
  totalAmount: number;
  vatRate?: number;
  vatTreatment?: VATTreatmentType;
  supplierVATNumber?: string;
  supplierCountry?: string;
  supplierName?: string;
  supplierAddress?: string;
  invoiceNumber?: string;
  invoiceDate?: Date;
  reverseChargeType?: VATReverseChargeType;
}

export interface VATCalculationResult {
  calculationId: string;
  calculationTimestamp: Date;
  subtotalExclVAT: number;
  vatRate: number;
  vatAmount: number;
  totalAmountInclVAT: number;
  vatTreatment: VATTreatmentType;
  applicableRate: number;
  roundingAdjustment: number;
  roundingMethod: string;
  toleranceApplied: number;
  metadata: Record<string, any>;
}

export interface VATRegulationReference {
  regulation: string;
  section: string;
  description: string;
}

export interface VATSARSNotice {
  notice: string;
  title: string;
  effectiveDate: Date;
}

export interface VATLegislationReference {
  act: string;
  section: string;
  description: string;
}

export interface VATCaseLawReference {
  case: string;
  year: number;
  court: string;
  principle: string;
}

export interface VATRulingReference {
  ruling: string;
  year: number;
  topic: string;
}

export interface VATGuidanceReference {
  guidance: string;
  title: string;
  issueDate: Date;
}

export interface VATIndustryPracticeReference {
  practice: string;
  version: string;
  publisher: string;
}

export interface VATInternationalStandardReference {
  standard: string;
  version: string;
  chapter: string;
  topic: string;
}

export interface VATValidationResult {
  validationId: string;
  validationTimestamp: Date;
  inputHash: string;
  complianceStatus: VATComplianceStatus;
  vatCalculation: VATCalculationResult;
  vatNumberValidation: VATNumberValidationResult;
  vatAmountValidation: VATAmountValidationResult;
  totalAmountValidation: TotalAmountValidationResult;
  vatTreatmentValidation: VATTreatmentValidationResult;
  reverseChargeValidation: VATReverseChargeValidationResult;
  taxInvoiceValidation: TaxInvoiceValidationResult;
  errors: VATValidationError[];
  warnings: VATValidationWarning[];
  suggestions: VATValidationSuggestion[];
  auditTrail: VATAuditTrail[];
  metadata: {
    validationId: string;
    validationStartTime: Date;
    validationEndTime: Date;
    validationDurationMs: number;
    sarsRegulations: VATRegulationReference[];
    sarsNotices: VATSARSNotice[];
    legislationReferences: VATLegislationReference[];
    caseLawReferences: VATCaseLawReference[];
    rulingReferences: VATRulingReference[];
    guidanceReferences: VATGuidanceReference[];
    industryPracticeReferences: VATIndustryPracticeReference[];
    internationalStandardReferences: VATInternationalStandardReference[];
  };
}

export interface VATValidationContext {
  businessType?: string;
  industry?: string;
  transactionType?: string;
  riskProfile?: "LOW" | "MEDIUM" | "HIGH";
  previousValidations?: string[];
}

export interface VATNumberValidationResult {
  isValid: boolean;
  validationType: string;
  validationTimestamp: Date;
  score: number;
  confidence: number;
  errors: VATValidationError[];
  warnings: VATValidationWarning[];
  metadata: Record<string, any>;
}

export interface VATAmountValidationResult {
  isValid: boolean;
  validationType: string;
  validationTimestamp: Date;
  score: number;
  confidence: number;
  errors: VATValidationError[];
  warnings: VATValidationWarning[];
  metadata: Record<string, any>;
}

export interface TotalAmountValidationResult {
  isValid: boolean;
  validationType: string;
  validationTimestamp: Date;
  score: number;
  confidence: number;
  errors: VATValidationError[];
  warnings: VATValidationWarning[];
  metadata: Record<string, any>;
}

export interface VATTreatmentValidationResult {
  isValid: boolean;
  validationType: string;
  validationTimestamp: Date;
  score: number;
  confidence: number;
  errors: VATValidationError[];
  warnings: VATValidationWarning[];
  metadata: Record<string, any>;
}

export interface VATReverseChargeValidationResult {
  isValid: boolean;
  validationType: string;
  validationTimestamp: Date;
  score: number;
  confidence: number;
  errors: VATValidationError[];
  warnings: VATValidationWarning[];
  metadata: Record<string, any>;
}

export interface TaxInvoiceValidationResult {
  isValid: boolean;
  validationType: string;
  validationTimestamp: Date;
  score: number;
  confidence: number;
  errors: VATValidationError[];
  warnings: VATValidationWarning[];
  metadata: Record<string, any>;
}

export interface VATCheckResult {
  isValid: boolean;
  countryCode: string;
  vatNumber: string;
  normalizedNumber: string;
  errors: string[];
  warnings: string[];
}
