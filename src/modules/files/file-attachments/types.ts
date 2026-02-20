import { EntityType } from "../../../domain/enums/EntityType";
import { StorageProvider } from "../../../domain/enums/StorageProvider";

export interface UploadFileInput {
  fileName: string;
  originalName: string;
  fileType: string;
  fileExtension: string;
  fileSize: number;
  content: Buffer;
  entityType: EntityType;
  entityId: string;
  storageProvider?: StorageProvider;
  metadata?: Record<string, unknown>;
  retentionDays?: number;
}

export interface FileUploadResult {
  id: string;
  url: string;
  thumbnailUrl?: string;
  previewUrl?: string;
}

export interface InvoiceUploadInput {
  file: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
  organizationId: string;
  uploadedById: string;
  supplierId?: string;
  autoProcess?: boolean;
  extractionMethod?: "ocr" | "manual" | "hybrid";
}

export interface InvoiceUploadResult {
  fileAttachmentId: string;
  extractionId?: string;
  invoiceId?: string;
  status: "pending" | "processing" | "completed" | "failed";
  extractedData?: any;
  confidence?: number;
  message: string;
  warnings: string[];
  errors: string[];
}

export interface ProcessingProgress {
  stage:
    | "uploading"
    | "ocr"
    | "extracting"
    | "validating"
    | "creating"
    | "completed"
    | "failed";
  progress: number;
  message: string;
  details?: Record<string, any>;
}

export interface StorageStatistics {
  totalFiles: number;
  totalSize: number;
  byType: Record<string, { count: number; size: number }>;
  byOrganization: Record<string, { count: number; size: number }>;
}
