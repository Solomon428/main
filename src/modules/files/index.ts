// File Module Exports

// Routes
export { default as fileRoutes } from './files.routes';

// Services
export { documentParserService, DocumentParserService } from './services/document-parser.service';
export { fileAttachmentsService, FileAttachmentsService } from './services/file-attachments.service';

// OCR Services
export { ocrService, OcrService } from './ocr/ocr.service';
export { extractionService, ExtractionService } from './ocr/extraction.service';

// Types
export type {
  FileAttachmentWithRelations,
  UploadedFile,
  FileUploadOptions,
  FileUploadResult,
  BulkUploadResult,
  OcrProgressUpdate,
  ExtractionResult,
  FileFilterParams,
} from './types/file-types';
