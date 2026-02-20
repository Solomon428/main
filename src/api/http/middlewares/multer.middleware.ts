// ============================================================================
// Multer File Upload Middleware
// ============================================================================
// Handles multipart/form-data for file uploads with validation,
// virus scanning hooks, and progress tracking support.
// ============================================================================

import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { systemLogger } from "../../../observability/logger";
import { StorageProvider } from "../../../domain/enums/StorageProvider";

// ============================================================================
// Configuration Types
// ============================================================================

export interface MulterConfig {
  maxFileSize: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  storageProvider: StorageProvider;
  uploadDir: string;
  preserveFilename: boolean;
  scanForViruses: boolean;
  encryptFiles: boolean;
}

export interface UploadMetadata {
  fieldName: string;
  originalName: string;
  encoding: string;
  mimeType: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer?: Buffer;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: MulterConfig = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedMimeTypes: [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/tiff",
    "image/bmp",
    "image/webp",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
  ],
  allowedExtensions: [
    ".pdf",
    ".jpg",
    ".jpeg",
    ".png",
    ".tiff",
    ".tif",
    ".bmp",
    ".webp",
    ".doc",
    ".docx",
  ],
  storageProvider: StorageProvider.LOCAL,
  uploadDir: process.env.UPLOAD_DIR || "./uploads/temp",
  preserveFilename: false,
  scanForViruses: false,
  encryptFiles: false,
};

// Invoice-specific configuration
const INVOICE_CONFIG: MulterConfig = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedMimeTypes: [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/tiff",
    "image/bmp",
    "image/webp",
  ],
  allowedExtensions: [
    ".pdf",
    ".jpg",
    ".jpeg",
    ".png",
    ".tiff",
    ".tif",
    ".bmp",
    ".webp",
  ],
  storageProvider: StorageProvider.LOCAL,
  uploadDir: process.env.UPLOAD_DIR || "./uploads/invoices",
  preserveFilename: false,
  scanForViruses: true,
  encryptFiles: false,
};

// ============================================================================
// Storage Configuration
// ============================================================================

function createDiskStorage(config: MulterConfig) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, config.uploadDir);
    },
    filename: (req, file, cb) => {
      if (config.preserveFilename) {
        // Sanitize filename but preserve original name
        const sanitized = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
        cb(null, `${uuidv4()}-${sanitized}`);
      } else {
        // Generate unique filename
        const extension = path.extname(file.originalname).toLowerCase();
        cb(null, `${uuidv4()}${extension}`);
      }
    },
  });
}

function createMemoryStorage() {
  return multer.memoryStorage();
}

// ============================================================================
// File Filter
// ============================================================================

function createFileFilter(config: MulterConfig) {
  return (
    req: any,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback,
  ) => {
    const errors: string[] = [];

    // Check MIME type
    if (!config.allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
      errors.push(`MIME type ${file.mimetype} is not allowed`);
    }

    // Check file extension
    const extension = path.extname(file.originalname).toLowerCase();
    if (!config.allowedExtensions.includes(extension)) {
      errors.push(`File extension ${extension} is not allowed`);
    }

    // Check filename length
    if (file.originalname.length > 255) {
      errors.push("Filename exceeds maximum length of 255 characters");
    }

    // Check for potentially dangerous extensions
    const dangerousExtensions = [
      ".exe",
      ".bat",
      ".cmd",
      ".sh",
      ".js",
      ".php",
      ".jsp",
      ".asp",
    ];
    if (dangerousExtensions.includes(extension)) {
      errors.push("Potentially dangerous file type not allowed");
    }

    if (errors.length > 0) {
      systemLogger.warn("File upload rejected", {
        filename: file.originalname,
        mimetype: file.mimetype,
        errors,
      });
      cb(new Error(errors.join("; ")));
      return;
    }

    systemLogger.debug("File upload accepted", {
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });

    cb(null, true);
  };
}

// ============================================================================
// Multer Instance Creators
// ============================================================================

export function createMulterMiddleware(config: Partial<MulterConfig> = {}) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  // Ensure upload directory exists
  const fs = require("fs");
  if (!fs.existsSync(mergedConfig.uploadDir)) {
    fs.mkdirSync(mergedConfig.uploadDir, { recursive: true });
  }

  const storage =
    mergedConfig.storageProvider === StorageProvider.LOCAL
      ? createDiskStorage(mergedConfig)
      : createMemoryStorage();

  return multer({
    storage,
    fileFilter: createFileFilter(mergedConfig),
    limits: {
      fileSize: mergedConfig.maxFileSize,
      files: 10, // Maximum 10 files per upload
      fields: 20, // Maximum 20 non-file fields
    },
  });
}

export function createInvoiceUploadMiddleware(
  config: Partial<MulterConfig> = {},
) {
  return createMulterMiddleware({ ...INVOICE_CONFIG, ...config });
}

