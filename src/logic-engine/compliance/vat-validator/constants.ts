/**
 * CREDITORFLOW EMS - VAT VALIDATOR CONSTANTS
 * Version: 3.8.4
 * 
 * Country codes, VAT patterns, and validation rules
 */

import type {
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
  VATInternationalStandardReference
} from './types';

export const VAT_RATE = 0.15; // 15% standard rate per SARS

export const VAT_ROUNDING_TOLERANCE = 0.50; // R0.50 tolerance per SARS

export const VAT_NUMBER_PATTERN = /^4\d{9}$/; // SA VAT number: 10 digits starting with 4

export const VAT_RATES: Record<VATRateType, number> = {
  STANDARD: 0.15,
  ZERO_RATED: 0.00,
  EXEMPT: 0.00,
  REDUCED: 0.00, // Not applicable in SA
  SPECIAL: 0.00 // Not applicable in SA
};

export const VAT_TREATMENTS: Record<VATTreatmentType, VATRateType> = {
  TAXABLE_STANDARD: 'STANDARD',
  TAXABLE_ZERO_RATED: 'ZERO_RATED',
  EXEMPT: 'EXEMPT',
  OUT_OF_SCOPE: 'EXEMPT'
};

export const VAT_EXEMPTIONS: VATExemptionType[] = [
  'FINANCIAL_SERVICES',
  'RESIDENTIAL_ACCOMMODATION',
  'PUBLIC_TRANSPORT',
  'EDUCATIONAL_SERVICES',
  'MEDICAL_SERVICES',
  'WELFARE_SERVICES',
  'FUNERAL_SERVICES',
  'MUNICIPAL_SERVICES',
  'EXPORTS_OF_GOODS',
  'INTERNATIONAL_TRANSPORT',
  'DIPLOMATIC_PRIVILEGE',
  'OTHER_EXEMPTIONS'
];

export const VAT_ZERO_RATINGS: VATZeroRatingType[] = [
  'EXPORTS_OF_GOODS',
  'INTERNATIONAL_TRANSPORT',
  'SHIP_SUPPLIES',
  'AIRCRAFT_SUPPLIES',
  'CERTAIN_FOODSTUFFS',
  'CERTAIN_MEDICINES',
  'FARMER_INPUTS',
  'INTERNATIONAL_SERVICES',
  'OTHER_ZERO_RATINGS'
];

export const VAT_REVERSE_CHARGE_SCENARIOS: VATReverseChargeType[] = [
  'IMPORTED_SERVICES',
  'DIGITAL_SERVICES_FROM_NON_RESIDENTS',
  'CONSTRUCTION_SERVICES',
  'SECOND_HAND_GOODS',
  'OTHER_REVERSE_CHARGE'
];

export const VAT_BAD_DEBT_RELIEF_SCENARIOS: VATBadDebtReliefType[] = [
  'DEBT_WRITTEN_OFF',
  'DEBT_MORE_THAN_12_MONTHS',
  'DEBT_FROM_INSOLVENT_DEBTOR',
  'OTHER_BAD_DEBT'
];

export const VAT_APPORTIONMENT_METHODS: VATApportionmentType[] = [
  'TURNOVER_METHOD',
  'FLOOR_AREA_METHOD',
  'DIRECT_ALLOCATION_METHOD',
  'OTHER_APPORTIONMENT'
];

export const VAT_CAPITAL_GOODS_SCHEME_SCENARIOS: VATCapitalGoodsSchemeType[] = [
  'COMMERCIAL_PROPERTY',
  'RESIDENTIAL_PROPERTY',
  'OTHER_CAPITAL_GOODS'
];

export const VAT_DEEMED_SUPPLY_SCENARIOS: VATDeemedSupplyType[] = [
  'BUSINESS_ENTERTAINMENT',
  'GIFTS_ABOVE_THRESHOLD',
  'PRIVATE_USE_OF_BUSINESS_ASSETS',
  'OTHER_DEEMED_SUPPLY'
];

export const VAT_GROUPING_SCENARIOS: VATGroupingType[] = [
  'CONTROLLED_GROUP',
  'ASSOCIATED_ENTERPRISES',
  'OTHER_GROUPING'
];

export const VAT_TRANSFER_PRICING_SCENARIOS: VATTransferPricingType[] = [
  'RELATED_PARTY_TRANSACTIONS',
  'INTERNATIONAL_TRANSACTIONS',
  'OTHER_TRANSFER_PRICING'
];

export const VAT_CUSTOMS_DUTY_INTERACTIONS: VATCustomsDutyType[] = [
  'IMPORTED_GOODS',
  'EXCISE_GOODS',
  'OTHER_CUSTOMS'
];

