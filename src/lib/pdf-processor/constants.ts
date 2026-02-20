/**
 * PDF Processor Constants
 * Static configuration values for the PDF processing module
 */

import path from "path";

// File constraints
export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export const SUPPORTED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/tiff",
  "image/bmp",
  "image/gif",
];

// Confidence thresholds
export const MIN_CONFIDENCE_THRESHOLD = 0.3;
export const HIGH_CONFIDENCE_THRESHOLD = 0.85;

// Table detection
export const TABLE_DETECTION_MIN_ROWS = 2;
export const TABLE_DETECTION_MIN_COLS = 2;

// OCR Engine identifiers
export const OCR_ENGINES = {
  TESSERACT: "tesseract",
  AZURE: "azure",
  GOOGLE: "google",
  AMAZON: "amazon",
  OLLAMA: "ollama",
} as const;

// Quality thresholds
export const QUALITY_THRESHOLDS = {
  MIN_CLARITY: 0.6,
  MIN_RESOLUTION: 150,
  MAX_SKEW_ANGLE: 5.0,
  MAX_NOISE_LEVEL: 0.3,
  MIN_CONTRAST: 0.4,
  MIN_BRIGHTNESS: 0.3,
} as const;

// Processing configuration
export const PROCESSING_TIMEOUT_MS = 300000; // 5 minutes
export const RETRY_MAX_ATTEMPTS = 3;
export const RETRY_DELAY_MS = 2000;

// Directory paths
export const TEMP_DIR = path.join(process.cwd(), "temp", "pdf-processing");
export const UPLOADS_DIR = path.join(process.cwd(), "uploads", "invoices");
