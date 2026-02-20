import { EntityType } from "../enums/EntityType";
import { StorageProvider } from "../enums/StorageProvider";

export interface FileAttachment {
  id: string;
  organizationId: string;
  entityType: EntityType;
  entityId: string;
  uploaderId: string;
  fileName: string;
  originalName: string;
  fileType: string;
  fileExtension: string;
  fileSize: number;
  checksum?: string | null;
  storageProvider: StorageProvider;
  storagePath: string;
  bucket?: string | null;
  region?: string | null;
  url: string;
  thumbnailUrl?: string | null;
  previewUrl?: string | null;
  ocrText?: string | null;
  ocrConfidence?: unknown | null; // Decimal
  ocrProcessedAt?: Date | null;
  processingStatus: string;
  processingError?: string | null;
  encryptionKey?: string | null;
  isEncrypted: boolean;
  isPublic: boolean;
  accessCount: number;
  lastAccessedAt?: Date | null;
  retentionDays?: number | null;
  deleteAfter?: Date | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  deletedBy?: string | null;
}
