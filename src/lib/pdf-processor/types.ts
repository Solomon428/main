/**
 * PDF Processor Types
 * Local type definitions for the PDF processing module
 */

export type ExtractionMethod = 
  | 'native' 
  | 'native-pdf'
  | 'ocr' 
  | 'ocr-tesseract'
  | 'ocr-azure'
  | 'ocr-google'
  | 'ocr-amazon'
  | 'ocr-ollama'
  | 'hybrid' 
  | 'auto';

export const ExtractionMethod = {
  NATIVE_PDF: 'native-pdf' as ExtractionMethod,
  OCR_TESSERACT: 'ocr-tesseract' as ExtractionMethod,
  OCR_AZURE: 'ocr-azure' as ExtractionMethod,
  OCR_GOOGLE: 'ocr-google' as ExtractionMethod,
  OCR_AMAZON: 'ocr-amazon' as ExtractionMethod,
  OCR_OLLAMA: 'ocr-ollama' as ExtractionMethod,
};

export enum DocumentType {
  TAX_INVOICE = 'TAX_INVOICE',
  STANDARD_INVOICE = 'STANDARD_INVOICE',
  PROFORMA_INVOICE = 'PROFORMA_INVOICE',
  CREDIT_NOTE = 'CREDIT_NOTE',
  DEBIT_NOTE = 'DEBIT_NOTE',
  QUOTE = 'QUOTE',
  RECEIPT = 'RECEIPT',
  STATEMENT = 'STATEMENT',
  UNKNOWN = 'UNKNOWN',
}

export interface TextExtractionMetrics {
  totalCharacters: number;
  totalWords: number;
  totalLines: number;
  totalParagraphs: number;
  averageWordLength: number;
  averageLineLength: number;
  extractionConfidence: number;
  languageConfidence: number;
  encodingConfidence: number;
}

export interface TableExtractionMetrics {
  totalTables: number;
  totalRows: number;
  totalColumns: number;
  totalCells: number;
  extractionConfidence: number;
  structureConfidence: number;
  dataConfidence: number;
}

export interface FormExtractionMetrics {
  totalForms: number;
  totalFields: number;
  totalValues: number;
  extractionConfidence: number;
  fieldDetectionConfidence: number;
  valueExtractionConfidence: number;
}

export interface ImageExtractionMetrics {
  totalImages: number;
  totalGraphics: number;
  totalSignatures: number;
  extractionConfidence: number;
  qualityScore: number;
}

export interface StructuredInvoiceData {
  invoiceNumber?: string;
  invoiceDate?: Date;
  dueDate?: Date;
  supplierName?: string;
  supplierVAT?: string;
  subtotalExclVAT?: number;
  vatAmount?: number;
  totalAmount?: number;
  currency?: string;
  lineItems?: Array<{
    lineNumber?: number;
    description?: string;
    quantity?: number;
    unitPrice?: number;
    amount?: number;
    vatRate?: number;
    vatAmount?: number;
    metadata?: Record<string, any>;
  }>;
  metadata?: Record<string, any>;
}

export interface SemiStructuredData {
  rawKeyValuePairs: Record<string, any>;
  detectedSections: DetectedSection[];
  detectedTables: DetectedTable[];
  detectedForms: DetectedForm[];
  metadata?: Record<string, any>;
}

export interface ExtractedTable {
  tableId: string;
  headers: {
    cells: string[];
  };
  rows: Array<{
    cells: string[];
  }>;
}

export interface TableConfidence {
  tableId: string;
  structureConfidence: number;
  dataConfidence: number;
  overallConfidence: number;
  metadata: Record<string, any>;
}

export interface ExtractedField {
  fieldId: string;
  fieldName: string;
  fieldValue: string;
  confidence: number;
  boundingBox?: BoundingBox;
  pageNumber: number;
  metadata: Record<string, any>;
}

export interface FieldConfidence {
  fieldId: string;
  detectionConfidence: number;
  extractionConfidence: number;
  overallConfidence: number;
  metadata: Record<string, any>;
}

export interface ValidationError {
  field: string;
  errorCode: string;
  errorMessage: string;
  severity: 'CRITICAL' | 'ERROR' | 'WARNING';
  timestamp: Date;
}

export interface ValidationWarning {
  field: string;
  warningCode: string;
  warningMessage: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  timestamp: Date;
}

export interface DocumentValidationResult {
  isValid: boolean;
  validationType: string;
  validationEngine: string;
  validationTimestamp: Date;
  score: number;
  confidence: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata: Record<string, any>;
}

export interface CrossValidationResult {
  sourceField: string;
  targetField: string;
  validationType: string;
  isValid: boolean;
  confidence: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata: Record<string, any>;
}

export interface ProcessingFlag {
  flagType: string;
  flagMessage: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  timestamp: Date;
}