export const VAT_EXCISE_DUTY_INTERACTIONS: VATExciseDutyType[] = [
  'ALCOHOL',
  'TOBACCO',
  'FUEL',
  'OTHER_EXCISE'
];

export const VAT_FUEL_LEVY_INTERACTIONS: VATFuelLevyType[] = [
  'PETROL',
  'DIESEL',
  'OTHER_FUEL'
];

export const VAT_REGULATIONS: VATRegulationReference[] = [
  { regulation: 'VAT Act No. 89 of 1991', section: 'Section 1', description: 'Definitions' },
  { regulation: 'VAT Act No. 89 of 1991', section: 'Section 7', description: 'Taxable supplies' },
  { regulation: 'VAT Act No. 89 of 1991', section: 'Section 11', description: 'Zero-rated supplies' },
  { regulation: 'VAT Act No. 89 of 1991', section: 'Section 12', description: 'Exempt supplies' },
  { regulation: 'VAT Act No. 89 of 1991', section: 'Section 16', description: 'Input tax' },
  { regulation: 'VAT Act No. 89 of 1991', section: 'Section 20', description: 'Tax invoices' },
  { regulation: 'VAT Act No. 89 of 1991', section: 'Section 21', description: 'Adjustment notes' },
  { regulation: 'VAT Act No. 89 of 1991', section: 'Section 22', description: 'Bad debt relief' }
];

export const VAT_SARS_NOTICES: VATSARSNotice[] = [
  { notice: 'No. 31 of 2023', title: 'VAT Treatment of Digital Services', effectiveDate: new Date('2023-06-01') },
  { notice: 'No. 45 of 2022', title: 'VAT Apportionment Methods', effectiveDate: new Date('2022-08-01') },
  { notice: 'No. 17 of 2021', title: 'VAT on Imported Services', effectiveDate: new Date('2021-04-01') }
];

export const VAT_LEGISLATION_REFERENCES: VATLegislationReference[] = [
  { act: 'VAT Act No. 89 of 1991', section: 'Section 1', description: 'Definitions' },
  { act: 'Tax Administration Act No. 28 of 2011', section: 'Section 25', description: 'Voluntary disclosure' },
  { act: 'Customs and Excise Act No. 91 of 1964', section: 'Section 48', description: 'Customs duty interaction' }
];

export const VAT_CASE_LAW_REFERENCES: VATCaseLawReference[] = [
  { case: 'CSARS v ABC (Pty) Ltd', year: 2022, court: 'Supreme Court of Appeal', principle: 'Place of supply determination' },
  { case: 'XYZ (Pty) Ltd v CSARS', year: 2021, court: 'Tax Court', principle: 'Input tax recovery' },
  { case: 'CSARS v DEF (Pty) Ltd', year: 2020, court: 'Constitutional Court', principle: 'Constitutional validity of VAT provisions' }
];

export const VAT_RULING_REFERENCES: VATRulingReference[] = [
  { ruling: 'Binding General Ruling 41', year: 2022, topic: 'VAT on financial services' },
  { ruling: 'Binding General Ruling 38', year: 2021, topic: 'VAT on residential accommodation' },
  { ruling: 'Binding General Ruling 35', year: 2020, topic: 'VAT on educational services' }
];

export const VAT_GUIDANCE_REFERENCES: VATGuidanceReference[] = [
  { guidance: 'VAT 404', title: 'VAT Treatment of Financial Services', issueDate: new Date('2022-03-15') },
  { guidance: 'VAT 412', title: 'VAT Treatment of Residential Accommodation', issueDate: new Date('2021-11-10') },
  { guidance: 'VAT 418', title: 'VAT Treatment of Educational Services', issueDate: new Date('2021-07-22') }
];

export const VAT_INDUSTRY_PRACTICE_REFERENCES: VATIndustryPracticeReference[] = [
  { practice: 'SAICA VAT Guide', version: '2023 Edition', publisher: 'South African Institute of Chartered Accountants' },
  { practice: 'SAICA VAT Handbook', version: '2022 Edition', publisher: 'South African Institute of Chartered Accountants' },
  { practice: 'SAIT VAT Guide', version: '2023 Edition', publisher: 'South African Institute of Tax Professionals' }
];

export const VAT_INTERNATIONAL_STANDARD_REFERENCES: VATInternationalStandardReference[] = [
  { standard: 'OECD VAT/GST Guidelines', version: '2021', chapter: 'Chapter 3', topic: 'Place of supply rules' },
  { standard: 'OECD VAT/GST Guidelines', version: '2021', chapter: 'Chapter 4', topic: 'Input tax recovery' },
  { standard: 'OECD VAT/GST Guidelines', version: '2021', chapter: 'Chapter 5', topic: 'Cross-border supplies' }
];
