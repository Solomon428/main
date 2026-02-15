import { Decimal } from 'decimal.js';
import { Currency } from '../../../../domain/enums/Currency';
import type { ExtractionConfig } from './types';

export const DEFAULT_CONFIDENCE_THRESHOLD = 70;

export const DEFAULT_DATE_FORMATS = [
  'dd/MM/yyyy',
  'MM/dd/yyyy',
  'yyyy-MM-dd',
  'dd-MM-yyyy',
  'MM-dd-yyyy',
  'yyyy/MM/dd',
  'dd.MM.yyyy',
  'MM.dd.yyyy'
];

export const DEFAULT_CURRENCY_SYMBOLS: Record<string, Currency> = {
  '$': Currency.USD,
  '€': Currency.EUR,
  '£': Currency.GBP,
  '¥': Currency.JPY,
  '₹': Currency.INR,
  'R': Currency.ZAR,
  'C$': Currency.CAD,
  'A$': Currency.AUD,
};

export const DEFAULT_CURRENCY = Currency.USD;
export const DEFAULT_TAX_RATE = new Decimal('0.15');
export const DEFAULT_LANGUAGE = 'en';

export const DEFAULT_REGEX_PATTERNS = {
  invoiceNumber: [
    /invoice\s*(?:no|number|#)?\s*[:#]?\s*([A-Z0-9\-_\/]+)/i,
    /(?:invoice|inv)\.?\s*([A-Z0-9\-_\/]+)/i,
    /(?:#|no\.?)\s*([A-Z0-9\-_\/]+)/i
  ],
  date: [
    /(?:date|issued|invoice date)\s*[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/,
    /(?:due\s*date)\s*[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i
  ],
  amount: [
    /(?:total|amount|balance|grand total)\s*[:\s]*([$€£¥₹]\s*\d+[\.,]\d{2}|\d+[\.,]\d{2}\s*[$€£¥₹])/i,
    /(?:subtotal|sub-total)\s*[:\s]*([$€£¥₹]\s*\d+[\.,]\d{2}|\d+[\.,]\d{2}\s*[$€£¥₹])/i,
    /(?:tax|vat|gst)\s*[:\s]*([$€£¥₹]\s*\d+[\.,]\d{2}|\d+[\.,]\d{2}\s*[$€£¥₹])/i
  ],
  vatNumber: [
    /(?:vat|gst|tax)\s*(?:id|number|no|#)?\s*[:\s]*([A-Z0-9\-]+)/i,
    /(?:registration\s*number)\s*[:\s]*([A-Z0-9\-]+)/i
  ],
  email: [
    /[\w\.-]+@[\w\.-]+\.\w+/i
  ],
  phone: [
    /(?:\+?\d{1,3}[\s\-]?)?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{4}/,
    /\d{3}[\-\.]\d{3}[\-\.]\d{4}/
  ],
  lineItem: [
    /(\d+)\s+(.+?)\s+(\d+[\.,]\d{2})\s+(\d+[\.,]\d{2})\s+(\d+[\.,]\d{2})/,
    /(.+?)\s+(\d+)\s+(\d+[\.,]\d{2})\s+(\d+[\.,]\d{2})/,
    /(\d+)\.\s+(.+?)\s+(\d+[\.,]\d{2})\s+(\d+[\.,]\d{2})/
  ]
};

export function createDefaultConfig(partialConfig?: Partial<ExtractionConfig>): ExtractionConfig {
  return {
    confidenceThreshold: partialConfig?.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD,
    dateFormats: partialConfig?.dateFormats ?? DEFAULT_DATE_FORMATS,
    currencySymbols: partialConfig?.currencySymbols ?? DEFAULT_CURRENCY_SYMBOLS,
    defaultCurrency: partialConfig?.defaultCurrency ?? DEFAULT_CURRENCY,
    defaultTaxRate: partialConfig?.defaultTaxRate
      ? new Decimal(partialConfig.defaultTaxRate.toString())
      : DEFAULT_TAX_RATE,
    language: partialConfig?.language ?? DEFAULT_LANGUAGE,
    useMachineLearning: partialConfig?.useMachineLearning ?? false,
    mlModelPath: partialConfig?.mlModelPath,
    regexPatterns: partialConfig?.regexPatterns ?? DEFAULT_REGEX_PATTERNS
  };
}

export const CONFIDENCE_WEIGHTS = {
  invoiceNumber: 20,
  dates: 15,
  amounts: 25,
  lineItems: 30,
  validation: 10
};

export const EXTRACTION_METHOD_MULTIPLIERS: Record<string, number> = {
  'ml': 1.1,
  'hybrid': 1.05,
  'regex': 1.0,
  'manual': 1.0
};
