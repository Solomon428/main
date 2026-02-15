import type { PSM, OEM } from 'tesseract.js';
import type { OcrConfig } from './types';

export const DEFAULT_OCR_CONFIG: Partial<OcrConfig> = {
  provider: 'tesseract',
  language: 'eng',
  pageSegmentationMode: 3 as unknown as PSM, // PSM.AUTO
  ocrEngineMode: 3 as unknown as OEM, // OEM.DEFAULT
  confidenceThreshold: 70,
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedMimeTypes: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/tiff',
    'image/bmp',
    'image/webp'
  ],
  timeout: 300000, // 5 minutes
  retryAttempts: 3
};

export const TIMEOUTS = {
  DEFAULT: 300000, // 5 minutes
  SHORT: 60000, // 1 minute
  LONG: 600000, // 10 minutes
  PDF_CONVERSION: 120000, // 2 minutes
  IMAGE_PREPROCESSING: 30000, // 30 seconds
  ENGINE_INIT: 60000, // 1 minute
} as const;

export const QUALITY_THRESHOLDS = {
  MIN_CONFIDENCE: 70,
  GOOD_CONFIDENCE: 85,
  EXCELLENT_CONFIDENCE: 95,
  MIN_CHARACTER_COUNT: 10,
  MIN_WORD_COUNT: 10,
  MIN_LINE_COUNT: 3,
  MAX_NON_ALPHANUMERIC_RATIO: 0.3,
  IDEAL_WORD_LENGTH_MIN: 3,
  IDEAL_WORD_LENGTH_MAX: 10,
  VALIDATION_SCORE_MIN: 50,
} as const;

export const IMAGE_CONSTRAINTS = {
  MAX_DIMENSION: 4000,
  MIN_DPI: 72,
  TARGET_DPI: 300,
  OPTIMAL_DPI: 200,
  MAX_FILE_SIZE_MB: 50,
} as const;

export const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.tiff',
  '.tif',
  '.bmp',
  '.webp'
] as const;

export const PREPROCESSING_DEFAULTS = {
  GRAYSCALE: true,
  CONTRAST_ALPHA: 1.2,
  CONTRAST_BETA: -0.1,
  MEDIAN_FILTER_SIZE: 3,
  SHARPEN: true,
  DENSITY_MIN: 200,
} as const;

export const TESSERACT_WHITELIST = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,$-/:()€£¥% \'"';

export const TEMP_FILE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export const MAX_ACTIVE_JOBS_HEALTHY = 10;

export const INVOICE_PATTERNS = {
  INVOICE_KEYWORD: /invoice/i,
  TOTAL_AMOUNT: /total.*\d+[\.,]\d{2}/i,
  DATE_PATTERN: /date.*\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/i,
  INVOICE_NUMBER: /inv(?:oice)?[\s#:-]*\d+/i,
} as const;

export const METRIC_NAMES = {
  SERVICE_INITIALIZED: 'ocr.service.initialized',
  ACTIVE_PROCESSES: 'ocr.active.processes',
  EXTRACTIONS_COMPLETED: 'ocr.extractions.completed',
  EXTRACTIONS_FAILED: 'ocr.extractions.failed',
  PROCESSING_TIME: 'ocr.processing.time',
  CONFIDENCE_SCORE: 'ocr.confidence.score',
} as const;
