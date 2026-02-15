// Extraction Module - Main Exports

// Types
export type {
  ExtractedInvoiceData,
  ExtractedLineItem,
  ExtractionConfig,
  ExtractionResult,
  ExtractionProgress
} from './types';

export {
  ExtractionServiceError,
  ExtractionValidationError,
  ExtractionParsingError,
  ExtractionEnrichmentError
} from './types';

// Constants
export {
  DEFAULT_CONFIDENCE_THRESHOLD,
  DEFAULT_DATE_FORMATS,
  DEFAULT_CURRENCY_SYMBOLS,
  DEFAULT_CURRENCY,
  DEFAULT_TAX_RATE,
  DEFAULT_LANGUAGE,
  DEFAULT_REGEX_PATTERNS,
  CONFIDENCE_WEIGHTS,
  EXTRACTION_METHOD_MULTIPLIERS,
  createDefaultConfig
} from './constants';

// Core Service
export { ExtractionService } from './core';
export { ExtractionService as default } from './core';

// Extractors
export { validateExtractedData } from './extractors/invoice-extractor';
export { extractWithRegexInternal as extractWithRegex, extractLineItems } from './extractors/table-extractor';
export {
  parseDateString,
  parseAmountString,
  extractSupplierName,
  calculateMissingAmounts
} from './extractors/field-extractor';

// Parsers
export {
  createValidationSchemas,
  normalizeText,
  extractSection,
  findLinesContaining,
  extractValueAfterLabel,
  extractAmountsFromText,
  extractDatesFromText,
  mergeLineItems,
  sanitizeExtractedText,
  parseNumber
} from './parsers';

// Confidence
export {
  calculateOverallConfidence,
  calculateLineItemConfidence,
  getConfidenceLevel,
  isConfidenceAcceptable
} from './confidence';
