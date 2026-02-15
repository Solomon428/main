import { FileAttachment, User, Organization } from '@prisma/client';
import { EntityType } from '@/domain/enums';

/**
 * Extended file attachment with relations
 */
export interface FileAttachmentWithRelations extends FileAttachment {
  uploadedBy?: Pick<User, 'id' | 'name' | 'email'>;
  organization?: Pick<Organization, 'id' | 'name'>;
}

/**
 * Uploaded file interface from multer
 */
export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination?: string;
  filename?: string;
  path?: string;
  buffer: Buffer;
}

/**
 * File upload options
 */
export interface FileUploadOptions {
  entityType?: EntityType;
  entityId?: string;
  autoProcess?: boolean;
  language?: string;
  extractionMode?: 'standard' | 'aggressive';
}

/**
 * File upload result
 */
export interface FileUploadResult {
  success: boolean;
  fileId: string;
  fileName: string;
  processingStatus: string;
  message?: string;
}

/**
 * Bulk upload result
 */
export interface BulkUploadResult {
  total: number;
  successful: number;
  failed: number;
  files: Array<{
    success: boolean;
    fileId?: string;
    fileName: string;
    processingStatus?: string;
    error?: string;
  }>;
}

/**
 * OCR progress update
 */
export interface OcrProgressUpdate {
  type: 'status' | 'progress' | 'complete' | 'error';
  fileId: string;
  processingStatus?: string;
  progress?: number;
  stage?: string;
  message?: string;
}

/**
 * Extraction result from document parsing
 */
export interface ExtractionResult {
  success: boolean;
  data?: {
    invoiceNumber?: string;
    issueDate?: string;
    dueDate?: string;
    totalAmount?: number;
    subtotalAmount?: number;
    taxAmount?: number;
    currency?: string;
    supplierName?: string;
    supplierVat?: string;
    supplierEmail?: string;
    lineItems?: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      taxRate?: number;
    }>;
    confidence: number;
  };
  validation?: {
    fields: Array<{
      field: string;
      valid: boolean;
      confidence: number;
      message?: string;
    }>;
    overallConfidence: number;
  };
  error?: string;
}

/**
 * File filter parameters
 */
export interface FileFilterParams {
  entityType?: EntityType;
  entityId?: string;
  processingStatus?: string;
  search?: string;
  page?: number;
  limit?: number;
}
