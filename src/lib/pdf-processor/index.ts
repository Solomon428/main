/**
 * PDF Processor Module
 * Enterprise-grade PDF processing with multi-engine OCR support
 * 
 * @module pdf-processor
 * @version 4.3.2
 */

// Core exports
export { PDFProcessor, pdfProcessor } from './core';

// Re-export PDFExtractor to support wrapper-based migration
export { PDFExtractor } from './pdf-extractor';

// Type exports
export * from './types';

// Constants
export * from './constants';

// Do not re-export utilities here to avoid cross-module coupling.

// Data extractors
export {
  extractInvoiceNumber,
  extractInvoiceDate,
  extractSupplierVAT,
  extractTotalAmount,
  extractSubtotalExclVAT,
  extractVATAmount,
  extractSupplierName,
  extractDueDate,
  extractLineItems
} from './data-extractors';

// Extraction engines
export {
  extractWithTesseractOCR,
  extractWithAzureOCR,
  extractWithGoogleOCR,
  extractWithAmazonOCR,
  extractWithOllamaOCR
} from './extraction-engines';

// Extraction logic
export {
  analyzeDocumentQuality,
  determineExtractionMethod,
  performExtraction,
  extractWithNativePDF
} from './extraction';

// Data structuring
export { structureExtractedData } from './structuring';

// Validation
export {
  performComprehensiveValidation,
  calculateQualityScores
} from './validation';

// Insights
export {
  generateProcessingInsights,
  createFailureResult
} from './insights';