// ============================================================================
// Pre-configured Middleware Instances
// ============================================================================

// Single file upload middleware
export const singleFileUpload = (
  fieldName: string,
  config?: Partial<MulterConfig>,
) => {
  const multerInstance = createMulterMiddleware(config);
  return multerInstance.single(fieldName);
};

// Multiple files upload middleware
export const multipleFilesUpload = (
  fieldName: string,
  maxCount: number = 10,
  config?: Partial<MulterConfig>,
) => {
  const multerInstance = createMulterMiddleware(config);
  return multerInstance.array(fieldName, maxCount);
};

// Mixed fields upload middleware
export const mixedFilesUpload = (
  fields: Array<{ name: string; maxCount?: number }>,
  config?: Partial<MulterConfig>,
) => {
  const multerInstance = createMulterMiddleware(config);
  return multerInstance.fields(fields);
};

// Invoice upload middleware
export const invoiceUpload = createInvoiceUploadMiddleware().single("invoice");

// Multiple invoices upload middleware
export const multipleInvoicesUpload = createInvoiceUploadMiddleware().array(
  "invoices",
  20,
);

// ============================================================================
// Error Handler
// ============================================================================

export function handleMulterError(error: any, req: any, res: any, next: any) {
  if (error instanceof multer.MulterError) {
    let message = "File upload error";
    let statusCode = 400;

    switch (error.code) {
      case "LIMIT_FILE_SIZE":
        message = `File size exceeds the maximum limit of ${DEFAULT_CONFIG.maxFileSize / 1024 / 1024}MB`;
        break;
      case "LIMIT_FILE_COUNT":
        message = "Too many files uploaded";
        break;
      case "LIMIT_FIELD_KEY":
        message = "Field name too long";
        break;
      case "LIMIT_FIELD_VALUE":
        message = "Field value too long";
        break;
      case "LIMIT_FIELD_COUNT":
        message = "Too many fields";
        break;
      case "LIMIT_UNEXPECTED_FILE":
        message = `Unexpected field: ${error.field}`;
        break;
      default:
        message = error.message;
    }

    systemLogger.warn("Multer error", {
      code: error.code,
      message: error.message,
      field: error.field,
    });

    return res.status(statusCode).json({
      success: false,
      error: {
        code: error.code,
        message,
      },
    });
  }

  if (error) {
    systemLogger.warn("Upload validation error", {
      message: error.message,
    });

    return res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: error.message,
      },
    });
  }

  next();
}

// ============================================================================
// File Validation Helper
// ============================================================================

export async function validateUploadedFile(
  file: Express.Multer.File,
  options?: {
    maxSize?: number;
    allowedTypes?: string[];
    scanVirus?: boolean;
  },
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Check file exists
  if (!file) {
    errors.push("No file provided");
    return { valid: false, errors };
  }

  // Check file size
  if (options?.maxSize && file.size > options.maxSize) {
    errors.push(`File size ${file.size} exceeds maximum ${options.maxSize}`);
  }

  // Check MIME type
  if (options?.allowedTypes && !options.allowedTypes.includes(file.mimetype)) {
    errors.push(`File type ${file.mimetype} is not allowed`);
  }

  // Check file is not empty
  if (file.size === 0) {
    errors.push("File is empty");
  }

  // Virus scan placeholder (implement with ClamAV or similar in production)
  if (options?.scanVirus) {
    // TODO: Implement virus scanning
    systemLogger.debug("Virus scan skipped (not implemented)", {
      filename: file.originalname,
    });
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// File Processing Helpers
// ============================================================================

export function getFileMetadata(file: Express.Multer.File): UploadMetadata {
  return {
    fieldName: file.fieldname,
    originalName: file.originalname,
    encoding: file.encoding,
    mimeType: file.mimetype,
    size: file.size,
    destination: (file as any).destination || "",
    filename: file.filename,
    path: file.path,
    buffer: file.buffer,
  };
}

export function sanitizeFilename(filename: string): string {
  // Remove path components
  const basename = path.basename(filename);

  // Replace dangerous characters
  const sanitized = basename
    .replace(/[<>:"/\\|?*]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_{2,}/g, "_")
    .substring(0, 255);

  return sanitized;
}

// ============================================================================
// Progress Tracking (for future implementation with streams)
// ============================================================================

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export function createProgressTracker(
  totalSize: number,
  onProgress: (progress: UploadProgress) => void,
) {
  let loaded = 0;

  return {
    update: (chunkSize: number) => {
      loaded += chunkSize;
      const percentage = Math.min(100, Math.round((loaded / totalSize) * 100));
      onProgress({ loaded, total: totalSize, percentage });
    },
    complete: () => {
      onProgress({ loaded: totalSize, total: totalSize, percentage: 100 });
    },
  };
}

export default createMulterMiddleware;
