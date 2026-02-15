import type { PSM, OEM } from 'tesseract.js';

export interface OcrConfig {
  provider: 'tesseract' | 'google-vision' | 'aws-textract' | 'azure' | 'ollama';
  language: string;
  pageSegmentationMode: PSM;
  ocrEngineMode: OEM;
  confidenceThreshold: number;
  maxFileSize: number;
  allowedMimeTypes: string[];
  timeout: number;
  retryAttempts: number;
}

export interface OcrResult {
  success: boolean;
  text: string;
  confidence: number;
  pages: number;
  language: string;
  processingTime: number;
  provider: string;
  metadata: Record<string, any>;
  errors?: string[];
  warnings?: string[];
}

export interface OcrProgress {
  stage: 'initializing' | 'preprocessing' | 'extracting' | 'postprocessing' | 'completed' | 'failed';
  progress: number;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
}

export interface DocumentImage {
  pageNumber: number;
  imageBuffer: Buffer;
  width: number;
  height: number;
  dpi: number;
  format: string;
  preprocessing?: {
    deskewed: boolean;
    denoised: boolean;
    binarized: boolean;
    enhanced: boolean;
  };
}

export interface OcrValidationResult {
  isValid: boolean;
  score: number;
  matches: Array<{ pattern: string; found: boolean; match?: string }>;
  statistics: {
    characterCount: number;
    wordCount: number;
    lineCount: number;
    averageWordLength: number;
    nonAlphaNumericRatio: number;
  };
  suggestions: string[];
}

export interface OcrServiceStatus {
  initialized: boolean;
  provider: string;
  language: string;
  activeJobs: number;
  health: 'healthy' | 'degraded' | 'unhealthy';
  metrics: {
    totalExtractions: number;
    successfulExtractions: number;
    failedExtractions: number;
    averageProcessingTime: number;
    averageConfidence: number;
  };
  limits: {
    maxFileSize: number;
    timeout: number;
    allowedMimeTypes: string[];
  };
}

export interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
  supported: boolean;
}

export interface ExtractionLogData {
  jobId: string;
  fileName: string;
  mimeType: string;
  success: boolean;
  pages: number;
  processedPages: number;
  confidence: number;
  processingTime: number;
  provider: string;
  textLength: number;
  language: string;
  errors?: string[];
  warnings?: string[];
  validationScore?: number;
}

export interface ActiveProcess {
  jobId: string;
  startTime: Date;
  progressCallback?: (progress: OcrProgress) => void;
  timeout?: NodeJS.Timeout;
}
