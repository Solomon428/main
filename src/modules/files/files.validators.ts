import { z } from "zod";
import { StorageProvider } from "../../domain/enums/StorageProvider";
import { DocumentType } from "../../domain/enums/DocumentType";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];
const ACCEPTED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
];

export const uploadFileSchema = z.object({
  entityType: z.string().min(1, "Entity type is required"),
  entityId: z.string().uuid("Valid entity ID is required"),
  documentType: z.nativeEnum(DocumentType).default(DocumentType.OTHER),
  description: z.string().optional(),
  isPublic: z.boolean().default(false),
  retentionDays: z.number().int().min(1).optional(),
  autoProcess: z.boolean().default(true),
  extractionMode: z.enum(["standard", "aggressive"]).default("standard"),
  language: z.string().default("en"),
});

export const updateFileSchema = z.object({
  fileName: z.string().optional(),
  description: z.string().optional(),
  documentType: z.nativeEnum(DocumentType).optional(),
  isPublic: z.boolean().optional(),
  retentionDays: z.number().int().min(1).optional().nullable(),
});

export const bulkUploadSchema = z.object({
  files: z.array(z.instanceof(Buffer)).min(1, "At least one file is required"),
  entityType: z.string().min(1, "Entity type is required"),
  entityId: z.string().uuid("Valid entity ID is required"),
  documentType: z.nativeEnum(DocumentType).default(DocumentType.OTHER),
  autoProcess: z.boolean().default(true),
});

export const ocrProcessingSchema = z.object({
  fileId: z.string().uuid("Valid file ID is required"),
  language: z.string().default("en"),
  extractionMode: z.enum(["standard", "aggressive"]).default("standard"),
  enhanceImages: z.boolean().default(true),
  detectTables: z.boolean().default(true),
});

export const fileFilterSchema = z.object({
  entityType: z.string().optional(),
  entityId: z.string().uuid().optional(),
  documentType: z.nativeEnum(DocumentType).optional(),
  processingStatus: z.string().optional(),
  uploadedBy: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const storageConfigSchema = z.object({
  provider: z.nativeEnum(StorageProvider),
  bucket: z.string().optional(),
  region: z.string().optional(),
  endpoint: z.string().optional(),
  basePath: z.string().optional(),
  publicUrlBase: z.string().optional(),
});

export const fileAttachmentSchema = z.object({
  fileName: z.string().min(1, "File name is required"),
  originalName: z.string().min(1, "Original name is required"),
  fileType: z.string().min(1, "File type is required"),
  fileExtension: z.string().min(1, "File extension is required"),
  fileSize: z.number().int().max(MAX_FILE_SIZE, "File size exceeds 50MB limit"),
  checksum: z.string().optional(),
});

export const deleteFilesSchema = z.object({
  fileIds: z
    .array(z.string().uuid())
    .min(1, "At least one file ID is required"),
  permanent: z.boolean().default(false),
});

export const moveFilesSchema = z.object({
  fileIds: z
    .array(z.string().uuid())
    .min(1, "At least one file ID is required"),
  targetEntityType: z.string().min(1, "Target entity type is required"),
  targetEntityId: z.string().uuid("Valid target entity ID is required"),
});

export const extractDataSchema = z.object({
  fileId: z.string().uuid("Valid file ID is required"),
  extractionFields: z.array(z.string()).optional(),
  validateData: z.boolean().default(true),
});

export const mergePdfSchema = z.object({
  fileIds: z
    .array(z.string().uuid())
    .min(2, "At least two files are required for merging"),
  outputName: z.string().min(1, "Output name is required"),
});

export type UploadFileInput = z.infer<typeof uploadFileSchema>;
export type UpdateFileInput = z.infer<typeof updateFileSchema>;
export type BulkUploadInput = z.infer<typeof bulkUploadSchema>;
export type OcrProcessingInput = z.infer<typeof ocrProcessingSchema>;
export type FileFilterInput = z.infer<typeof fileFilterSchema>;
export type StorageConfigInput = z.infer<typeof storageConfigSchema>;
export type FileAttachmentInput = z.infer<typeof fileAttachmentSchema>;
export type DeleteFilesInput = z.infer<typeof deleteFilesSchema>;
export type MoveFilesInput = z.infer<typeof moveFilesSchema>;
export type ExtractDataInput = z.infer<typeof extractDataSchema>;
export type MergePdfInput = z.infer<typeof mergePdfSchema>;