export interface ProcessingWarning {
  warningCode: string;
  warningMessage: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ProcessingError {
  errorCode: string;
  errorMessage: string;
  severity: 'CRITICAL' | 'ERROR' | 'WARNING';
  timestamp: Date;
  stackTrace?: string;
  metadata?: Record<string, any>;
}

export interface ProcessingSuggestion {
  suggestionCode: string;
  suggestionMessage: string;
  suggestionType: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  timestamp: Date;
}

export interface ProcessingInsights {
  flags: ProcessingFlag[];
  warnings: ProcessingWarning[];
  errors: ProcessingError[];
  suggestions: ProcessingSuggestion[];
}

export interface PDFProcessingOptions {
  batchId?: string;
  correlationId?: string;
  extractionMethod?: ExtractionMethod;
  preferredOCREngine?: string;
  enableFallback?: boolean;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  customData?: Record<string, any>;
}

export interface DocumentQualityMetrics {
  clarityScore: number;
  resolutionScore: number;
  skewAngle: number;
  rotationCorrectionApplied: boolean;
  noiseLevel: number;
  contrastLevel: number;
  brightnessLevel: number;
  pageCount: number;
  hasText: boolean;
  hasImages: boolean;
  hasTables: boolean;
  isSearchable: boolean;
}

export interface ExtractionResult {
  engine: string;
  engineVersion: string;
  rawText: string;
  normalizedText: string;
  cleanedText: string;
  textMetrics: TextExtractionMetrics;
  tableMetrics: TableExtractionMetrics;
  formMetrics: FormExtractionMetrics;
  imageMetrics: ImageExtractionMetrics;
  tables: ExtractedTable[];
  tableConfidences: TableConfidence[];
  fields: ExtractedField[];
  fieldConfidences: FieldConfidence[];
  language: string;
  metadata: Record<string, any>;
}

export interface StructuredDataResult {
  documentType: DocumentType;
  documentSubType?: string;
  documentCategory: string;
  documentCountry: string;
  documentCurrency: string;
  structuredData: StructuredInvoiceData;
  semiStructuredData: SemiStructuredData;
  metadata: Record<string, any>;
}

export interface ValidationResults {
  documentValidation: DocumentValidationResult;
  crossValidations: CrossValidationResult[];
  metadata: Record<string, any>;
}

export interface QualityScoringResults {
  qualityScore: number;
  extractionConfidence: number;
  validationConfidence: number;
  overallConfidence: number;
  completenessScore: number;
  metadata: Record<string, any>;
}

export class ProcessingException extends Error {
  constructor(
    public code: string,
    message: string,
    public processingId: string,
    public metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'ProcessingException';
  }
}

export interface ProcessingAuditTrail {
  auditId: string;
  timestamp: Date;
  eventType: string;
  eventDescription: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  metadata: Record<string, any>;
}

export interface SystemInfo {
  os: string;
  osVersion: string;
  architecture: string;
  processor: string;
  cores: number;
  memoryTotal: number;
  memoryUsed: number;
  diskTotal: number;
  diskUsed: number;
}

export interface EnvironmentInfo {
  environment: 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION';
  region: string;
  instanceId: string;
  deploymentId: string;
  version: string;
  buildNumber: string;
  buildDate: Date;
}

export interface SecurityInfo {
  encryptionAlgorithm: string;
  encryptionKeyLength: number;
  hashingAlgorithm: string;
  digitalSignature?: string;
  certificateInfo?: Record<string, any>;
}

export interface IntegrityCheck {
  checksum: string;
  hash: string;
  digitalSignature?: string;
  verified: boolean;
  verifiedAt: Date;
  verifier: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectedSection {
  sectionId?: string;
  sectionType: string;
  boundingBox?: BoundingBox;
  confidence: number;
  metadata?: Record<string, any>;
}

export interface DetectedTable {
  tableId: string;
  pageNumber: number;
  boundingBox: BoundingBox;
  confidence: number;
  metadata: Record<string, any>;
}

export interface DetectedForm {
  formId?: string;
  boundingBox?: BoundingBox;
  fields: ExtractedField[];
  confidence: number;
  metadata?: Record<string, any>;
}

export enum ProcessingStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface ProcessingMetadata {
  processingStartTime: Date;
  processingEndTime: Date;
  processingEngine: string;
  processingEngineVersion: string;
  inputFileSize: number;
  outputFileSize: number;
  checksum: string;
  mimeType: string;
  fileName: string;
  processingOptions: PDFProcessingOptions;
}

export interface AdvancedPDFProcessingResult {
  success: boolean;
  status: ProcessingStatus;
  processingId: string;
  batchId?: string;
  correlationId?: string;

  extractionMethod: ExtractionMethod;
  extractionEngine: string;
  extractionEngineVersion: string;
  extractionConfidence: number;
  extractionCompleteness: number;

  documentType: DocumentType;
  documentSubType?: string;
  documentCategory: string;
  documentLanguage: string;
  documentCountry: string;
  documentCurrency: string;

  qualityScore: number;
  clarityScore: number;
  resolutionScore: number;
  skewAngle: number;
  rotationCorrectionApplied: boolean;
  noiseLevel: number;
  contrastLevel: number;
  brightnessLevel: number;

  textExtractionMetrics: TextExtractionMetrics;
  tableExtractionMetrics: TableExtractionMetrics;
  formExtractionMetrics: FormExtractionMetrics;
  imageExtractionMetrics: ImageExtractionMetrics;

  structuredData: StructuredInvoiceData;
  semiStructuredData: SemiStructuredData;
  rawText: string;
  normalizedText: string;
  cleanedText: string;

  extractedTables: ExtractedTable[];
  tableConfidenceScores: TableConfidence[];

  extractedFields: ExtractedField[];
  fieldConfidenceScores: FieldConfidence[];

  validationResults: DocumentValidationResult;
  crossValidationResults: CrossValidationResult[];

  flags: ProcessingFlag[];
  warnings: ProcessingWarning[];
  errors: ProcessingError[];
  suggestions: ProcessingSuggestion[];

  metadata: ProcessingMetadata;
  auditTrail: ProcessingAuditTrail[];

  processingDurationMs: number;
  cpuTimeMs: number;
  memoryPeakBytes: number;
  diskUsageBytes: number;

  systemInfo: SystemInfo;
  environmentInfo: EnvironmentInfo;
  securityInfo: SecurityInfo;
  integrityCheck: IntegrityCheck;

  version: string;
  apiVersion: string;
  schemaVersion: string;

  customData: Record<string, any>;
}
