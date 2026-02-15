/**
 * Currency Types
 * CreditorFlow Enterprise Invoice Management System
 */

export type SupportedCurrency =
  | 'ZAR'
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'AUD'
  | 'CAD'
  | 'CHF'
  | 'CNY'
  | 'JPY'
  | 'KES'
  | 'NGN'
  | 'EGP'
  | 'AED'
  | 'SGD'
  | 'HKD'
  | 'SEK'
  | 'NOK'
  | 'DKK'
  | 'NZD'
  | 'MXN'
  | 'THB'
  | 'MYR'
  | 'INR'
  | 'BWP';

export interface ExchangeRate {
  from: SupportedCurrency;
  to: SupportedCurrency;
  rate: number;
  timestamp: Date;
  source: string;
}

export interface ConversionResult {
  originalAmount: number;
  originalCurrency: SupportedCurrency;
  convertedAmount: number;
  targetCurrency: SupportedCurrency;
  rate: number;
  timestamp: Date;
}

export interface CurrencyExposure {
  currency: SupportedCurrency;
  totalAmount: number;
  invoiceCount: number;
  percentageOfTotal: number;
  zarEquivalent: number;
}

export interface ExposureReport {
  baseCurrency: SupportedCurrency;
  totalExposure: number;
  exposures: CurrencyExposure[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  recommendations: string[];
  generatedAt: Date;
}

export interface CurrencyConfig {
  symbol: string;
  name: string;
  decimals: number;
  locale: string;
}

export const CURRENCY_CONFIG: Record<SupportedCurrency, CurrencyConfig> = {
  ZAR: {
    symbol: 'R',
    name: 'South African Rand',
    decimals: 2,
    locale: 'en-ZA',
  },
  USD: { symbol: '$', name: 'US Dollar', decimals: 2, locale: 'en-US' },
  EUR: { symbol: '€', name: 'Euro', decimals: 2, locale: 'de-DE' },
  GBP: { symbol: '£', name: 'British Pound', decimals: 2, locale: 'en-GB' },
  AUD: {
    symbol: 'A$',
    name: 'Australian Dollar',
    decimals: 2,
    locale: 'en-AU',
  },
  CAD: { symbol: 'C$', name: 'Canadian Dollar', decimals: 2, locale: 'en-CA' },
  CHF: { symbol: 'CHF', name: 'Swiss Franc', decimals: 2, locale: 'de-CH' },
  CNY: { symbol: '¥', name: 'Chinese Yuan', decimals: 2, locale: 'zh-CN' },
  JPY: { symbol: '¥', name: 'Japanese Yen', decimals: 0, locale: 'ja-JP' },
  KES: { symbol: 'KSh', name: 'Kenyan Shilling', decimals: 2, locale: 'en-KE' },
  NGN: { symbol: '₦', name: 'Nigerian Naira', decimals: 2, locale: 'en-NG' },
  EGP: { symbol: 'E£', name: 'Egyptian Pound', decimals: 2, locale: 'ar-EG' },
  AED: { symbol: 'د.إ', name: 'UAE Dirham', decimals: 2, locale: 'ar-AE' },
  SGD: { symbol: 'S$', name: 'Singapore Dollar', decimals: 2, locale: 'en-SG' },
  HKD: {
    symbol: 'HK$',
    name: 'Hong Kong Dollar',
    decimals: 2,
    locale: 'zh-HK',
  },
  SEK: { symbol: 'kr', name: 'Swedish Krona', decimals: 2, locale: 'sv-SE' },
  NOK: { symbol: 'kr', name: 'Norwegian Krone', decimals: 2, locale: 'nb-NO' },
  DKK: { symbol: 'kr', name: 'Danish Krone', decimals: 2, locale: 'da-DK' },
  NZD: {
    symbol: 'NZ$',
    name: 'New Zealand Dollar',
    decimals: 2,
    locale: 'en-NZ',
  },
  MXN: { symbol: 'Mex$', name: 'Mexican Peso', decimals: 2, locale: 'es-MX' },
  THB: { symbol: '฿', name: 'Thai Baht', decimals: 2, locale: 'th-TH' },
  MYR: {
    symbol: 'RM',
    name: 'Malaysian Ringgit',
    decimals: 2,
    locale: 'ms-MY',
  },
  INR: { symbol: '₹', name: 'Indian Rupee', decimals: 2, locale: 'en-IN' },
  BWP: { symbol: 'P', name: 'Botswana Pula', decimals: 2, locale: 'en-BW' },
};
